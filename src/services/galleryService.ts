import { db, storage } from '../firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

export type GalleryCategory = 'wildlife' | 'birds' | 'landscapes' | 'portraits' | 'others';
export type GalleryFirestoreCollection = 'galleryPhotos' | 'photos';

export interface GalleryPhoto {
  id?: string;
  firestoreCollection?: GalleryFirestoreCollection;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  storagePath?: string;
  originalSize?: number;
  compressedSize?: number;
  createdAt?: any;
}

const GALLERY_COLLECTION = 'galleryPhotos';
const PHOTOS_COLLECTION = 'photos';

const sanitizeFilename = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');

function uploadFileToPath(
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; storagePath: string }> {
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

export async function uploadGalleryPhotoToStorage(
  file: File,
  category: GalleryCategory,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; storagePath: string }> {
  const safeName = sanitizeFilename(file.name.replace(/\.[^.]+$/, '.webp'));
  const timestamp = Date.now();
  const categoryFolderPath = `photos/gallery/${category}/${timestamp}_${safeName}`;

  try {
    return await uploadFileToPath(file, categoryFolderPath, onProgress);
  } catch (error) {
    // Some deployed Firebase Storage rules only allow direct children of `photos/`.
    // Fall back to that existing, known-good path while keeping category in metadata.
    console.warn('Gallery category-folder upload failed; retrying in flat photos folder:', error);
    const flatPhotosPath = `photos/${timestamp}_gallery_${category}_${safeName}`;
    if (onProgress) onProgress(0);
    return uploadFileToPath(file, flatPhotosPath, onProgress);
  }
}

function galleryPhotoToPhotosDoc(photo: Omit<GalleryPhoto, 'id' | 'firestoreCollection'>) {
  return {
    title: photo.title,
    caption: `Photo Gallery · ${photo.category}`,
    category: photo.category,
    galleryCategory: photo.category,
    imageUrl: photo.imageUrl,
    storagePath: photo.storagePath || '',
    location: '',
    tags: [photo.category, 'gallery'],
    likeCount: 0,
    type: 'gallery',
    source: 'wildsaura-gallery',
    contentType: 'gallery',
    status: 'approved',
    isPublic: true,
    published: true,
    originalSize: photo.originalSize,
    compressedSize: photo.compressedSize,
    createdAt: serverTimestamp(),
  };
}

function mapPhotosDocToGalleryPhoto(id: string, data: Record<string, any>): GalleryPhoto {
  return {
    id,
    firestoreCollection: 'photos',
    title: typeof data.title === 'string' ? data.title : 'Untitled Gallery Photo',
    category: (data.galleryCategory || data.category || 'others') as GalleryCategory,
    imageUrl: data.imageUrl,
    storagePath: data.storagePath || '',
    originalSize: data.originalSize,
    compressedSize: data.compressedSize,
    createdAt: data.createdAt,
  };
}

export async function addGalleryPhotoToFirestore(photo: Omit<GalleryPhoto, 'id' | 'firestoreCollection'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, GALLERY_COLLECTION), {
      ...photo,
      firestoreCollection: 'galleryPhotos',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    // If Firestore rules do not allow the new collection yet, use the existing photos collection
    // with a gallery-specific source so the main portfolio subscription does not pick it up.
    console.warn('galleryPhotos write failed; retrying in photos collection:', error);
    const docRef = await addDoc(collection(db, PHOTOS_COLLECTION), galleryPhotoToPhotosDoc(photo));
    return docRef.id;
  }
}

export async function getGalleryPhotosFromFirestore(): Promise<GalleryPhoto[]> {
  const galleryPhotos: GalleryPhoto[] = [];

  try {
    const galleryQuery = query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'));
    const gallerySnapshot = await getDocs(galleryQuery);
    galleryPhotos.push(...gallerySnapshot.docs.map(d => ({ id: d.id, firestoreCollection: 'galleryPhotos' as const, ...d.data() } as GalleryPhoto)));
  } catch (error) {
    console.warn('galleryPhotos fetch failed; continuing with photos fallback:', error);
  }

  try {
    const photosQuery = query(collection(db, PHOTOS_COLLECTION), orderBy('createdAt', 'desc'));
    const photosSnapshot = await getDocs(photosQuery);
    const fallbackPhotos = photosSnapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Record<string, any> & { id: string }))
      .filter(p => p.source === 'wildsaura-gallery' || p.contentType === 'gallery' || p.type === 'gallery')
      .map(p => mapPhotosDocToGalleryPhoto(p.id, p));
    galleryPhotos.push(...fallbackPhotos);
  } catch (error) {
    console.warn('photos gallery fallback fetch failed:', error);
  }

  return galleryPhotos;
}

export async function deleteGalleryPhoto(photo: GalleryPhoto): Promise<void> {
  const collectionName = photo.firestoreCollection || 'galleryPhotos';
  if (photo.id) await deleteDoc(doc(db, collectionName, photo.id));
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
  let directGalleryPhotos: GalleryPhoto[] = [];
  let fallbackPhotos: GalleryPhoto[] = [];

  const emit = () => {
    const byKey = new Map<string, GalleryPhoto>();
    [...directGalleryPhotos, ...fallbackPhotos].forEach((photo) => {
      byKey.set(`${photo.firestoreCollection || 'galleryPhotos'}_${photo.id || photo.imageUrl}`, photo);
    });
    onUpdate(Array.from(byKey.values()));
  };

  const unsubGallery = onSnapshot(
    query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      directGalleryPhotos = snapshot.docs.map(d => ({ id: d.id, firestoreCollection: 'galleryPhotos', ...d.data() } as GalleryPhoto));
      emit();
    },
    (error) => {
      directGalleryPhotos = [];
      console.warn('galleryPhotos subscription failed; using photos fallback if available:', error);
      if (onError) onError(error);
      emit();
    }
  );

  const unsubPhotos = onSnapshot(
    query(collection(db, PHOTOS_COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      fallbackPhotos = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Record<string, any> & { id: string }))
        .filter(p => p.source === 'wildsaura-gallery' || p.contentType === 'gallery' || p.type === 'gallery')
        .map(p => mapPhotosDocToGalleryPhoto(p.id, p));
      emit();
    },
    (error) => {
      fallbackPhotos = [];
      console.error('Photo gallery fallback subscription error:', error);
      if (onError) onError(error);
      emit();
    }
  );

  return () => {
    unsubGallery();
    unsubPhotos();
  };
}
