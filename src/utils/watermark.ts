// Watermark utility — adds ©WILDSAURA PHOTOGRAPHY to bottom-right of images
// Works with both data URLs and blob URLs

export async function applyWatermark(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Calculate watermark size based on image dimensions
      const minDim = Math.min(img.width, img.height);
      const fontSize = Math.max(12, Math.round(minDim * 0.028));
      const padding = Math.round(fontSize * 0.8);

      // Watermark text
      const line1 = '©  WILDSAURA';
      const line2 = 'PHOTOGRAPHY';

      ctx.font = `bold ${fontSize}px "Cinzel", "Georgia", serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      const line1Width = ctx.measureText(line1).width;
      ctx.font = `${Math.round(fontSize * 0.55)}px "Cinzel", "Georgia", serif`;
      const line2Width = ctx.measureText(line2).width;
      const maxTextWidth = Math.max(line1Width, line2Width);

      // Position — bottom-right
      const x = img.width - padding;
      const y = img.height - padding;

      // Semi-transparent background behind watermark
      const bgPadding = Math.round(fontSize * 0.4);
      const bgHeight = fontSize * 2 + bgPadding * 2;
      const bgWidth = maxTextWidth + bgPadding * 2;
      const bgX = x - maxTextWidth - bgPadding;
      const bgY = y - fontSize * 2 - bgPadding;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      roundRect(ctx, bgX, bgY, bgWidth, bgHeight, 6);
      ctx.fill();

      // Gold border around background
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.5)';
      ctx.lineWidth = 1;
      roundRect(ctx, bgX, bgY, bgWidth, bgHeight, 6);
      ctx.stroke();

      // Draw watermark text — line 1 (©WILDSAURA)
      ctx.font = `bold ${fontSize}px "Cinzel", "Georgia", serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      // Text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(line1, x + 1, y - fontSize * 0.6 + 1);

      // Gold text
      ctx.fillStyle = 'rgba(201, 168, 76, 0.9)';
      ctx.fillText(line1, x, y - fontSize * 0.6);

      // Draw watermark text — line 2 (PHOTOGRAPHY)
      ctx.font = `${Math.round(fontSize * 0.55)}px "Cinzel", "Georgia", serif`;

      // Text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(line2, x + 1, y + 1);

      // Gold text  
      ctx.fillStyle = 'rgba(201, 168, 76, 0.7)';
      ctx.fillText(line2, x, y);

      // Convert to compact WebP for preview/fallback uploads.
      const watermarked = canvas.toDataURL('image/webp', 0.82);
      resolve(watermarked);
    };

    img.onerror = () => {
      // If watermark fails, return original
      console.warn('Watermark failed, returning original image');
      resolve(imageDataUrl);
    };

    img.src = imageDataUrl;
  });
}

/**
 * Bakes a small ©WILDSAURA watermark directly into a File/Blob.
 * This watermark is PERMANENT — it becomes part of the image pixels.
 * Used BEFORE uploading to Firebase Storage so even direct URL access shows the watermark.
 * 
 * Output: adaptive WebP, targeting <= 1MB after the watermark is baked in.
 */
