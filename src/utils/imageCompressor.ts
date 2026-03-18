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
