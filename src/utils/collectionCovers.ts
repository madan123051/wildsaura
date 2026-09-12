import type { Category } from '../types';

export const COLLECTIONS = [
  { key: 'wildlife', label: 'Wildlife', settingsKey: 'wildlife', galleryKey: 'wildlife' },
  { key: 'birds', label: 'Birds', settingsKey: 'birds', galleryKey: 'birds' },
  { key: 'macro', label: 'Macro', settingsKey: 'macro' },
  { key: 'domestic', label: 'Domestic Animals', settingsKey: 'domestic' },
  { key: 'landscape', label: 'Landscapes', settingsKey: 'landscape', galleryKey: 'landscapes' },
  { key: 'nature', label: 'Nature', settingsKey: 'nature' },
  { key: 'street', label: 'Street', settingsKey: 'street' },
  { key: 'other', label: 'Portraits', settingsKey: 'portraits', galleryKey: 'portraits' },
] as const;

interface CoverPhoto {
  category: string;
  imageUrl: string;
  thumbnailUrl?: string;
  published?: boolean;
  likeCount?: number;
  type?: string;
}

// Never use tags or the broad gallery "others" bucket as category evidence.
export function buildCollectionCovers(
  photos: CoverPhoto[],
  manual: Partial<Record<string, string>> = {},
  gallery: CoverPhoto[] = [],
): Category[] {
  return COLLECTIONS.map((collection) => {
    const matching = photos.filter((photo) => photo.category === collection.key &&
      photo.published !== false && photo.type !== 'video' && photo.imageUrl)
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    const galleryKey = 'galleryKey' in collection ? collection.galleryKey : undefined;
    const candidates = Array.from(new Set([
      manual[collection.settingsKey],
      ...matching.flatMap((photo) => [photo.thumbnailUrl, photo.imageUrl]),
      ...gallery.filter((photo) => galleryKey && photo.category === galleryKey &&
        photo.published !== false && photo.type !== 'video').map((photo) => photo.imageUrl),
    ].filter((url): url is string => Boolean(url?.trim()))));
    return { key: collection.key, label: collection.label, imageUrl: candidates[0] || '', fallbackImageUrls: candidates.slice(1) };
  });
}
