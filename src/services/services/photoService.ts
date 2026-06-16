import { db, storage } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
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
  createdAt?: any;
}

const PHOTOS_COLLECTION = 'photos';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadPhotoToStorage(dataUrl: string, filename: string): Promise<string> {
  const storageRef = ref(storage, `photos/${Date.now()}_${filename}`);
  const blob = dataUrlToBlob(dataUrl);
  const contentType = blob.type || 'image/webp';

  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Photo upload timed out after 90 seconds.'));
    }, 90000);

    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });
    uploadTask.on(
      'state_changed',
      () => {},
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        } catch (err) {
          reject(err);
        }
      },
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
