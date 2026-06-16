import imageCompression from 'browser-image-compression';

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  WILDSAURA — Smart Image Compression Engine v2.0
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  🎯 Goal: Maximum visual quality in minimum file size
 *
 *  ✅ OUTPUT FORMAT:   WebP  (25-35% smaller than JPEG at same quality)
 *  ✅ TARGET SIZE:     Around 1 MB for full uploads
 *  ✅ MAX RESOLUTION:  2560px first pass, then smaller fallbacks
 *  ✅ QUALITY LOGIC:   Adaptive — starts high and reduces ONLY if needed
 *  ✅ EXIF:            Removed from served files to save bytes
 *  ✅ THUMBNAILS:      Auto-generated 720px WebP, capped around 280KB
 *
 *  How adaptive quality works:
 *  ─────────────────────────────
 *  1. First try: 88% quality → if result ≤ 1MB, done ✅ (best quality)
 *  2. If still too big: try 84%, 80%, 76%, 72% …
 *  3. If still too big: reduce resolution to 2048px / 1600px and try again
 *  4. Result: smallest possible quality loss while staying around 1MB
 *
 *  Why WebP?
 *  ─────────
 *  - 25-35% smaller than JPEG at identical visual quality
 *  - Supported by all modern browsers (Chrome, Firefox, Safari, Edge)
 *  - Ideal for photography websites — sharp images, fast loading
 *  - Visitors see beautiful photos without waiting for heavy downloads
 */

export interface CompressionStats {
  originalSizeMB: number;
  compressedSizeMB: number;
  savedPercent: number;
  format: string;
  quality: number;
  resolution: string;
}

/**
 * 📸 Smart compress for upload — targets ~1MB WebP with maximum quality.
 *
 * Uses adaptive quality: starts high and reduces ONLY if the file is still
 * over 1MB. Camera metadata is already stored separately in Firestore, so EXIF
 * is stripped from the served image to keep pages fast.
 */
export async function compressForUpload(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const TARGET_MAX_MB = 1;       // Hard ceiling target for fast public loading
  const IDEAL_MB = 0.9;          // Sweet spot for quality vs size
  const MAX_RES_PRIMARY = 2560;  // Sharp enough for web viewing
  const MAX_RES_FALLBACK = 2048; // Fallback if the image is still too big
  const originalMB = file.size / 1024 / 1024;

  console.log(`📸 Smart compression starting: ${file.name} (${originalMB.toFixed(2)}MB, ${file.type})`);

  // Skip compression if already small WebP.
  if (originalMB <= IDEAL_MB && file.type === 'image/webp') {
    console.log(`📸 ✅ Already optimized WebP (${originalMB.toFixed(2)}MB) — skipping`);
    if (onProgress) onProgress(40);
    return file;
  }

  // ── Phase 1: High quality at web-large resolution ─────────────────────
  const qualityLevels = [0.88, 0.84, 0.80, 0.76, 0.72, 0.68];

  for (let i = 0; i < qualityLevels.length; i++) {
    const quality = qualityLevels[i];
    if (onProgress) onProgress(Math.round(((i + 1) / qualityLevels.length) * 30));

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: TARGET_MAX_MB,
        maxWidthOrHeight: MAX_RES_PRIMARY,
        initialQuality: quality,
        fileType: 'image/webp' as const,
        useWebWorker: true,
        preserveExif: false,
      });

      const compressedMB = compressed.size / 1024 / 1024;

      if (compressedMB <= TARGET_MAX_MB) {
        const savedPct = Math.round((1 - compressedMB / originalMB) * 100);
        console.log(
          `📸 ✅ Phase 1 success: ${originalMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB ` +
          `(WebP q=${Math.round(quality * 100)}%, ${savedPct}% saved, ${MAX_RES_PRIMARY}px max)`
        );
        if (onProgress) onProgress(40);
        const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
        return new File([compressed], webpName, { type: 'image/webp' });
      }

      console.log(`📸 Quality ${Math.round(quality * 100)}% → ${compressedMB.toFixed(2)}MB (still > ${TARGET_MAX_MB}MB, trying lower...)`);
    } catch (err) {
      console.warn(`📸 Quality ${Math.round(quality * 100)}% failed:`, err);
    }
  }

  // ── Phase 2: Reduce resolution to 2048px ──────────────────────────────
  // Only reaches here for very large / high-detail images
  console.log('📸 Phase 2: Reducing to 2048px resolution...');
  if (onProgress) onProgress(32);

  for (const quality of [0.82, 0.76, 0.70, 0.64]) {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: TARGET_MAX_MB,
        maxWidthOrHeight: MAX_RES_FALLBACK,
        initialQuality: quality,
        fileType: 'image/webp' as const,
        useWebWorker: true,
        preserveExif: false,
      });

      const compressedMB = compressed.size / 1024 / 1024;

      if (compressedMB <= TARGET_MAX_MB) {
        const savedPct = Math.round((1 - compressedMB / originalMB) * 100);
        console.log(
          `📸 ✅ Phase 2 success: ${originalMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB ` +
          `(WebP q=${Math.round(quality * 100)}%, ${savedPct}% saved, ${MAX_RES_FALLBACK}px max)`
        );
        if (onProgress) onProgress(40);
        const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
        return new File([compressed], webpName, { type: 'image/webp' });
      }
    } catch (err) {
      console.warn(`📸 Phase 2 q=${Math.round(quality * 100)}% failed:`, err);
    }
  }

  // ── Phase 3: Final fallback — force around 1MB ────────────────────────
  console.log('📸 Phase 3: Final force-compress...');
  if (onProgress) onProgress(35);

  const compressed = await imageCompression(file, {
    maxSizeMB: TARGET_MAX_MB,
    maxWidthOrHeight: 1600,
    initialQuality: 0.72,
    fileType: 'image/webp' as const,
    useWebWorker: true,
    preserveExif: false,
    onProgress: (p: number) => {
      if (onProgress) onProgress(35 + Math.round(p * 0.05));
    },
  });

  const compressedMB = compressed.size / 1024 / 1024;
  const savedPct = Math.round((1 - compressedMB / originalMB) * 100);
  console.log(
    `📸 ✅ Phase 3 final: ${originalMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB ` +
    `(WebP q=72%, ${savedPct}% saved, 1600px max)`
  );
  if (onProgress) onProgress(40);

  const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([compressed], webpName, { type: 'image/webp' });
}


