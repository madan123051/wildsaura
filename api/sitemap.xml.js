const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const SITE_URL = 'https://www.wildsaura.com';

async function fetchCollection(name) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${name}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents || [];
}

export default async function handler(req, res) {
  const [photos, stories] = await Promise.all([fetchCollection('photos'), fetchCollection('stories')]);

  const staticUrls = ['/', '/photos', '/stories', '/marketplace', '/ngo', '/about', '/contact'];
  const urls = [
    ...staticUrls.map((u) => `<url><loc>${SITE_URL}${u}</loc></url>`),
    ...photos.map((p) => {
      const id = p.name?.split('/').pop();
      const img = p.fields?.imageUrl?.stringValue;
      return `<url><loc>${SITE_URL}/photo/${encodeURIComponent(id)}</loc>${img ? `<image:image><image:loc>${img}</image:loc></image:image>` : ''}</url>`;
    }),
    ...stories.map((s) => {
      const slug = s.fields?.slug?.stringValue;
      return slug ? `<url><loc>${SITE_URL}/story/${encodeURIComponent(slug)}</loc></url>` : '';
    }),
  ].filter(Boolean).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`;
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
}
