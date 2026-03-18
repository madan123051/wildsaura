import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export interface FirestoreVideo {
  id?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  location?: string;
  duration?: string;
  createdAt?: any;
  viewCount: number;
  likeCount: number;
}

const VIDEOS_COLLECTION = 'videos';

export async function uploadVideoThumbnailToStorage(dataUrl: string, filename: string): Promise<string> {
  const storageRef = ref(storage, `video-thumbnails/${Date.now()}_${filename}`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
}

export async function uploadVideoToStorage(dataUrl: string, filename: string): Promise<string> {
  const storageRef = ref(storage, `videos/${Date.now()}_${filename}`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
}

export async function addVideoToFirestore(video: Omit<FirestoreVideo, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), {
    ...video,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getVideosFromFirestore(): Promise<FirestoreVideo[]> {
  try {
    const q = query(collection(db, VIDEOS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreVideo));
  } catch (err) {
    try {
      const snapshot = await getDocs(collection(db, VIDEOS_COLLECTION));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreVideo));
    } catch {
      console.warn('Firestore videos fetch failed:', err);
      return [];
    }
  }
}

export async function deleteVideoFromFirestore(docId: string): Promise<void> {
  await deleteDoc(doc(db, VIDEOS_COLLECTION, docId));
}

export async function updateVideoInFirestore(docId: string, data: Partial<FirestoreVideo>): Promise<void> {
  await updateDoc(doc(db, VIDEOS_COLLECTION, docId), data);
}

/**
 * Real-time subscription to all videos.
 * Fires onUpdate whenever any video document changes (add/edit/delete).
 * Returns an unsubscribe function.
 */
export function subscribeToVideos(
  onUpdate: (videos: FirestoreVideo[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, VIDEOS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const videos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreVideo));
      onUpdate(videos);
    },
    (error) => {
      console.error('Video subscription error:', error);
      if (onError) onError(error);
    }
  );
}
