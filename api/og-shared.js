import { SITE_URL, esc } from './seo-render.js';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/photos/photo-wildlife.jpeg`;
const OG_CDN_BASE = 'https://cdn.wildsaura.com/og';

export function sanitizeSlug(raw) {
  return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function buildOgImageUrl(type, slug, version = '') {
  const safeType = sanitizeSlug(type) || 'photo';
  const safeSlug = sanitizeSlug(slug);
  if (!safeSlug) return DEFAULT_OG_IMAGE;
  const base = `${OG_CDN_BASE}/${safeType}/${encodeURIComponent(safeSlug)}.jpg`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
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
