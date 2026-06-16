export interface OptimizedImageOptions {
  width: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'inside' | 'outside';
  quality?: number;
  maxAge?: string;
}

const LOCAL_PREFIXES = ['/photos/', '/images/', 'data:', 'blob:'];

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

export function getOptimizedImageUrl(url: string | undefined | null, options: OptimizedImageOptions): string {
  if (!url) return '';
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
  if (!url || !shouldProxy(url)) return undefined;

  return widths
    .map((width) => `${getOptimizedImageUrl(url, { ...options, width })} ${width}w`)
    .join(', ');
}
