/**
 * Download a photo with optional watermark and 1MB size limit.
 * - First 2 downloads per session: clean (no watermark)
 * - After 2: watermarked with "WILDS AURA" diagonal text (Shutterstock style)
 */

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const text = 'WILDS AURA';
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(width, height) * 0.06}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw diagonal watermarks across the image in a grid pattern
  const angle = -Math.PI / 6; // -30 degrees
  const spacing = Math.max(width, height) * 0.25;

  for (let y = -height; y < height * 2; y += spacing) {
    for (let x = -width; x < width * 2; x += spacing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  // Draw a larger centered watermark
  ctx.globalAlpha = 0.35;
  ctx.font = `bold ${Math.max(width, height) * 0.1}px sans-serif`;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export async function downloadPhoto(
  imageUrl: string,
  title: string,
  applyWatermark: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        // Resize if needed to keep under ~1MB (target ~900KB)
        // JPEG at quality 0.8 is roughly 0.5-1.5 bytes per pixel
        const TARGET_BYTES = 1_000_000;
        const bytesPerPixel = 0.8; // rough estimate for JPEG quality 0.8
        const maxPixels = TARGET_BYTES / bytesPerPixel;
        const currentPixels = w * h;

        if (currentPixels > maxPixels) {
          const scale = Math.sqrt(maxPixels / currentPixels);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        if (applyWatermark) {
          drawWatermark(ctx, w, h);
        }

        // Export as JPEG, adjusting quality to stay under 1MB
        let quality = 0.82;
        let blob: Blob | null = null;

        const tryExport = () => {
          canvas.toBlob(
            (b) => {
              if (!b) {
                reject(new Error('Failed to export image'));
                return;
              }
              if (b.size > TARGET_BYTES && quality > 0.3) {
                quality -= 0.1;
                tryExport();
                return;
              }
              blob = b;
              // Trigger download
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const safeName = title.replace(/[^a-zA-Z0-9_-]/g, '_');
              a.download = `${safeName}_wildsaura.jpg`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              resolve();
            },
            'image/jpeg',
            quality,
          );
        };

        tryExport();
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
