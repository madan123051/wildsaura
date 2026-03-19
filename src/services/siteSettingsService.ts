import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export interface SiteSettings {
  heroImages: string[];      // Array of image URLs for hero slider
  defaultThumbnail?: string; // Default thumbnail URL
  categoryImages?: {
    wildlife?: string;
    landscape?: string;
    portraits?: string;
  };
  updatedAt?: string;
}

const SETTINGS_DOC = 'siteSettings';
const SETTINGS_COLLECTION = 'settings';

// Get site settings once
export async function getSiteSettings(): Promise<SiteSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as SiteSettings;
  return { heroImages: [] };
}

// Real-time listener for site settings
export function onSiteSettingsChange(callback: (settings: SiteSettings) => void): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as SiteSettings);
    } else {
      callback({ heroImages: [] });
    }
  });
}

// Save site settings
export async function saveSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  const current = await getSiteSettings();
  await setDoc(docRef, {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// Upload hero image to Firebase Storage
export async function uploadHeroImage(file: File, index: number): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const storageRef = ref(storage, `site/hero-${index}-${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// Upload category image to Firebase Storage
export async function uploadCategoryImage(category: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const storageRef = ref(storage, `site/category-${category}-${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// Upload default thumbnail
export async function uploadDefaultThumbnail(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const storageRef = ref(storage, `site/default-thumbnail-${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
