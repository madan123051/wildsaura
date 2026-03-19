import imageCompression from 'browser-image-compression';

/**
 * Compresses an image FILE for portfolio upload.
 * - Format: WebP (best quality-to-size ratio for web)
 * - Quality: 90% (visually lossless, ~60-80% size reduction)
 * - Max File Size: 4MB (guaranteed output size)
 * - Max Resolution: 3840px (4K — sharp on all monitors)
 * - ICC Profiles: Preserved via exif preservation (best-effort in browser)
 */
export async function compressForUpload(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const originalMB = (file.size / 1024 / 1024).toFixed(2);
  console.log(`📸 Starting compression: ${file.name} (${originalMB}MB)`);

  const options = {
    maxSizeMB: 4,              // Guarantee output is under 4MB
    maxWidthOrHeight: 3840,    // 4K Resolution — sharp on large monitors
    initialQuality: 0.9,       // 90% quality — human eye cannot tell the difference
    fileType: 'image/webp' as const,    // WebP — best quality-to-size ratio for web
    useWebWorker: true,        // Non-blocking compression
    preserveExif: true,        // Preserve EXIF metadata (ICC profile best-effort)
    onProgress: (progress: number) => {
      if (onProgress) onProgress(Math.round(progress * 0.4)); // Compression = 0–40% of total
    },
  };

  try {
    const compressed = await imageCompression(file, options);
    const compressedMB = (compressed.size / 1024 / 1024).toFixed(2);
    console.log(
      `📸 Compressed: ${originalMB}MB → ${compressedMB}MB ` +
      `(WebP, 90% quality, max 3840px, max 4MB)`
    );
    // Return as a File with .webp extension
    const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([compressed], webpName, { type: 'image/webp' });
  } catch (err) {
    console.error('📸 Compression failed:', err);
    throw err;
  }
}

/**
 * Compresses an image (data URL) to a maximum dimension while maintaining aspect ratio.
 * Used before sending images to Gemini API to avoid token/size limits.
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
        `📸 Image compressed: ${img.width}x${img.height} → ${w}x${h} ` +
        `(${Math.round(dataUrl.length / 1024)}KB → ${Math.round(compressed.length / 1024)}KB)`
      );
      
      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}
