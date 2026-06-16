import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export interface SiteSettings {
  heroImages: string[];      // Array of image URLs for hero slider
  defaultThumbnail?: string; // Default thumbnail URL
  categoryImages?: {
    wildlife?: string;
    birds?: string;
    macro?: string;
    domestic?: string;
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
 * - Uses adaptive quality and smaller fallbacks until targetKB is reached
 * - Falls back to JPEG if WebP is not supported by the browser
 */
function compressToWebP(
  file: File,
  maxDimension: number,
  quality: number,
  targetKB: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D not supported')); return; }
        ctx.imageSmoothingEnabled = true;
        (ctx as any).imageSmoothingQuality = 'high';

        const tryEncode = (type: string, q: number): Promise<Blob | null> =>
          new Promise(res => canvas.toBlob(b => res(b), type, q));

        (async () => {
          const targetBytes = targetKB * 1024;
          const dimensions = Array.from(new Set([
            maxDimension,
            Math.round(maxDimension * 0.86),
            Math.round(maxDimension * 0.72),
            Math.round(maxDimension * 0.58),
          ].filter((n) => n >= 360)));
          const qualities = Array.from(new Set([
            quality,
            Math.max(0.68, quality - 0.08),
            Math.max(0.60, quality - 0.16),
            Math.max(0.52, quality - 0.24),
          ]));

          let bestBlob: Blob | null = null;
          let bestW = img.naturalWidth;
          let bestH = img.naturalHeight;

          for (const dim of dimensions) {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (w > dim || h > dim) {
              const scale = dim / Math.max(w, h);
              w = Math.round(w * scale);
              h = Math.round(h * scale);
            }

            canvas.width = w;
            canvas.height = h;
            ctx.imageSmoothingEnabled = true;
            (ctx as any).imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);

            for (const q of qualities) {
              const blob = await tryEncode('image/webp', q);
              if (!blob) continue;
              bestBlob = blob;
              bestW = w;
              bestH = h;
              if (blob.size <= targetBytes) {
                const origKB = (file.size / 1024).toFixed(0);
                const compKB = (blob.size / 1024).toFixed(0);
                const saved = Math.round((1 - blob.size / file.size) * 100);
                console.log(`🖼️ Compressed ${file.name}: ${origKB}KB → ${compKB}KB WebP ${w}×${h}px (${saved}% saved)`);
                resolve(blob);
                return;
              }
            }
          }

          // Fallback to JPEG if browser doesn't support WebP encoding
          if (!bestBlob) {
            bestBlob = await tryEncode('image/jpeg', Math.min(0.78, quality));
          }
          if (!bestBlob) { reject(new Error('Image encoding failed')); return; }

          const origKB = (file.size / 1024).toFixed(0);
          const compKB = (bestBlob.size / 1024).toFixed(0);
          const saved = Math.round((1 - bestBlob.size / file.size) * 100);
          console.log(`🖼️ Compressed ${file.name}: ${origKB}KB → ${compKB}KB ${bestBlob.type || 'image'} ${bestW}×${bestH}px (${saved}% saved)`);
          resolve(bestBlob);
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
 * Compressed to WebP, max 1440px, target ~500KB.
 */
export async function uploadHeroImage(file: File, index: number): Promise<string> {
  const blob = await compressToWebP(file, 1440, 0.78, 500);
  return uploadSiteAsset(`hero-${index}-${Date.now()}.webp`, blob);
}

/**
 * Upload category section image.
 * Compressed to WebP, max 640px, target ~240KB.
 */
export async function uploadCategoryImage(category: string, file: File): Promise<string> {
  const blob = await compressToWebP(file, 640, 0.78, 240);
  return uploadSiteAsset(`category-${category}-${Date.now()}.webp`, blob);
}

/**
 * Upload default post thumbnail.
 * Compressed to WebP, max 720px, target ~260KB.
 */
export async function uploadDefaultThumbnail(file: File): Promise<string> {
  const blob = await compressToWebP(file, 720, 0.78, 260);
  return uploadSiteAsset(`default-thumbnail-${Date.now()}.webp`, blob);
}
