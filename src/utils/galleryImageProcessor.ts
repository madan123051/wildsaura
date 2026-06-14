// Gallery image processor: resize + compress to WebP + add © WildSaura watermark.
// Pure Canvas API — works on iOS Safari, Android Chrome, and desktop.

const MAX_WIDTH = 2400;
const QUALITY_PRIMARY = 0.82;
const QUALITY_FALLBACK = 0.78;
const WATERMARK_TEXT = '© WildSaura';
const WATERMARK_OPACITY = 0.55;
const WATERMARK_PADDING = 24;

/** Load a File into an HTMLImageElement using object URL (Safari-safe). */
function loadImage(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image. The file may be corrupted or in an unsupported format.'));
    };
    img.decoding = 'async';
    img.src = url;
  });
}

/** Compute resized dimensions preserving aspect ratio. */
function fitWithin(width: number, height: number, maxW: number) {
  if (width <= maxW) return { w: width, h: height };
  const scale = maxW / width;
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

/** Draw watermark text in bottom-right corner. */
function drawWatermark(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  // Responsive font size: ~2.2% of the longer edge, clamped 16–48px
  const fontSize = Math.max(16, Math.min(48, Math.round(Math.max(canvasW, canvasH) * 0.022)));
  ctx.save();
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  ctx.globalAlpha = WATERMARK_OPACITY;
  // Subtle dark shadow for contrast on bright photos
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(WATERMARK_TEXT, canvasW - WATERMARK_PADDING, canvasH - WATERMARK_PADDING);
  ctx.restore();
}

/** canvas.toBlob wrapped in a Promise. */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

export interface ProcessedImage {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: 'webp' | 'jpeg';
}

/**
 * Process an image for gallery upload:
 *   1. Resize to max 2400px width (preserve aspect ratio)
 *   2. Add © WildSaura watermark (bottom-right)
 *   3. Encode to WebP at q≈0.82 (fallback to JPEG if WebP unsupported)
 *   4. Returns a Blob ready to upload to Firebase Storage
 */
export async function processGalleryImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image.');
  }

  const { img, revoke } = await loadImage(file);
  try {
    const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_WIDTH);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable on this browser.');

    // High-quality resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    drawWatermark(ctx, w, h);

    // Try WebP first
    let blob = await canvasToBlob(canvas, 'image/webp', QUALITY_PRIMARY);
    let format: 'webp' | 'jpeg' = 'webp';

    // Retry WebP at slightly lower quality if first attempt failed
    if (!blob) {
      blob = await canvasToBlob(canvas, 'image/webp', QUALITY_FALLBACK);
    }

    // Final fallback: JPEG (older iOS Safari versions)
    if (!blob) {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
      format = 'jpeg';
    }

    if (!blob) {
      throw new Error('Image encoding failed in this browser.');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${baseName}.${format}`;

    return {
      blob,
      filename,
      width: w,
      height: h,
      sizeBytes: blob.size,
      format,
    };
  } finally {
    revoke();
  }
}
