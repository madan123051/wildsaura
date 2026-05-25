import { esc, injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { buildMetaTags, buildOgImageUrl, sanitizeSlug } from './og-shared.js';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';

async function getPhotoById(photoId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/photos/${encodeURIComponent(photoId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const doc = await res.json();
    const f = doc.fields || {};
    return {
      title: f.title?.stringValue || 'Wildlife Photo',
      caption: f.caption?.stringValue || '',
      imageUrl: f.imageUrl?.stringValue || '',
      category: f.category?.stringValue || 'wildlife',
      photographer: f.photographer?.stringValue || 'Madan Shrestha',
      location: f.location?.stringValue || '',
      animalName: f.animalName?.stringValue || '',
      slug: f.slug?.stringValue || photoId,
      updatedAt: doc.updateTime || '',
    };
  } catch { return null; }
}

function buildDescription(photo) {
  if (photo.caption) return photo.caption.slice(0, 200);
  return `${photo.animalName || 'Wildlife'} ${photo.category} photography by ${photo.photographer}${photo.location ? ` at ${photo.location}` : ''}.`.slice(0, 200);
}

export default async function handler(req, res) {
  const requestedSlug = sanitizeSlug(req.query.id || '');
  if (!requestedSlug) return res.redirect(302, SITE_URL);
  const baseHtml = readBaseHtml();
  const photo = await getPhotoById(requestedSlug);
  const pageUrl = `${SITE_URL}/photo/${encodeURIComponent(requestedSlug)}`;

  if (!photo) {
    const metaTags = buildMetaTags({ type: 'article', title: 'Wildlife Photo — WILDS AURA Photography', description: 'Explore wildlife photography on WILDS AURA.', pageUrl, ogImageUrl: `${SITE_URL}/photos/photo-wildlife.jpeg` });
    const injected = injectSeoHtml(baseHtml, metaTags);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(injected);
  }

  const canonicalSlug = sanitizeSlug(photo.slug || requestedSlug);
  const canonicalUrl = `${SITE_URL}/photo/${encodeURIComponent(canonicalSlug)}`;
  const ogImageUrl = buildOgImageUrl('photo', canonicalSlug, photo.updatedAt);
  const title = `${photo.title} — WILDS AURA Photography`;
  const description = buildDescription(photo);
  const metaTags = buildMetaTags({ type: 'article', title, description, pageUrl: canonicalUrl, ogImageUrl });
  const injected = injectSeoHtml(baseHtml, metaTags);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injected);
}
