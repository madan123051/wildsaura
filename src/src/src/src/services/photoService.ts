import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
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
const LOCAL_STORAGE_KEY = 'wildsaura_photos';

// ====== LOCAL STORAGE FALLBACK ======
function getLocalPhotos(): FirestorePhoto[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveLocalPhotos(photos: FirestorePhoto[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

// ====== FIREBASE OPERATIONS WITH FALLBACK ======
export async function uploadPhotoToStorage(dataUrl: string, filename: string): Promise<string> {
  try {
    const storageRef = ref(storage, `photos/${Date.now()}_${filename}`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.warn('Firebase Storage upload failed, saving locally:', err);
    // Return the data URL itself as fallback
    return dataUrl;
  }
}

export async function addPhotoToFirestore(photo: Omit<FirestorePhoto, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, PHOTOS_COLLECTION), {
      ...photo,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.warn('Firestore save failed, saving to localStorage:', err);
    // Fallback: save to localStorage
    const localPhotos = getLocalPhotos();
    const localId = `local_${Date.now()}`;
    localPhotos.unshift({ ...photo, id: localId });
    saveLocalPhotos(localPhotos);
    return localId;
  }
}

export async function getPhotosFromFirestore(): Promise<FirestorePhoto[]> {
  let firestorePhotos: FirestorePhoto[] = [];
  
  // Try Firestore first
  try {
    const q = query(collection(db, PHOTOS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    firestorePhotos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePhoto));
  } catch {
    try {
      const snapshot = await getDocs(collection(db, PHOTOS_COLLECTION));
      firestorePhotos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePhoto));
    } catch (err) {
      console.warn('Firestore fetch failed:', err);
    }
  }
  
  // Also load localStorage photos
  const localPhotos = getLocalPhotos();
  
  // Merge: Firestore first, then local (avoid duplicates)
  const firestoreIds = new Set(firestorePhotos.map(p => p.id));
  const uniqueLocalPhotos = localPhotos.filter(p => !firestoreIds.has(p.id));
  
  return [...firestorePhotos, ...uniqueLocalPhotos];
}

export async function deletePhotoFromFirestore(docId: string): Promise<void> {
  if (docId.startsWith('local_')) {
    // Delete from localStorage
    const localPhotos = getLocalPhotos();
    saveLocalPhotos(localPhotos.filter(p => p.id !== docId));
    return;
  }
  try {
    await deleteDoc(doc(db, PHOTOS_COLLECTION, docId));
  } catch (err) {
    console.warn('Firestore delete failed:', err);
  }
}

export async function updatePhotoInFirestore(docId: string, data: Partial<FirestorePhoto>): Promise<void> {
  if (docId.startsWith('local_')) {
    const localPhotos = getLocalPhotos();
    const idx = localPhotos.findIndex(p => p.id === docId);
    if (idx >= 0) {
      localPhotos[idx] = { ...localPhotos[idx], ...data };
      saveLocalPhotos(localPhotos);
    }
    return;
  }
  try {
    await updateDoc(doc(db, PHOTOS_COLLECTION, docId), data);
  } catch (err) {
    console.warn('Firestore update failed:', err);
  }
}
