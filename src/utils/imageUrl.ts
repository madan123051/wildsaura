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

function shouldProxy(url: string): boolean {
  if (!url) return false;
  if (url.includes('wsrv.nl')) return false;
  return !LOCAL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function withFirebaseMediaParam(url: string): string {
  if (!url.includes('firebasestorage.googleapis.com') || url.includes('alt=media')) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}alt=media`;
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
  if (url.startsWith('data:')) return PLACEHOLDER_CARD;
  if (url.startsWith(LOCAL_PHOTO_PREFIX)) {
    return getLocalOptimizedPath(url, options.width) || url;
  }
  if (!shouldProxy(url)) return url;

  const sourceUrl = withFirebaseMediaParam(url);
  const params = new URLSearchParams({
    url: sourceUrl,
    w: String(options.width),
    fit: options.fit ?? 'cover',
    output: 'webp',
    q: String(options.quality ?? 72),
    maxage: options.maxAge ?? '30d',
  });

  if (options.height) params.set('h', String(options.height));

  return `https://wsrv.nl/?${params.toString()}`;
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

  if (!shouldProxy(url)) return undefined;

  return widths
    .map((width) => `${getOptimizedImageUrl(url, { ...options, width })} ${width}w`)
    .join(', ');
}
