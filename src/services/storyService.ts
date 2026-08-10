import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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
  photographer?: string;
}

const STORIES_COLLECTION = 'stories';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Only show stories that have a non-empty title
// (filters out stories from other sites sharing the same Firebase)
function hasTitle(story: FirestoreStory): boolean {
  return !!(story.title && story.title.trim() !== '');
}

export async function uploadStoryCoverToStorage(dataUrl: string, filename: string): Promise<string> {
  const storageRef = ref(storage, `story-covers/${Date.now()}_${filename}`);
  const blob = dataUrlToBlob(dataUrl);
  const contentType = blob.type || 'image/webp';

  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Story cover upload timed out after 45 seconds.'));
    }, 45000);

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType,
      cacheControl: 'public,max-age=31536000,immutable',
    });
    uploadTask.on(
      'state_changed',
      () => {},
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        } catch (err) {
          reject(err);
        }
      },
    );
  });
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
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as FirestoreStory))
      .filter(hasTitle);
  } catch (err) {
    try {
      const snapshot = await getDocs(collection(db, STORIES_COLLECTION));
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as FirestoreStory))
        .filter(hasTitle);
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

export async function incrementStoryCounter(docId: string, field: 'viewCount' | 'likeCount', amount: number = 1): Promise<void> {
  await updateDoc(doc(db, STORIES_COLLECTION, docId), { [field]: increment(amount) });
}

/**
 * Real-time subscription to all stories.
 * Fires onUpdate whenever any story document changes (add/edit/delete).
 * Returns an unsubscribe function.
 */
export function subscribeToStories(
  onUpdate: (stories: FirestoreStory[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, STORIES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const stories = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as FirestoreStory))
        .filter(hasTitle);
      onUpdate(stories);
    },
    (error) => {
      console.error('Story subscription error:', error);
      if (onError) onError(error);
    }
  );
}
