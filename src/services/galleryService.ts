import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

export type GalleryCategory = 'wildlife' | 'birds' | 'landscapes' | 'portraits' | 'others';

export interface GalleryPhoto {
  id?: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  storagePath?: string;
  createdAt?: any;
}

const GALLERY_COLLECTION = 'galleryPhotos';

const sanitizeFilename = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function uploadGalleryPhotoToStorage(
  file: Blob,
  category: GalleryCategory,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; storagePath: string }> {
  const storage = getStorage();
  const safeName = sanitizeFilename(filename || 'photo.webp');
  const storagePath = `gallery/${category}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  const contentType = file.type || 'image/webp';

  console.log('[GalleryUpload] Upload start', { category, filename: safeName, size: file.size, contentType, storagePath });
  if (onProgress) onProgress(20);
  await uploadBytes(storageRef, file, { contentType });
  if (onProgress) onProgress(85);
  const imageUrl = await getDownloadURL(storageRef);
  if (onProgress) onProgress(100);
  console.log('[GalleryUpload] Upload complete', { storagePath });
  return { imageUrl, storagePath };
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
      await deleteObject(ref(getStorage(), photo.storagePath));
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
