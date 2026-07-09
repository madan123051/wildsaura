import { SITE_URL, esc } from './seo-render.js';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/photos/photo-wildlife.jpeg`;
export const IMAGE_LICENSE_URL = `${SITE_URL}/terms`;
export const IMAGE_ACQUIRE_LICENSE_URL = `${SITE_URL}/contact`;

export function buildImageLicenseMetadata(creatorName = 'Madan Shrestha') {
  const creditName = String(creatorName || '').trim() || 'Madan Shrestha';
  return {
    license: IMAGE_LICENSE_URL,
    acquireLicensePage: IMAGE_ACQUIRE_LICENSE_URL,
    creditText: `${creditName} / WILDS AURA Photography`,
    copyrightNotice: `Copyright ${creditName} / WILDS AURA Photography`,
  };
}

export function isPublicHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function publicMediaUrl(value, fallback = DEFAULT_OG_IMAGE) {
  return isPublicHttpUrl(value) ? String(value) : fallback;
}

export function sanitizeSlug(raw) {
  return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function buildOgImageUrl(type, slug, version = '') {
  const cacheKey = [sanitizeSlug(type), sanitizeSlug(slug), version].filter(Boolean).join('-');
  return cacheKey ? `${DEFAULT_OG_IMAGE}?v=${encodeURIComponent(cacheKey)}` : DEFAULT_OG_IMAGE;
}

export function buildMetaTags({ type = 'article', title, description, pageUrl, ogImageUrl }) {
  const img = ogImageUrl || DEFAULT_OG_IMAGE;
  return `
    <title>${esc(title)}</title>
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${esc(pageUrl)}">
    <meta property="og:type" content="${esc(type)}">
    <meta property="og:site_name" content="WILDS AURA Photography">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${esc(pageUrl)}">
    <meta property="og:image" content="${esc(img)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${esc(img)}">
  `;
}

export function buildNoindexMetaTags({ title, description, pageUrl, ogImageUrl }) {
  const img = ogImageUrl || DEFAULT_OG_IMAGE;
  return `
    <title>${esc(title)}</title>
    <meta name="robots" content="noindex,nofollow">
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${esc(pageUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="WILDS AURA Photography">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${esc(pageUrl)}">
    <meta property="og:image" content="${esc(img)}">
  `;
}

export function buildJsonLdScript(data) {
  const removeEmpty = (value) => {
    if (Array.isArray(value)) return value.map(removeEmpty).filter((item) => item !== undefined);
    if (value && typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([key, val]) => [key, removeEmpty(val)])
        .filter(([, val]) => val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0));
      return Object.fromEntries(entries);
    }
    return value === undefined || value === null ? undefined : value;
  };
  return `
    <script type="application/ld+json">${JSON.stringify(removeEmpty(data)).replace(/</g, '\u003c')}</script>`;
}
