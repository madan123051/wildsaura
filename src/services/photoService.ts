import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface FirestorePhoto {
  id?: string;
  title: string;
  caption: string;
  category: string;
  imageUrl: string;
  location: string;
  tags: string[];
  animalName?: string;
  cameraModel?: string;
  lens?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focalLength?: string;
  likeCount: number;
  type: string;
  photographer?: string;
  latitude?: number;
  longitude?: number;
  published?: boolean;
  createdAt?: any;
}

const PHOTOS_COLLECTION = 'photos';

/** Convert a data URL to a Blob (for resumable upload) */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Upload a photo to Firebase Storage.
 * Accepts File/Blob (preferred) or data URL string.
 * ALWAYS uses resumable upload for progress tracking and reliability.
 * Includes a 90-second timeout to prevent infinite hanging.
 *
 * @param input    File/Blob from compressForUpload, or data URL string
 * @param filename Destination filename in storage
 * @param onProgress Optional callback: receives 0–100 integer during upload
 */
export async function uploadPhotoToStorage(
  input: File | Blob | string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, `photos/${Date.now()}_${filename}`);

  // Always convert to Blob for resumable upload (never use uploadString — it hangs on large files)
  let blob: Blob;
  if (typeof input === 'string') {
    console.log('📤 Converting data URL to Blob for resumable upload...');
    blob = dataUrlToBlob(input);
  } else {
    blob = input;
  }

  const contentType = blob.type || 'image/webp';
  console.log(`📤 Starting resumable upload: ${(blob.size / 1024 / 1024).toFixed(2)}MB (${contentType})`);

  return new Promise<string>((resolve, reject) => {
    // 90-second timeout — prevents infinite hanging
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Upload timed out after 90 seconds. Please check your internet connection and try again.'));
    }, 90000);

    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        // Upload is 40–100% of the total progress (0–40% was compression)
        if (onProgress) onProgress(40 + Math.round(pct * 0.6));
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('📤 Firebase Storage upload error:', error);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          console.log('📤 Upload complete!');
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export async function addPhotoToFirestore(photo: Omit<FirestorePhoto, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, PHOTOS_COLLECTION), {
    ...photo,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPhotosFromFirestore(): Promise<FirestorePhoto[]> {
  try {
    const q = query(collection(db, PHOTOS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePhoto));
  } catch (err) {
    // If orderBy fails (no index), try without ordering
    try {
      const snapshot = await getDocs(collection(db, PHOTOS_COLLECTION));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePhoto));
    } catch {
      console.warn('Firestore fetch failed:', err);
      return [];
    }
  }
}

export async function deletePhotoFromFirestore(docId: string): Promise<void> {
  await deleteDoc(doc(db, PHOTOS_COLLECTION, docId));
}

export async function updatePhotoInFirestore(docId: string, data: Partial<FirestorePhoto>): Promise<void> {
  await updateDoc(doc(db, PHOTOS_COLLECTION, docId), data);
}

/**
 * Real-time subscription to all photos.
 * Fires onUpdate whenever any photo document changes (add/edit/delete).
 * Returns an unsubscribe function.
 */
export function subscribeToPhotos(
  onUpdate: (photos: FirestorePhoto[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, PHOTOS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePhoto));
      onUpdate(photos);
    },
    (error) => {
      console.error('Photo subscription error:', error);
      if (onError) onError(error);
    }
  );
}
