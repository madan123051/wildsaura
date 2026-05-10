/**
 * src/utils/seo.ts
 *
 * Dynamically updates <title>, <meta>, <link rel="canonical">, and JSON-LD
 * structured data as users navigate the SPA (photo modal open/close, story open/close).
 *
 * The server (api/og-photo.js, api/og-story.js) already injects correct meta on
 * initial page load. These helpers keep meta in sync when the user navigates within
 * the SPA without a full page reload.
 */

const SITE_URL = 'https://www.wildsaura.com';

const DEFAULT_TITLE = 'WILDS AURA — Wildlife & Nature Photography | Madan Shrestha';
const DEFAULT_DESCRIPTION =
  'WILDS AURA — Stunning wildlife & nature photography by Madan Shrestha. Explore breathtaking photos of wild animals, birds, landscapes, and untold stories from the wild.';
const DEFAULT_IMAGE = `${SITE_URL}/photos/logo.png`;

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function setMetaName(name: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaProperty(property: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url: string): void {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function upsertJsonLd(id: string, data: Record<string, unknown>): void {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function removeJsonLd(id: string): void {
  document.getElementById(id)?.remove();
}

function applyCoreMeta(title: string, description: string, image: string, url: string): void {
  document.title = title;
  setMetaName('description', description);
  setCanonical(url);

  setMetaProperty('og:title', title);
  setMetaProperty('og:description', description);
  setMetaProperty('og:image', image);
  setMetaProperty('og:url', url);

  setMetaName('twitter:title', title);
  setMetaName('twitter:description', description);
  setMetaName('twitter:image', image);
}

// ─── Public API ───────────────────────────────────────────────────────────────

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

/** Call when a photo modal opens or a photo page loads in the SPA. */
export function updatePhotoMeta(photo: PhotoSeoData): void {
  const photoId = photo.firestoreId || String(photo.id ?? '');
  if (!photoId) return;

  const pageUrl = `${SITE_URL}/photo/${encodeURIComponent(photoId)}`;
  const title = `${photo.title} — WILDS AURA Photography`;

  const descParts: string[] = [];
  if (photo.caption) {
    descParts.push(photo.caption);
  } else {
    if (photo.animalName) descParts.push(photo.animalName);
    descParts.push(
      `${photo.category.charAt(0).toUpperCase() + photo.category.slice(1)} photography`,
    );
    if (photo.location) descParts.push(`photographed at ${photo.location}`);
    descParts.push(`by ${photo.photographer || 'Madan Shrestha'}`);
  }
  const description = descParts.join(' ');

  const imageUrl = photo.imageUrl || DEFAULT_IMAGE;
  applyCoreMeta(title, description, imageUrl, pageUrl);
  setMetaProperty('og:type', 'article');

  const keywords = [
    photo.category,
    photo.animalName,
    photo.location,
    ...(photo.tags ?? []),
  ]
    .filter(Boolean)
    .join(', ');

  upsertJsonLd('seo-photo-schema', {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: photo.title,
    description,
    contentUrl: imageUrl,
    url: pageUrl,
    representativeOfPage: true,
    author: { '@type': 'Person', name: photo.photographer || 'Madan Shrestha' },
    creator: { '@type': 'Person', name: photo.photographer || 'Madan Shrestha' },
    copyrightHolder: { '@type': 'Organization', name: 'WILDS AURA Photography', url: SITE_URL },
    license: `${SITE_URL}/terms`,
    keywords: keywords || undefined,
    ...(photo.location
      ? { locationCreated: { '@type': 'Place', name: photo.location } }
      : {}),
    isPartOf: {
      '@type': 'ImageGallery',
      name: 'WILDS AURA Wildlife Photography Gallery',
      url: SITE_URL,
    },
  });

  upsertJsonLd('seo-breadcrumb-schema', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Photos', item: `${SITE_URL}/photos` },
      { '@type': 'ListItem', position: 3, name: photo.title, item: pageUrl },
    ],
  });
}

/** Call when a story page loads in the SPA. */
export function updateStoryMeta(story: StorySeoData): void {
  const pageUrl = `${SITE_URL}/story/${encodeURIComponent(story.slug)}`;
  const title = `${story.title} — WILDS AURA`;

  const description =
    story.excerpt ||
    (story.content
      ? story.content.replace(/\n/g, ' ').slice(0, 160) + (story.content.length > 160 ? '...' : '')
      : `Wildlife story by ${story.photographer || 'Madan Shrestha'} on WILDS AURA`);

  const imageUrl = story.coverImageUrl || DEFAULT_IMAGE;
  applyCoreMeta(title, description, imageUrl, pageUrl);
  setMetaProperty('og:type', 'article');

  const wordCount = (story.content || '').split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  upsertJsonLd('seo-story-schema', {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description,
    image: { '@type': 'ImageObject', url: imageUrl, representativeOfPage: true },
    url: pageUrl,
    author: { '@type': 'Person', name: story.photographer || 'Madan Shrestha', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'WILDS AURA Photography',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/photos/logo.png` },
    },
    datePublished: story.createdAt || undefined,
    keywords: (story.tags ?? []).join(', ') || undefined,
    timeRequired: `PT${readTime}M`,
    articleSection: 'Wildlife Photography',
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  });

  upsertJsonLd('seo-breadcrumb-schema', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Stories', item: `${SITE_URL}/stories` },
      { '@type': 'ListItem', position: 3, name: story.title, item: pageUrl },
    ],
  });
}

/** Call when a photo modal closes or user navigates back to home. */
export function resetMeta(): void {
  applyCoreMeta(DEFAULT_TITLE, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, SITE_URL);
  setMetaProperty('og:type', 'website');
  removeJsonLd('seo-photo-schema');
  removeJsonLd('seo-story-schema');
  removeJsonLd('seo-breadcrumb-schema');
}
