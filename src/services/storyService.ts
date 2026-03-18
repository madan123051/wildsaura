import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export interface FirestoreStory {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  tags: string[];
  createdAt?: any;
  viewCount: number;
  likeCount: number;
}

const STORIES_COLLECTION = 'stories';

export async function uploadStoryCoverToStorage(dataUrl: string, filename: string): Promise<string> {
  const storageRef = ref(storage, `story-covers/${Date.now()}_${filename}`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
}

export async function addStoryToFirestore(story: Omit<FirestoreStory, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, STORIES_COLLECTION), {
    ...story,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getStoriesFromFirestore(): Promise<FirestoreStory[]> {
  try {
    const q = query(collection(db, STORIES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreStory));
  } catch (err) {
    try {
      const snapshot = await getDocs(collection(db, STORIES_COLLECTION));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreStory));
    } catch {
      console.warn('Firestore stories fetch failed:', err);
      return [];
    }
  }
}

export async function deleteStoryFromFirestore(docId: string): Promise<void> {
  await deleteDoc(doc(db, STORIES_COLLECTION, docId));
}

export async function updateStoryInFirestore(docId: string, data: Partial<FirestoreStory>): Promise<void> {
  await updateDoc(doc(db, STORIES_COLLECTION, docId), data);
}
