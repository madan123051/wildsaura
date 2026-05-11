import { db, storage } from '../firebase';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, orderBy, serverTimestamp, onSnapshot, Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface FirestoreVideo {
  id?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  location?: string;
  duration?: string | number;
  photographer?: string;
  aspectRatio?: string;
  videoWidth?: number;
  videoHeight?: number;
  tags: string[];
  createdAt?: any;
  viewCount: number;
  likeCount: number;
  projectId?: string;
}

const VIDEOS_COLLECTION = 'videos';
const PROJECT_ID = 'wildsaura';

/**
 * Upload a video file to Firebase Storage with resumable upload & progress.
 */
export async function uploadVideoToStorage(
  file: File,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, `videos/${Date.now()}_${filename}`);

  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Video upload timed out. Please check your internet connection and try again.'));
    }, 10 * 60 * 1000); // 10-minute timeout for large videos

    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type || 'video/mp4' });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(pct);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Upload a video thumbnail to Firebase Storage.
 */
export async function uploadVideoThumbnailToStorage(
  file: File | Blob,
  filename: string
): Promise<string> {
  const storageRef = ref(storage, `video-thumbnails/${Date.now()}_${filename}`);

  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Thumbnail upload timed out'));
    }, 30000);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'image/webp',
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
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export async function addVideoToFirestore(video: Omit<FirestoreVideo, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), {
    ...video,
    projectId: PROJECT_ID,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getVideosFromFirestore(): Promise<FirestoreVideo[]> {
  try {
    const q = query(collection(db, VIDEOS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as FirestoreVideo))
      .filter(video => !video.projectId || video.projectId === PROJECT_ID);
  } catch (err) {
    console.warn('Firestore videos fetch failed:', err);
    return [];
  }
}

export async function deleteVideoFromFirestore(docId: string): Promise<void> {
  await deleteDoc(doc(db, VIDEOS_COLLECTION, docId));
}

export async function updateVideoInFirestore(
  docId: string,
  data: Partial<FirestoreVideo>
): Promise<void> {
  await updateDoc(doc(db, VIDEOS_COLLECTION, docId), data);
}

/**
 * Real-time subscription to videos (filtered by projectId).
 */
export function subscribeToVideos(
  onUpdate: (videos: FirestoreVideo[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collection(db, VIDEOS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const videos = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as FirestoreVideo))
          .filter(video => !video.projectId || video.projectId === PROJECT_ID);
        onUpdate(videos);
      },
      (error) => {
        console.error('Video subscription error:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('Video subscription setup failed:', error);
    return () => {};
  }
}
