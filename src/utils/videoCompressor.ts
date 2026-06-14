export interface VideoCompressionResult {
  file: File;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  message: string;
}

const MB = 1024 * 1024;

function supportsMediaRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined' && (
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ||
    MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ||
    MediaRecorder.isTypeSupported('video/webm')
  );
}

function bestMimeType(): string {
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
  return 'video/webm';
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => resolve({ video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video metadata.'));
    };
  });
}

export async function compressVideoForUpload(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<VideoCompressionResult> {
  const originalSize = file.size;
  const originalMB = originalSize / MB;
  const targetMaxMB = 15;

  if (originalMB <= targetMaxMB) {
    onProgress?.(25);
    return {
      file,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
      message: `Video already optimized (${originalMB.toFixed(1)}MB).`,
    };
  }

  if (!supportsMediaRecorder()) {
    onProgress?.(10);
    return {
      file,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
      message: 'Browser video compression is not supported here, uploaded original file.',
    };
  }

  const { video, url } = await loadVideo(file);
  try {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 30;
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth || 1280, video.videoHeight || 720));
    const width = Math.max(2, Math.round((video.videoWidth || 1280) * scale / 2) * 2);
    const height = Math.max(2, Math.round((video.videoHeight || 720) * scale / 2) * 2);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.captureStream) throw new Error('Canvas video compression is not available.');

    const stream = canvas.captureStream(24);
    const sourceStream: MediaStream | undefined = typeof (video as any).captureStream === 'function'
      ? (video as any).captureStream()
      : undefined;
    sourceStream?.getAudioTracks().forEach((track) => stream.addTrack(track));
    const mimeType = bestMimeType();
    const targetBits = targetMaxMB * MB * 8 * 0.9;
    const videoBitsPerSecond = Math.max(850_000, Math.min(3_500_000, Math.floor(targetBits / duration)));
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    const chunks: BlobPart[] = [];

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error('Video compression failed.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    });

    const draw = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, width, height);
        onProgress?.(Math.min(35, Math.round((video.currentTime / duration) * 35)));
        requestAnimationFrame(draw);
      }
    };

    recorder.start(1000);
    await video.play();
    draw();
    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });
    recorder.stop();
    const compressedBlob = await done;

    if (!compressedBlob.size || compressedBlob.size >= originalSize) {
      return {
        file,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        message: 'Compression did not reduce size, uploaded original file.',
      };
    }

    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.[^.]+$/, '') + '.webm',
      { type: 'video/webm' },
    );

    return {
      file: compressedFile,
      compressed: true,
      originalSize,
      compressedSize: compressedFile.size,
      message: `Video compressed ${originalMB.toFixed(1)}MB to ${(compressedFile.size / MB).toFixed(1)}MB WebM.`,
    };
  } finally {
    video.pause();
    URL.revokeObjectURL(url);
  }
}
