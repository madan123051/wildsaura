import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { compressForUpload } from './imageCompressor';

export type GalleryCategory = 'Wildlife' | 'Birds' | 'Landscapes' | 'Portraits' | 'Others';

export interface GalleryPhoto {
  id?: string;
  url: string;
  title: string;
  description: string;
  category: GalleryCategory;
  uploadedAt?: any;
  likes: number;
  projectId?: string;  // ← NEW: Filter photos by project
}

const GALLERY_COLLECTION = 'gallery';
const PROJECT_ID = 'wildsaura'; // ← NEW: Identify this project

export async function uploadPhotoToStorage(file: File): Promise<string> {
  try {
    // Compress image before upload
    const compressed = await compressForUpload(file);
    const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
    
    await uploadString(storageRef, compressed.split(',')[1], 'base64');
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Photo upload error:', error);
    throw new Error('Failed to upload photo');
  }
}

export async function addPhotoToFirestore(photo: Omit<GalleryPhoto, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, GALLERY_COLLECTION), {
    ...photo,
    projectId: PROJECT_ID,  // ← NEW: Tag with project ID
    uploadedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPhotosFromFirestore(): Promise<GalleryPhoto[]> {
  try {
    // ← FIXED: Fetch all photos, filter in-memory for backward compatibility
    const q = query(collection(db, GALLERY_COLLECTION), orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as GalleryPhoto))
      .filter(photo => {
        // Show photos with no projectId (old data) OR matching projectId (new data)
        return !photo.projectId || photo.projectId === PROJECT_ID;
      });
  } catch (err) {
    console.warn('Firestore photos fetch failed:', err);
    return [];
  }
}

export async function deletePhotoFromFirestore(docId: string): Promise<void> {
  await deleteDoc(doc(db, GALLERY_COLLECTION, docId));
}

export async function updatePhotoInFirestore(docId: string, data: Partial<GalleryPhoto>): Promise<void> {
  await updateDoc(doc(db, GALLERY_COLLECTION, docId), data);
}

export async function likePhotoInFirestore(docId: string, currentLikes: number): Promise<void> {
  await updatePhotoInFirestore(docId, { likes: currentLikes + 1 });
}
