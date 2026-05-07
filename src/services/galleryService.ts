import { db, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

export type GalleryCategory = 'wildlife' | 'birds' | 'landscapes' | 'portraits' | 'others';

export interface GalleryPhoto {
  id?: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  storagePath?: string;
  originalSize?: number;
  compressedSize?: number;
  createdAt?: any;
}

const GALLERY_COLLECTION = 'galleryPhotos';

const sanitizeFilename = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function uploadGalleryPhotoToStorage(
  file: File,
  category: GalleryCategory,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; storagePath: string }> {
  // Store under the existing photos/ prefix so projects with photos/** storage rules keep working.
  const storagePath = `photos/gallery/${category}/${Date.now()}_${sanitizeFilename(file.name.replace(/\.[^.]+$/, '.webp'))}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type || 'image/webp' });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      reject,
      async () => {
        try {
          const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ imageUrl, storagePath });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

export async function addGalleryPhotoToFirestore(photo: Omit<GalleryPhoto, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, GALLERY_COLLECTION), {
    ...photo,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getGalleryPhotosFromFirestore(): Promise<GalleryPhoto[]> {
  const q = query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GalleryPhoto));
}

export async function deleteGalleryPhoto(photo: GalleryPhoto): Promise<void> {
  if (photo.id) await deleteDoc(doc(db, GALLERY_COLLECTION, photo.id));
  if (photo.storagePath) {
    try {
      await deleteObject(ref(storage, photo.storagePath));
    } catch (error) {
      console.warn('Gallery storage delete failed:', error);
    }
  }
}

export function subscribeToGalleryPhotos(
  onUpdate: (photos: GalleryPhoto[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => onUpdate(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GalleryPhoto))),
    (error) => {
      console.error('Gallery subscription error:', error);
      if (onError) onError(error);
    }
  );
}
