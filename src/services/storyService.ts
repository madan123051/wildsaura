import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe, where } from 'firebase/firestore';
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
  projectId?: string;  // ← NEW: Filter stories by project
}

const STORIES_COLLECTION = 'stories';
const PROJECT_ID = 'wildsaura'; // ← NEW: Identify this project

export async function uploadStoryCoverToStorage(dataUrl: string, filename: string): Promise<string> {
  const storageRef = ref(storage, `story-covers/${Date.now()}_${filename}`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
}

export async function addStoryToFirestore(story: Omit<FirestoreStory, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, STORIES_COLLECTION), {
    ...story,
    projectId: PROJECT_ID,  // ← NEW: Tag with project ID
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getStoriesFromFirestore(): Promise<FirestoreStory[]> {
  try {
    // ← NEW: Filter by projectId (wildsaura) OR no projectId (backward compat)
    const q = query(
      collection(db, STORIES_COLLECTION),
      where('projectId', '==', PROJECT_ID),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreStory));
  } catch (err) {
    try {
      // Fallback: no filter, ordered by createdAt
      const q = query(collection(db, STORIES_COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => {
        const data = d.data() as FirestoreStory;
        // ← NEW: Only include stories with matching projectId or no projectId (old data)
        if (!data.projectId || data.projectId === PROJECT_ID) {
          return { id: d.id, ...data } as FirestoreStory;
        }
        return null;
      }).filter(Boolean) as FirestoreStory[];
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

/**
 * Real-time subscription to all stories (filtered by projectId).
 * Fires onUpdate whenever any story document changes (add/edit/delete).
 * Returns an unsubscribe function.
 */
export function subscribeToStories(
  onUpdate: (stories: FirestoreStory[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, STORIES_COLLECTION),
      where('projectId', '==', PROJECT_ID),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q,
      (snapshot) => {
        const stories = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreStory));
        onUpdate(stories);
      },
      (error) => {
        console.error('Story subscription error:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    // Fallback: subscribe without filter
    const q = query(collection(db, STORIES_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q,
      (snapshot) => {
        const stories = snapshot.docs.map(d => {
          const data = d.data() as FirestoreStory;
          if (!data.projectId || data.projectId === PROJECT_ID) {
            return { id: d.id, ...data } as FirestoreStory;
          }
          return null;
        }).filter(Boolean) as FirestoreStory[];
        onUpdate(stories);
      },
      (error) => {
        console.error('Story subscription error:', error);
        if (onError) onError(error);
      }
    );
  }
}
