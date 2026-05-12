import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  WILDSAURA — Video Service v2.1 (projectId filter added)
 * ═══════════════════════════════════════════════════════════════════════
 */

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
  originalSize?: number;
  aspectRatio?: string;
  videoWidth?: number;
  videoHeight?: number;
  projectId?: string;
}

const VIDEOS_COLLECTION = 'videos';
const PROJECT_ID = 'wildsaura';

/** Keep only docs that belong to wildsaura or have no projectId (old content). */
const belongsHere = (v: FirestoreVideo) =>
  !v.projectId || v.projectId === PROJECT_ID;

/** Convert a data URL to a Blob (legacy support) */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'video/mp4';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * 🎬 Upload video thumbnail to Firebase Storage.
 */
export async function uploadVideoThumbnailToStorage(
  input: File | Blob | string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, `video-thumbnails/${Date.now()}_${filename}`);

  let blob: Blob;
  if (typeof input === 'string') {
    blob = dataUrlToBlob(input);
  } else {
    blob = input;
  }

  const contentType = blob.type || 'image/webp';
  console.log(`🖼️ Uploading video thumbnail: ${(blob.size / 1024).toFixed(0)}KB (${contentType})`);

  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Thumbnail upload timed out after 30 seconds.'));
    }, 30000);

    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('🖼️ Thumbnail upload error:', error);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('🖼️ Thumbnail upload complete!');
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * 🎬 Upload video file to Firebase Storage.
 */
export async function uploadVideoToStorage(
  input: File | Blob | string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, `videos/${Date.now()}_${filename}`);

  let blob: Blob;
  if (typeof input === 'string') {
    console.log('🎬 Converting data URL to Blob for resumable upload...');
    blob = dataUrlToBlob(input);
  } else {
    blob = input;
  }

  const contentType = blob.type || 'video/mp4';
  const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
  console.log(`🎬 Starting resumable video upload: ${sizeMB}MB (${contentType})`);

  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('Video upload timed out after 3 minutes. File may be too large or connection too slow.'));
    }, 180000);

    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
        if (pct % 20 === 0) {
          console.log(`🎬 Upload progress: ${pct}% (${(snapshot.bytesTransferred / 1024 / 1024).toFixed(1)}MB / ${sizeMB}MB)`);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('🎬 Video upload error:', error);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          console.log('🎬 ✅ Video upload complete!');
          resolve(downloadUrl);
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
      .filter(belongsHere);
  } catch (err) {
    try {
      const snapshot = await getDocs(collection(db, VIDEOS_COLLECTION));
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as FirestoreVideo))
        .filter(belongsHere);
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
 */
export function subscribeToVideos(
  onUpdate: (videos: FirestoreVideo[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, VIDEOS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const videos = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as FirestoreVideo))
        .filter(belongsHere);
      onUpdate(videos);
    },
    (error) => {
      console.error('Video subscription error:', error);
      if (onError) onError(error);
    }
  );
}
