import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

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

export async function uploadPhotoToStorage(dataUrl: string, filename: string): Promise<string> {
  const storageRef = ref(storage, `photos/${Date.now()}_${filename}`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
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
