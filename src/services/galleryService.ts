import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export type GalleryCategory = 'wildlife' | 'birds' | 'landscapes' | 'portraits' | 'all';

export interface GalleryPhoto {
  id: number;
  firestoreId?: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  storagePath?: string;
  fileName?: string;
  createdAt?: string;
}

export interface FirestoreGalleryPhoto {
  id?: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  storagePath?: string;
  fileName?: string;
  createdAt?: any;
}

const GALLERY_COLLECTION = 'galleryPhotos';

const sanitizeFileName = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');

export function uploadGalleryPhotoToStorage(
  file: File,
  category: GalleryCategory,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; storagePath: string }> {
  const storagePath = `gallery/${category}/${Date.now()}_${sanitizeFileName(file.name)}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type || 'image/jpeg' });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      async () => {
        const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ imageUrl, storagePath });
      }
    );
  });
}

export async function addGalleryPhotoToFirestore(photo: Omit<FirestoreGalleryPhoto, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, GALLERY_COLLECTION), {
    ...photo,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getGalleryPhotosFromFirestore(): Promise<FirestoreGalleryPhoto[]> {
  try {
    const q = query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreGalleryPhoto));
  } catch (err) {
    console.warn('Firestore gallery fetch failed:', err);
    return [];
  }
}

export async function deleteGalleryPhoto(photo: GalleryPhoto): Promise<void> {
  if (photo.firestoreId) {
    await deleteDoc(doc(db, GALLERY_COLLECTION, photo.firestoreId));
  }

  if (photo.storagePath) {
    try {
      await deleteObject(ref(storage, photo.storagePath));
    } catch (err) {
      console.warn('Gallery storage delete failed:', err);
    }
  }
}

export function subscribeToGallery(
  onUpdate: (photos: FirestoreGalleryPhoto[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreGalleryPhoto));
      onUpdate(photos);
    },
    (error) => {
      console.error('Gallery subscription error:', error);
      onError?.(error);
    }
  );
}