export async function bakeWatermarkOnFile(file: File | Blob): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_UPLOAD_DIM = 2560;
      const TARGET_BYTES = 1024 * 1024;
      const scale = Math.min(1, MAX_UPLOAD_DIM / Math.max(img.width, img.height));
      const canvasW = Math.round(img.width * scale);
      const canvasH = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      // Draw original image
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvasW, canvasH);

      // Calculate watermark size based on image dimensions
      const minDim = Math.min(canvasW, canvasH);
      const fontSize = Math.max(14, Math.round(minDim * 0.022));
      const padding = Math.round(fontSize * 1.0);

      // Watermark text
      const line1 = '©  WILDSAURA';
      const line2 = 'PHOTOGRAPHY';

      ctx.font = `bold ${fontSize}px "Cinzel", "Georgia", serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      const line1Width = ctx.measureText(line1).width;
      ctx.font = `${Math.round(fontSize * 0.55)}px "Cinzel", "Georgia", serif`;
      const line2Width = ctx.measureText(line2).width;
      const maxTextWidth = Math.max(line1Width, line2Width);

      // Position — bottom-right corner
      const x = canvasW - padding;
      const y = canvasH - padding;

      // Semi-transparent background behind watermark
      const bgPadding = Math.round(fontSize * 0.4);
      const bgHeight = fontSize * 2 + bgPadding * 2;
      const bgWidth = maxTextWidth + bgPadding * 2;
      const bgX = x - maxTextWidth - bgPadding;
      const bgY = y - fontSize * 2 - bgPadding;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      roundRect(ctx, bgX, bgY, bgWidth, bgHeight, 6);
      ctx.fill();

      // Gold border
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.5)';
      ctx.lineWidth = 1;
      roundRect(ctx, bgX, bgY, bgWidth, bgHeight, 6);
      ctx.stroke();

      // Line 1: ©WILDSAURA
      ctx.font = `bold ${fontSize}px "Cinzel", "Georgia", serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(line1, x + 1, y - fontSize * 0.6 + 1);
      ctx.fillStyle = 'rgba(201, 168, 76, 0.9)';
      ctx.fillText(line1, x, y - fontSize * 0.6);

      // Line 2: PHOTOGRAPHY
      ctx.font = `${Math.round(fontSize * 0.55)}px "Cinzel", "Georgia", serif`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(line2, x + 1, y + 1);
      ctx.fillStyle = 'rgba(201, 168, 76, 0.7)';
      ctx.fillText(line2, x, y);

      const toWebP = (targetCanvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
        new Promise((res) => targetCanvas.toBlob((blob) => res(blob), 'image/webp', quality));

      const makeFile = (blob: Blob) => {
        const name = (file instanceof File ? file.name : 'photo').replace(/\.[^.]+$/, '') + '.webp';
        const watermarkedFile = new File([blob], name, { type: 'image/webp' });
        console.log(`🔒 Watermark baked: ${(watermarkedFile.size / 1024 / 1024).toFixed(2)}MB`);
        return watermarkedFile;
      };

      (async () => {
        let lastBlob: Blob | null = null;
        for (const quality of [0.86, 0.80, 0.74, 0.68, 0.62, 0.56]) {
          lastBlob = await toWebP(canvas, quality);
          if (lastBlob && lastBlob.size <= TARGET_BYTES) {
            resolve(makeFile(lastBlob));
            return;
          }
        }

        let sourceCanvas = canvas;
        for (const maxDim of [2048, 1600, 1280]) {
          if (Math.max(sourceCanvas.width, sourceCanvas.height) <= maxDim) continue;
          const smallScale = maxDim / Math.max(sourceCanvas.width, sourceCanvas.height);
          const smaller = document.createElement('canvas');
          smaller.width = Math.round(sourceCanvas.width * smallScale);
          smaller.height = Math.round(sourceCanvas.height * smallScale);
          const smallerCtx = smaller.getContext('2d');
          if (!smallerCtx) continue;
          smallerCtx.imageSmoothingEnabled = true;
          smallerCtx.imageSmoothingQuality = 'high';
          smallerCtx.drawImage(sourceCanvas, 0, 0, smaller.width, smaller.height);
          sourceCanvas = smaller;

          for (const quality of [0.78, 0.70, 0.62, 0.54]) {
            lastBlob = await toWebP(sourceCanvas, quality);
            if (lastBlob && lastBlob.size <= TARGET_BYTES) {
              resolve(makeFile(lastBlob));
              return;
            }
          }
        }

        if (!lastBlob) { reject(new Error('Canvas toBlob failed')); return; }
        resolve(makeFile(lastBlob));
      })().catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.warn('🔒 Watermark bake failed, returning original file');
      // Return original file if watermark fails
      const name = (file instanceof File) ? file.name : 'photo.webp';
      resolve(new File([file], name, { type: file.type || 'image/webp' }));
    };

    img.src = url;
  });
}

// Helper: draw rounded rectangle
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Apply watermark overlay to displayed images (CSS-based for existing content)
export function getWatermarkOverlayStyle(): React.CSSProperties {
  return {
    position: 'relative' as const,
  };
}

export function getWatermarkBadgeStyle(): React.CSSProperties {
  return {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
    padding: '3px 8px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(201, 168, 76, 0.4)',
    borderRadius: '4px',
    color: 'rgba(201, 168, 76, 0.8)',
    fontSize: '0.55rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    fontFamily: '"Cinzel", "Georgia", serif',
    pointerEvents: 'none' as const,
    zIndex: 2,
    whiteSpace: 'nowrap' as const,
  };
}
