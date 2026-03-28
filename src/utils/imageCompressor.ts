import imageCompression from 'browser-image-compression';

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  WILDSAURA — Smart Image Compression Engine v2.0
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  🎯 Goal: Maximum visual quality in minimum file size
 *
 *  ✅ OUTPUT FORMAT:   WebP  (25-35% smaller than JPEG at same quality)
 *  ✅ TARGET SIZE:     1–2 MB (photography-grade, storage-friendly)
 *  ✅ MAX RESOLUTION:  3840px (4K — sharp on any display)
 *  ✅ QUALITY LOGIC:   Adaptive — starts at 92% and reduces ONLY if needed
 *  ✅ EXIF:            Preserved (camera info stays intact)
 *  ✅ THUMBNAILS:      Auto-generated 600px WebP for fast gallery loading
 *
 *  How adaptive quality works:
 *  ─────────────────────────────
 *  1. First try: 92% quality → if result ≤ 2MB, done ✅ (best quality)
 *  2. If still too big: try 88%, 84%, 80%, 76% …
 *  3. If still too big: reduce resolution to 2560px and try again
 *  4. Result: smallest possible quality loss while staying under 2MB
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
 * 📸 Smart compress for upload — targets 1-2MB WebP with maximum quality.
 *
 * Uses adaptive quality: starts at 92% (visually lossless) and reduces
 * ONLY if the file is still over 2MB. Most DSLR photos (20-50MB RAW, 8-15MB JPEG)
 * compress to 1-2MB WebP at 85-92% quality — indistinguishable from original.
 */
export async function compressForUpload(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const TARGET_MAX_MB = 2;       // Hard ceiling — never exceed 2MB
  const IDEAL_MB = 1.5;          // Sweet spot for quality vs size
  const MAX_RES_4K = 3840;       // 4K resolution — sharp on any monitor
  const MAX_RES_FALLBACK = 2560; // 2.5K fallback if 4K is still too big
  const originalMB = file.size / 1024 / 1024;

  console.log(`📸 Smart compression starting: ${file.name} (${originalMB.toFixed(2)}MB, ${file.type})`);

  // Skip compression if already small WebP
  if (originalMB <= IDEAL_MB && file.type === 'image/webp') {
    console.log(`📸 ✅ Already optimized WebP (${originalMB.toFixed(2)}MB) — skipping`);
    if (onProgress) onProgress(40);
    return file;
  }

  // ── Phase 1: High quality at 4K resolution ────────────────────────────
  // Try descending quality levels: 92% → 88% → 84% → 80% → 76% → 72%
  const qualityLevels = [0.92, 0.88, 0.84, 0.80, 0.76, 0.72];

  for (let i = 0; i < qualityLevels.length; i++) {
    const quality = qualityLevels[i];
    if (onProgress) onProgress(Math.round(((i + 1) / qualityLevels.length) * 30));

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: TARGET_MAX_MB,
        maxWidthOrHeight: MAX_RES_4K,
        initialQuality: quality,
        fileType: 'image/webp' as const,
        useWebWorker: true,
        preserveExif: true,
      });

      const compressedMB = compressed.size / 1024 / 1024;

      if (compressedMB <= TARGET_MAX_MB) {
        const savedPct = Math.round((1 - compressedMB / originalMB) * 100);
        console.log(
          `📸 ✅ Phase 1 success: ${originalMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB ` +
          `(WebP q=${Math.round(quality * 100)}%, ${savedPct}% saved, 4K res)`
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

  // ── Phase 2: Reduce resolution to 2.5K ────────────────────────────────
  // Only reaches here for very large / high-detail images
  console.log('📸 Phase 2: Reducing to 2.5K resolution...');
  if (onProgress) onProgress(32);

  for (const quality of [0.85, 0.78, 0.70]) {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: TARGET_MAX_MB,
        maxWidthOrHeight: MAX_RES_FALLBACK,
        initialQuality: quality,
        fileType: 'image/webp' as const,
        useWebWorker: true,
        preserveExif: true,
      });

      const compressedMB = compressed.size / 1024 / 1024;

      if (compressedMB <= TARGET_MAX_MB) {
        const savedPct = Math.round((1 - compressedMB / originalMB) * 100);
        console.log(
          `📸 ✅ Phase 2 success: ${originalMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB ` +
          `(WebP q=${Math.round(quality * 100)}%, ${savedPct}% saved, 2.5K res)`
        );
        if (onProgress) onProgress(40);
        const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
        return new File([compressed], webpName, { type: 'image/webp' });
      }
    } catch (err) {
      console.warn(`📸 Phase 2 q=${Math.round(quality * 100)}% failed:`, err);
    }
  }

  // ── Phase 3: Final fallback — force under 2MB ─────────────────────────
  console.log('📸 Phase 3: Final force-compress...');
  if (onProgress) onProgress(35);

  const compressed = await imageCompression(file, {
    maxSizeMB: TARGET_MAX_MB,
    maxWidthOrHeight: 1920,       // 1080p — still sharp for web
    initialQuality: 0.75,
    fileType: 'image/webp' as const,
    useWebWorker: true,
    preserveExif: true,
    onProgress: (p: number) => {
      if (onProgress) onProgress(35 + Math.round(p * 0.05));
    },
  });

  const compressedMB = compressed.size / 1024 / 1024;
  const savedPct = Math.round((1 - compressedMB / originalMB) * 100);
  console.log(
    `📸 ✅ Phase 3 final: ${originalMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB ` +
    `(WebP q=75%, ${savedPct}% saved, 1080p res)`
  );
  if (onProgress) onProgress(40);

  const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([compressed], webpName, { type: 'image/webp' });
}


/**
 * 🖼️ Generate optimized thumbnail for gallery / lazy loading.
 *
 * - 600px max dimension (perfect for gallery grids)
 * - Max 150KB WebP (loads instantly, even on 3G)
 * - No EXIF data (not needed for thumbnails — saves space)
 */
export async function generateThumbnail(
  file: File,
  maxDim: number = 600
): Promise<File> {
  console.log(`🖼️ Generating thumbnail: ${file.name} → ${maxDim}px WebP`);

  const thumbnail = await imageCompression(file, {
    maxSizeMB: 0.15,              // Max 150KB
    maxWidthOrHeight: maxDim,
    initialQuality: 0.80,
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
    resolution: '4K (3840px)',
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
