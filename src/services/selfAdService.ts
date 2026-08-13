// ── Self-Ad / Promotion Service — Firestore CRUD ──────────────────────
import { db } from '../firebaseCore';
import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, orderBy, Timestamp
} from 'firebase/firestore';

export interface SelfAd {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imagePath?: string; // Firebase storage path for deletion
  linkUrl?: string;
  linkText?: string;
  enabled: boolean;
  priority: number; // higher = shown first
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'self_ads';

// ── Fetch all ads (admin) ────────────────────────────────────────────
export async function fetchAllSelfAds(): Promise<SelfAd[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('priority', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        imagePath: data.imagePath || '',
        linkUrl: data.linkUrl || '',
        linkText: data.linkText || 'Visit',
        enabled: data.enabled !== false,
        priority: data.priority || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as SelfAd;
    });
  } catch (err) {
    console.error('Failed to fetch self ads:', err);
    return [];
  }
}

// ── Fetch only enabled ads (public site) ─────────────────────────────
// NOTE: No composite index needed — fetch all, filter client-side
export async function fetchEnabledSelfAds(): Promise<SelfAd[]> {
  try {
    // Simple query — only orderBy, no where (avoids composite index requirement)
    const q = query(
      collection(db, COLLECTION),
      orderBy('priority', 'desc')
    );
    const snap = await getDocs(q);
    const all = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        linkUrl: data.linkUrl || '',
        linkText: data.linkText || 'Visit',
        enabled: data.enabled !== false,
        priority: data.priority || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as SelfAd;
    });
    // Filter enabled client-side (no Firestore composite index needed)
    return all.filter(ad => ad.enabled === true);
  } catch (err) {
    console.error('Failed to fetch enabled self ads:', err);
    return [];
  }
}

// ── Upload ad image ──────────────────────────────────────────────────
export async function uploadAdImage(file: File): Promise<{ url: string; path: string }> {
  const { storage, ref, uploadBytes, getDownloadURL } = await import('../firebaseStorage');
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `ad_${Date.now()}.${ext}`;
  const storagePath = `self_ads/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  // Compress if image is large
  let uploadFile = file;
  if (file.size > 500 * 1024) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = await createImageBitmap(file);
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || file), 'image/webp', 0.8);
      });
      uploadFile = new File([blob], fileName.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
    } catch { /* use original */ }
  }
  
  await uploadBytes(storageRef, uploadFile, {
    contentType: uploadFile.type || 'image/webp',
    cacheControl: 'public,max-age=31536000,immutable',
  });
  const url = await getDownloadURL(storageRef);
  return { url, path: storagePath };
}

// ── Create ad ────────────────────────────────────────────────────────
export async function createSelfAd(ad: Omit<SelfAd, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...ad,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

// ── Update ad ────────────────────────────────────────────────────────
export async function updateSelfAd(id: string, updates: Partial<SelfAd>): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// ── Delete ad ────────────────────────────────────────────────────────
export async function deleteSelfAd(ad: SelfAd): Promise<void> {
  // Delete image from storage if exists
  if (ad.imagePath) {
    try {
      const { storage, ref, deleteObject } = await import('../firebaseStorage');
      const storageRef = ref(storage, ad.imagePath);
      await deleteObject(storageRef);
    } catch { /* image may not exist */ }
  }
  await deleteDoc(doc(db, COLLECTION, ad.id));
}

// ── Toggle enabled ───────────────────────────────────────────────────
export async function toggleSelfAd(id: string, enabled: boolean): Promise<void> {
  await updateSelfAd(id, { enabled } as any);
}
