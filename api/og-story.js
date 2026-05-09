import fs from 'node:fs';
import path from 'node:path';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const SITE_URL = 'https://www.wildsaura.com';

function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function getStoryBySlug(slug) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/stories?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const docs = data.documents || [];
  const match = docs.find((d) => d.fields?.slug?.stringValue === slug);
  if (!match) return null;
  const f = match.fields;
  return {
    title: f.title?.stringValue || 'Story',
    excerpt: f.excerpt?.stringValue || '',
    coverImageUrl: f.coverImageUrl?.stringValue || `${SITE_URL}/photos/logo.png`,
  };
}

function loadHtml() {
  const dist = path.join(process.cwd(), 'dist', 'index.html');
  const root = path.join(process.cwd(), 'index.html');
  return fs.readFileSync(fs.existsSync(dist) ? dist : root, 'utf8');
}

function inject(html, { title, description, imageUrl, canonicalUrl, jsonLd }) {
  const tags = `<title>${escapeHtml(title)}</title>\n<meta name="description" content="${escapeHtml(description)}" />\n<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n<meta property="og:type" content="article" />\n<meta property="og:title" content="${escapeHtml(title)}" />\n<meta property="og:description" content="${escapeHtml(description)}" />\n<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${escapeHtml(title)}" />\n<meta name="twitter:description" content="${escapeHtml(description)}" />\n<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />\n<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
  return html.replace(/<head[^>]*>/i, (m) => `${m}\n${tags}\n`);
}

export default async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) return res.status(404).send('Not found');
  const story = await getStoryBySlug(slug);
  if (!story) return res.status(404).send('Story not found');

  const title = `${story.title} — WILDS AURA Stories`;
  const description = story.excerpt || 'Read photography stories on WildSaura.';
  const canonicalUrl = `${SITE_URL}/story/${encodeURIComponent(slug)}`;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: story.title, description, image: story.coverImageUrl, url: canonicalUrl };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(inject(loadHtml(), { title, description, imageUrl: story.coverImageUrl, canonicalUrl, jsonLd }));
}
