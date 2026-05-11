import { db, storage } from '../firebase';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, orderBy, serverTimestamp, onSnapshot, Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressForUpload } from '../utils/imageCompressor';

export type GalleryCategory = 'Wildlife' | 'Birds' | 'Landscapes' | 'Portraits' | 'Others'
  | 'wildlife' | 'birds' | 'landscapes' | 'portraits' | 'others';

export interface GalleryPhoto {
  id?: string;
  url?: string;
  imageUrl: string;
  title: string;
  description?: string;
  category: GalleryCategory;
  uploadedAt?: any;
  createdAt?: any;
  likes?: number;
  projectId?: string;
  storagePath?: string;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
}

const GALLERY_COLLECTION = 'gallery';
const PROJECT_ID = 'wildsaura';

// ── Upload a Blob to Storage with category/year/month folder structure ──────
export async function uploadGalleryBlobToStorage(
  blob: Blob,
  filename: string,
  category: GalleryCategory,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; storagePath: string }> {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const storagePath = `gallery/${category}/${year}/${month}/${Date.now()}_${filename}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ imageUrl, storagePath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

// ── Legacy: upload a File using base64 ──────────────────────────────────────
export async function uploadPhotoToStorage(file: File): Promise<string> {
  try {
    const { ref: sRef, uploadString: uploadStr, getDownloadURL: getDL } = await import('firebase/storage');
    const compressed = await compressForUpload(file);
    const storageRef = sRef(storage, `gallery/${Date.now()}_${file.name}`);
    await uploadStr(storageRef, (compressed as unknown as string).split(',')[1], 'base64');
    return await getDL(storageRef);
  } catch (error) {
    console.error('Photo upload error:', error);
    throw new Error('Failed to upload photo');
  }
}

// ── Add a gallery photo to Firestore ────────────────────────────────────────
export async function addGalleryPhotoToFirestore(
  photo: Omit<GalleryPhoto, 'id'>
): Promise<string> {
  const docRef = await addDoc(collection(db, GALLERY_COLLECTION), {
    ...photo,
    projectId: PROJECT_ID,
    uploadedAt: serverTimestamp(),
  });
  return docRef.id;
}

// Alias for backward compatibility
export const addPhotoToFirestore = addGalleryPhotoToFirestore;

// ── Delete a gallery photo (Firestore + Storage) ─────────────────────────────
export async function deleteGalleryPhoto(photo: GalleryPhoto): Promise<void> {
  // Delete from Firestore
  if (photo.id) {
    await deleteDoc(doc(db, GALLERY_COLLECTION, photo.id));
  }
  // Delete from Storage (non-critical)
  if (photo.storagePath) {
    try {
      const storageRef = ref(storage, photo.storagePath);
      await deleteObject(storageRef);
    } catch (err) {
      console.warn('Storage delete failed (non-critical):', err);
    }
  }
}

// Alias for backward compatibility
export async function deletePhotoFromFirestore(docId: string): Promise<void> {
  await deleteDoc(doc(db, GALLERY_COLLECTION, docId));
}

// ── Update a photo's title ───────────────────────────────────────────────────
export async function updateGalleryPhotoTitle(docId: string, title: string): Promise<void> {
  await updateDoc(doc(db, GALLERY_COLLECTION, docId), { title });
}

// ── Update arbitrary fields on a photo ──────────────────────────────────────
export async function updatePhotoInFirestore(
  docId: string,
  data: Partial<GalleryPhoto>
): Promise<void> {
  await updateDoc(doc(db, GALLERY_COLLECTION, docId), data as any);
}

// ── Get all photos (one-time fetch) ──────────────────────────────────────────
export async function getPhotosFromFirestore(): Promise<GalleryPhoto[]> {
  try {
    const q = query(collection(db, GALLERY_COLLECTION), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as GalleryPhoto))
      .filter(photo => !photo.projectId || photo.projectId === PROJECT_ID);
  } catch (err) {
    console.warn('Firestore photos fetch failed:', err);
    return [];
  }
}

// ── Real-time subscription to gallery photos ─────────────────────────────────
export function subscribeToGalleryPhotos(
  onUpdate: (photos: GalleryPhoto[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collection(db, GALLERY_COLLECTION), orderBy('uploadedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const photos = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as GalleryPhoto))
          .filter(photo => !photo.projectId || photo.projectId === PROJECT_ID);
        onUpdate(photos);
      },
      (error) => {
        console.error('Gallery subscription error:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('Gallery subscription setup failed:', error);
    return () => {};
  }
}

export async function likePhotoInFirestore(docId: string, currentLikes: number): Promise<void> {
  await updatePhotoInFirestore(docId, { likes: currentLikes + 1 });
}
