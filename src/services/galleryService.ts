import { db } from '../firebaseCore';
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, Unsubscribe, limit as queryLimit } from 'firebase/firestore';

export type GalleryCategory = 'wildlife' | 'birds' | 'landscapes' | 'portraits' | 'others';

export interface GalleryPhoto {
  id?: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  storagePath?: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg';
  sizeBytes?: number;
  originalSize?: number;
  photographer?: string;
  createdAt?: any;
}

const GALLERY_COLLECTION = 'galleryPhotos';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_');

/** Upload a processed Blob (WebP/JPEG) to Firebase Storage with progress + 90s timeout. */
export async function uploadGalleryBlobToStorage(
  blob: Blob,
  filename: string,
  category: GalleryCategory,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; storagePath: string }> {
  const { storage, ref, uploadBytesResumable, getDownloadURL } = await import('../firebaseStorage');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const storagePath = `gallery/${category}/${year}/${month}/${sanitize(filename)}`;
  const storageRef = ref(storage, storagePath);
  const contentType = blob.type || 'image/webp';

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      try { uploadTask.cancel(); } catch {}
      reject(new Error('Upload timed out after 90 seconds. Check your connection and try again.'));
    }, 90000);

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType,
      cacheControl: 'public,max-age=31536000,immutable',
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      (error) => { clearTimeout(timeoutId); reject(error); },
      async () => {
        clearTimeout(timeoutId);
        try {
          const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ imageUrl, storagePath });
        } catch (e) { reject(e); }
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

export async function updateGalleryPhotoTitle(id: string, title: string): Promise<void> {
  await updateDoc(doc(db, GALLERY_COLLECTION, id), { title });
}

export async function getGalleryPhotosFromFirestore(maxResults?: number): Promise<GalleryPhoto[]> {
  const q = maxResults && maxResults > 0
    ? query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'), queryLimit(maxResults))
    : query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GalleryPhoto));
}

export async function deleteGalleryPhoto(photo: GalleryPhoto): Promise<void> {
  if (photo.id) await deleteDoc(doc(db, GALLERY_COLLECTION, photo.id));
  if (photo.storagePath) {
    try {
      const { storage, ref, deleteObject } = await import('../firebaseStorage');
      await deleteObject(ref(storage, photo.storagePath));
    }
    catch (error) { console.warn('Gallery storage delete failed:', error); }
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
