/**
 * Client SEO mutations intentionally disabled.
 * Server-rendered API responses are the single source of truth for crawlable SEO.
 */

export interface PhotoSeoData {
  title: string;
  caption?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: string;
  photographer?: string;
  location?: string;
  tags?: string[];
  animalName?: string;
  firestoreId?: string;
  id?: number | string;
}

export interface StorySeoData {
  title: string;
  excerpt?: string;
  content?: string;
  coverImageUrl: string;
  tags?: string[];
  photographer?: string;
  slug: string;
  createdAt?: string;
}

export function updatePhotoMeta(_photo: PhotoSeoData): void {}
export function updateStoryMeta(_story: StorySeoData): void {}
export function resetMeta(): void {}
