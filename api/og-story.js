import { injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { buildMetaTags, buildOgImageUrl, sanitizeSlug } from './og-shared.js';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';

async function getStory(storyId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/stories/${encodeURIComponent(storyId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const doc = await res.json();
    const f = doc.fields || {};
    return { title: f.title?.stringValue || 'Wildlife Story', excerpt: f.excerpt?.stringValue || '', author: f.author?.stringValue || 'Madan Shrestha', slug: f.slug?.stringValue || storyId, updatedAt: doc.updateTime || '' };
  } catch { return null; }
}

export default async function handler(req, res) {
  const storyId = sanitizeSlug(req.query.slug || req.query.id || '');
  if (!storyId) return res.redirect(302, SITE_URL);
  const pageUrl = `${SITE_URL}/story/${encodeURIComponent(storyId)}`;
  const baseHtml = readBaseHtml();
  const story = await getStory(storyId);
  const ogImageFromSlug = buildOgImageUrl('story', storyId, '1');

  if (!story) {
    const metaTags = buildMetaTags({ type: 'article', title: 'Wildlife Story — WILDS AURA Stories', description: 'Read wildlife stories on WILDS AURA.', pageUrl, ogImageUrl: ogImageFromSlug });
    return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(injectSeoHtml(baseHtml, metaTags));
  }

  const slug = sanitizeSlug(story.slug || storyId);
  const ogImageUrl = buildOgImageUrl('story', slug, story.updatedAt || '1');
  const title = `${story.title} — WILDS AURA Stories`;
  const description = (story.excerpt || `${story.title} by ${story.author}`).slice(0, 200);
  const metaTags = buildMetaTags({ type: 'article', title, description, pageUrl: `${SITE_URL}/story/${encodeURIComponent(slug)}`, ogImageUrl });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectSeoHtml(baseHtml, metaTags));
}
