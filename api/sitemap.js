const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const SITE_URL = 'https://www.wildsaura.com';
const PAGE_SIZE = 1000;

async function listCollection(collectionId) {
  const docs = [];
  let pageToken = '';
  do {
    const url =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}` +
      `?key=${FIREBASE_API_KEY}&pageSize=${PAGE_SIZE}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (data.documents) docs.push(...data.documents);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

const esc = (str = '') => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const strField = (doc, key) => doc.fields?.[key]?.stringValue || '';
const boolField = (doc, key, fallback = true) => {
  const v = doc.fields?.[key]?.booleanValue;
  return v === undefined ? fallback : v;
};

function canonicalPhotoSlug(doc) {
  const slug = strField(doc, 'slug').trim();
  if (slug) return slug;
  const id = doc.name?.split('/').pop() || '';
  return id;
}

function canonicalStorySlug(doc) {
  const slug = strField(doc, 'slug').trim();
  if (slug) return slug;
  const id = doc.name?.split('/').pop() || '';
  return id;
}

function isoDate(doc) {
  const ts = doc.updateTime || doc.createTime;
  return ts ? ts.split('T')[0] : new Date().toISOString().split('T')[0];
}

export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0];
  const [photoDocs, storyDocs] = await Promise.allSettled([
    listCollection('photos'),
    listCollection('stories'),
  ]);

  const photos = photoDocs.status === 'fulfilled' ? photoDocs.value : [];
  const stories = storyDocs.status === 'fulfilled' ? storyDocs.value : [];

  const staticPages = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${SITE_URL}/photos`, changefreq: 'daily', priority: '0.9', lastmod: today },
    { loc: `${SITE_URL}/story-grid`, changefreq: 'weekly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/community`, changefreq: 'weekly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/terms`, changefreq: 'monthly', priority: '0.4', lastmod: today },
  ];

  const urls = [];
  for (const page of staticPages) {
    urls.push(`  <url>\n    <loc>${esc(page.loc)}</loc>\n    <lastmod>${page.lastmod}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`);
  }

  for (const doc of photos) {
    if (boolField(doc, 'published', true) === false) continue;
    const slug = canonicalPhotoSlug(doc);
    if (!slug) continue;
    const photoLoc = `${SITE_URL}/photo/${encodeURIComponent(slug)}`;
    const title = strField(doc, 'title') || 'Wildlife Photo';
    const caption = strField(doc, 'caption');
    const imageUrl = strField(doc, 'imageUrl') || strField(doc, 'thumbnailUrl');
    const imageBlock = imageUrl
      ? `\n    <image:image>\n      <image:loc>${esc(imageUrl)}</image:loc>\n      <image:title>${esc(title)}</image:title>${caption ? `\n      <image:caption>${esc(caption)}</image:caption>` : ''}\n    </image:image>`
      : '';

    urls.push(`  <url>\n    <loc>${esc(photoLoc)}</loc>\n    <lastmod>${isoDate(doc)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>${imageBlock}\n  </url>`);
  }

  for (const doc of stories) {
    if (boolField(doc, 'published', true) === false) continue;
    const slug = canonicalStorySlug(doc);
    if (!slug) continue;
    urls.push(`  <url>\n    <loc>${esc(`${SITE_URL}/story/${encodeURIComponent(slug)}`)}</loc>\n    <lastmod>${isoDate(doc)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600');
  return res.status(200).send(xml);
}
