import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export interface SiteSettings {
  heroImages: string[];      // Array of image URLs for hero slider
  defaultThumbnail?: string; // Default thumbnail URL
  categoryImages?: {
    wildlife?: string;
    landscape?: string;
    nature?: string;
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
  // Filter out undefined values that Firestore rejects
  const cleaned = Object.fromEntries(
    Object.entries(settings).filter(([_, v]) => v !== undefined)
  );
  await setDoc(docRef, {
    ...current,
    ...cleaned,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Compress an image File to WebP format for fast website loading.
 * - Resizes to maxDimension (preserving aspect ratio)
 * - Targets small file size via quality parameter
 * - Falls back to JPEG if WebP is not supported by the browser
 */
function compressToWebP(
  file: File,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        // Scale down if larger than maxDimension
        if (w > maxDimension || h > maxDimension) {
          const scale = maxDimension / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D not supported')); return; }
        ctx.imageSmoothingEnabled = true;
        (ctx as any).imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        const tryEncode = (type: string, q: number): Promise<Blob | null> =>
          new Promise(res => canvas.toBlob(b => res(b), type, q));

        (async () => {
          // Try WebP at target quality
          let blob = await tryEncode('image/webp', quality);
          // If still > 1MB, reduce quality a bit more
          if (blob && blob.size > 1024 * 1024) {
            blob = await tryEncode('image/webp', Math.max(0.60, quality - 0.12));
          }
          // Fallback to JPEG if browser doesn't support WebP encoding
          if (!blob) blob = await tryEncode('image/jpeg', quality);
          if (!blob) { reject(new Error('Image encoding failed')); return; }

          const origKB = (file.size / 1024).toFixed(0);
          const compKB = (blob.size / 1024).toFixed(0);
          const saved = Math.round((1 - blob.size / file.size) * 100);
          console.log(`🖼️ Compressed ${file.name}: ${origKB}KB → ${compKB}KB WebP ${w}×${h}px (${saved}% saved)`);
          resolve(blob);
        })();
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

/**
 * Upload a Blob to Firebase Storage using a resumable upload.
 * Stores under gallery/site-settings/ path — covered by the existing
 * `match /gallery/{allPaths=**}` rule which is already deployed.
 */
function uploadSiteAsset(filename: string, blob: Blob): Promise<string> {
  const storageRef = ref(storage, `gallery/site-settings/${filename}`);
  const contentType = blob.type || 'image/webp';

  return new Promise<string>((resolve, reject) => {
    // 60-second timeout to prevent silent hanging
    const timeoutId = setTimeout(() => {
      task.cancel();
      reject(new Error('Upload timed out after 60 seconds. Please check your internet connection.'));
    }, 60_000);

    const task = uploadBytesResumable(storageRef, blob, { contentType });

    task.on(
      'state_changed',
      () => {},  // no progress UI needed for small site assets
      (err) => {
        clearTimeout(timeoutId);
        console.error('site-settings upload error:', err);
        reject(err);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          console.log('✅ site-settings upload complete:', filename);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Upload hero slider image.
 * Compressed to WebP, max 1920px, target ≤800KB.
 */
export async function uploadHeroImage(file: File, index: number): Promise<string> {
  const blob = await compressToWebP(file, 1920, 0.82);
  return uploadSiteAsset(`hero-${index}-${Date.now()}.webp`, blob);
}

/**
 * Upload category section image.
 * Compressed to WebP, max 1200px, target ≤500KB.
 */
export async function uploadCategoryImage(category: string, file: File): Promise<string> {
  const blob = await compressToWebP(file, 1200, 0.80);
  return uploadSiteAsset(`category-${category}-${Date.now()}.webp`, blob);
}

/**
 * Upload default post thumbnail.
 * Compressed to WebP, max 800px, target ≤300KB.
 */
export async function uploadDefaultThumbnail(file: File): Promise<string> {
  const blob = await compressToWebP(file, 800, 0.78);
  return uploadSiteAsset(`default-thumbnail-${Date.now()}.webp`, blob);
}
