import { LOCAL_IMAGE_VARIANTS } from './localImageManifest';

export interface OptimizedImageOptions {
  width: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'inside' | 'outside';
  quality?: number;
  maxAge?: string;
}

const LOCAL_PREFIXES = ['/photos/', '/images/', 'data:', 'blob:'];
const LOCAL_PHOTO_PREFIX = '/photos/';
const PLACEHOLDER_CARD = '/images/placeholder-card.svg';

/**
 * Vercel's first-party image optimization endpoint.
 * Replaces the third-party wsrv.nl proxy, which was the main bottleneck for
 * gallery photos: free tier rate limits, cold-cache fetches of multi-MB
 * originals, and a single point of failure made photos slow (or blank).
 * Docs: https://vercel.com/docs/image-optimization
 */
const VERCEL_IMAGE_ENDPOINT = '/_vercel/image';

function shouldProxy(url: string): boolean {
  if (!url) return false;
  if (url.includes(VERCEL_IMAGE_ENDPOINT)) return false;
  return !LOCAL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function getDirectImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (!url.includes('firebasestorage.googleapis.com') || url.includes('alt=media')) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}alt=media`;
}

function isFirebaseThumbnail(url: string): boolean {
  if (!url.includes('firebasestorage.googleapis.com')) return false;
  try {
    const decoded = decodeURIComponent(url).toLowerCase();
    return decoded.includes('/photos-thumbs/') || decoded.includes('/video-thumbnails/');
  } catch {
    const normalized = url.toLowerCase();
    return normalized.includes('photos-thumbs') || normalized.includes('video-thumbnails');
  }
}

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0];
}

function getLocalOptimizedVariant(url: string, width: number): { path: string; width: number } | null {
  const cleanUrl = stripQuery(url);
  const widths = LOCAL_IMAGE_VARIANTS[cleanUrl];
  if (!widths?.length) return null;

  const selectedWidth = widths.find((candidate) => candidate >= width) ?? widths[widths.length - 1];
  const fileName = cleanUrl.slice(LOCAL_PHOTO_PREFIX.length).toLowerCase().replace(/\./g, '-');
  return { path: `${LOCAL_PHOTO_PREFIX}optimized/${fileName}-${selectedWidth}.webp`, width: selectedWidth };
}

function getLocalOptimizedPath(url: string, width: number): string {
  return getLocalOptimizedVariant(url, width)?.path || '';
}

export function getOptimizedImageUrl(url: string | undefined | null, options: OptimizedImageOptions): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith(LOCAL_PHOTO_PREFIX)) {
    return getLocalOptimizedPath(url, options.width) || url;
  }
  if (isFirebaseThumbnail(url)) return getDirectImageUrl(url);
  if (!shouldProxy(url)) return getDirectImageUrl(url);

  const sourceUrl = getDirectImageUrl(url);
  // URLSearchParams percent-encodes the nested URL automatically.
  const params = new URLSearchParams({
    url: sourceUrl,
    w: String(options.width),
    q: String(options.quality ?? 75),
  });

  return `${VERCEL_IMAGE_ENDPOINT}?${params.toString()}`;
}

export function getOptimizedSrcSet(
  url: string | undefined | null,
  widths: number[],
  options: Omit<OptimizedImageOptions, 'width'> = {},
): string | undefined {
  if (!url) return undefined;

  if (url.startsWith(LOCAL_PHOTO_PREFIX)) {
    const seen = new Set<number>();
    const entries: string[] = [];
    widths.forEach((width) => {
      const optimized = getLocalOptimizedVariant(url, width);
      if (!optimized || seen.has(optimized.width)) return;
      seen.add(optimized.width);
      entries.push(`${optimized.path} ${optimized.width}w`);
    });
    return entries.length ? entries.join(', ') : undefined;
  }

  if (!shouldProxy(url) || isFirebaseThumbnail(url)) return undefined;

  return widths
    .map((width) => `${getOptimizedImageUrl(url, { ...options, width })} ${width}w`)
    .join(', ');
}
