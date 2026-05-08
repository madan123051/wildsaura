import fs from 'node:fs';
import path from 'node:path';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const SITE_URL = 'https://www.wildsaura.com';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getPhotoFromFirestore(photoId) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/photos/${photoId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const doc = await res.json();
  if (!doc.fields) return null;
  const f = doc.fields;
  return {
    title: f.title?.stringValue || 'Wildlife Photo',
    caption: f.caption?.stringValue || 'Explore stunning wildlife photography on WildSaura',
    imageUrl: f.imageUrl?.stringValue || `${SITE_URL}/photos/logo.png`,
    category: f.category?.stringValue || 'Wildlife',
    photographer: f.photographer?.stringValue || 'Madan Shrestha',
    location: f.location?.stringValue || '',
  };
}

function injectMeta(html, { title, description, imageUrl, canonicalUrl, jsonLd }) {
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="WILDS AURA Photography" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join('\n');
  return html.replace(/<head[^>]*>/i, (m) => `${m}\n${tags}\n`);
}

function loadIndexHtml() {
  const distPath = path.join(process.cwd(), 'dist', 'index.html');
  const rootPath = path.join(process.cwd(), 'index.html');
  if (fs.existsSync(distPath)) return fs.readFileSync(distPath, 'utf8');
  return fs.readFileSync(rootPath, 'utf8');
}

export default async function handler(req, res) {
  const photoId = req.query.id;
  if (!photoId) return res.status(404).send('Not found');

  const photo = await getPhotoFromFirestore(photoId);
  if (!photo) return res.status(404).send('Photo not found');

  const title = `${photo.title} — WILDS AURA Photography`;
  const description = `${photo.caption}${photo.location ? ` 📍 ${photo.location}` : ''}`;
  const canonicalUrl = `${SITE_URL}/photo/${encodeURIComponent(photoId)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: photo.title,
    description,
    contentUrl: photo.imageUrl,
    creator: photo.photographer,
    keywords: photo.category,
    url: canonicalUrl,
  };

  const html = injectMeta(loadIndexHtml(), { title, description, imageUrl: photo.imageUrl, canonicalUrl, jsonLd });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800');
  return res.status(200).send(html);
}
