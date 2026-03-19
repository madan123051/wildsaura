/**
 * Download a photo with optional watermark and 1MB size limit.
 * IMPORTANT: If applyWatermark is true, we NEVER skip the watermark.
 * The old fallback (direct link download) bypassed the watermark — now fixed.
 */

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const text = 'WILDS AURA';
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(width, height) * 0.06}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const angle = -Math.PI / 6;
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

  ctx.globalAlpha = 0.35;
  ctx.font = `bold ${Math.max(width, height) * 0.1}px sans-serif`;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

async function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  // For data URLs, load directly without CORS
  if (imageUrl.startsWith('data:')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load data URL image'));
      img.src = imageUrl;
    });
  }

  // For external URLs, try fetch+blob approach (avoids CORS canvas tainting)
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to load blob image'));
      };
      img.src = blobUrl;
    });
  } catch {
    // Fallback: try with crossOrigin
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }
}

export async function downloadPhoto(
  imageUrl: string,
  title: string,
  applyWatermark: boolean,
): Promise<void> {
  try {
    const img = await loadImage(imageUrl);
    
    const canvas = document.createElement('canvas');
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;

    // Resize if needed to keep under ~1MB
    const TARGET_BYTES = 1_000_000;
    const bytesPerPixel = 0.8;
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
    return new Promise((resolve, reject) => {
      let quality = 0.82;
      
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
            const url = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = url;
            const safeName = title.replace(/[^a-zA-Z0-9_-]/g, '_');
            a.download = `${safeName}_wildsaura.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          },
          'image/jpeg',
          quality,
        );
      };

      tryExport();
    });
  } catch (err) {
    console.warn('Canvas download failed:', err instanceof Error ? err.message : 'unknown');

    // FIXED: If watermark is required, do NOT allow non-watermarked download
    if (applyWatermark) {
      alert('⚠️ Download failed — watermark could not be applied. Please try again or contact support.');
      throw err;
    }

    // Only allow direct download if watermark is NOT required (first 2 free downloads)
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_wildsaura.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