/**
 * 🖼️ Generate optimized thumbnail for gallery / lazy loading.
 *
 * - 720px max dimension (sharp on high-density mobile screens)
 * - Max 280KB WebP (200-300KB target range)
 * - No EXIF data (not needed for thumbnails — saves space)
 */
export async function generateThumbnail(
  file: File,
  maxDim: number = 720
): Promise<File> {
  console.log(`🖼️ Generating thumbnail: ${file.name} → ${maxDim}px WebP`);

  const thumbnail = await imageCompression(file, {
    maxSizeMB: 0.28,              // Max ~280KB
    maxWidthOrHeight: maxDim,
    initialQuality: 0.82,
    fileType: 'image/webp' as const,
    useWebWorker: true,
    preserveExif: false,           // No EXIF needed for thumbnails
  });

  const thumbKB = (thumbnail.size / 1024).toFixed(0);
  console.log(`🖼️ ✅ Thumbnail: ${thumbKB}KB WebP (${maxDim}px)`);

  const thumbName = file.name.replace(/\.[^.]+$/, '') + '_thumb.webp';
  return new File([thumbnail], thumbName, { type: 'image/webp' });
}


/**
 * 📊 Get compression stats (for UI display)
 */
export function getCompressionStats(
  originalFile: File,
  compressedFile: File,
  quality: number = 0.90
): CompressionStats {
  const originalMB = originalFile.size / 1024 / 1024;
  const compressedMB = compressedFile.size / 1024 / 1024;
  return {
    originalSizeMB: parseFloat(originalMB.toFixed(2)),
    compressedSizeMB: parseFloat(compressedMB.toFixed(2)),
    savedPercent: Math.round((1 - compressedMB / originalMB) * 100),
    format: 'WebP',
    quality: Math.round(quality * 100),
    resolution: 'Web optimized (max 2560px)',
  };
}


/**
 * Compresses an image (data URL) to a maximum dimension for AI analysis.
 * Used before sending images to Gemini/ChatGPT API to avoid token limits.
 */
export async function compressImageForAI(
  dataUrl: string,
  maxDim: number = 1024,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      // Only compress if larger than maxDim
      if (w <= maxDim && h <= maxDim) {
        resolve(dataUrl);
        return;
      }

      // Scale down maintaining aspect ratio
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', quality);

      console.log(
        `📸 AI image compressed: ${img.width}x${img.height} → ${w}x${h} ` +
        `(${Math.round(dataUrl.length / 1024)}KB → ${Math.round(compressed.length / 1024)}KB)`
      );

      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}
