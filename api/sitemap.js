/**
 * api/sitemap.js
 *
 * Generates a fully dynamic XML sitemap including:
 * - All static pages (home, photos, stories, community, about, etc.)
 * - All published photos with <image:image> extensions (for Google Images)
 * - All published stories
 * - All videos with <video:video> extensions (for Google Video)
 *
 * Accessible at /sitemap.xml via vercel.json rewrite.
 * Cached for 1 hour to avoid hammering Firestore on every crawl.
 */

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

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function docId(doc) {
  return doc.name?.split('/').pop() || '';
}

function strField(doc, key) {
  return doc.fields?.[key]?.stringValue || '';
}

function boolField(doc, key, fallback = true) {
  const v = doc.fields?.[key]?.booleanValue;
  return v === undefined ? fallback : v;
}

function isoDate(doc) {
  const ts = doc.updateTime || doc.createTime;
  if (ts) return ts.split('T')[0];
  return new Date().toISOString().split('T')[0];
}

export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0];

  // Fetch photos, stories, and videos in parallel
  const [photoDocs, storyDocs, videoDocs] = await Promise.allSettled([
    listCollection('photos'),
    listCollection('stories'),
    listCollection('videos'),
  ]);

  const photos = photoDocs.status === 'fulfilled' ? photoDocs.value : [];
  const stories = storyDocs.status === 'fulfilled' ? storyDocs.value : [];
  const videos = videoDocs.status === 'fulfilled' ? videoDocs.value : [];

  // Static pages — all with lastmod
  const staticPages = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${SITE_URL}/photos`, changefreq: 'daily', priority: '0.9', lastmod: today },
    { loc: `${SITE_URL}/stories`, changefreq: 'weekly', priority: '0.8', lastmod: today },
    { loc: `${SITE_URL}/community`, changefreq: 'daily', priority: '0.8', lastmod: today },
    { loc: `${SITE_URL}/marketplace`, changefreq: 'weekly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/ngo`, changefreq: 'monthly', priority: '0.7', lastmod: today },
    { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/terms`, changefreq: 'monthly', priority: '0.4', lastmod: today },
  ];

  const urlEntries = [];

  // Add static pages
  for (const page of staticPages) {
    urlEntries.push(
      `  <url>\n` +
      `    <loc>${esc(page.loc)}</loc>\n` +
      `    <lastmod>${page.lastmod}</lastmod>\n` +
      `    <changefreq>${page.changefreq}</changefreq>\n` +
      `    <priority>${page.priority}</priority>\n` +
      `  </url>`,
    );
  }

  // Add photo pages with image extensions
  for (const doc of photos) {
    const id = docId(doc);
    const slug = strField(doc, 'slug');
    if (!id || !slug) continue;
    if (boolField(doc, 'published', true) === false) continue;

    const title = strField(doc, 'title') || 'Wildlife Photo';
    const imageUrl = strField(doc, 'imageUrl');
    const location = strField(doc, 'location');
    const caption = strField(doc, 'caption');
    const photoLoc = `${SITE_URL}/photo/${encodeURIComponent(slug)}`;
    const lastmod = isoDate(doc);

    let imageBlock = '';
    if (imageUrl) {
      imageBlock =
        `    <image:image>\n` +
        `      <image:loc>${esc(imageUrl)}</image:loc>\n` +
        `      <image:title>${esc(title)}</image:title>\n` +
        (caption ? `      <image:caption>${esc(caption)}</image:caption>\n` : '') +
        (location ? `      <image:geo_location>${esc(location)}</image:geo_location>\n` : '') +
        `      <image:license>${esc(`${SITE_URL}/terms`)}</image:license>\n` +
        `    </image:image>\n`;
    }

    urlEntries.push(
      `  <url>\n` +
      `    <loc>${esc(photoLoc)}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n` +
      `    <priority>0.8</priority>\n` +
      imageBlock +
      `  </url>`,
    );
  }

  // Add story pages
  for (const doc of stories) {
    const slug = strField(doc, 'slug');
    if (!slug) continue;
    const lastmod = isoDate(doc);
    const title = strField(doc, 'title');
    const coverImage = strField(doc, 'coverImageUrl');
    const storyLoc = `${SITE_URL}/story/${encodeURIComponent(slug)}`;

    let imageBlock = '';
    if (coverImage) {
      imageBlock =
        `    <image:image>\n` +
        `      <image:loc>${esc(coverImage)}</image:loc>\n` +
        `      <image:title>${esc(title || 'Story Cover')}</image:title>\n` +
        `    </image:image>\n`;
    }

    urlEntries.push(
      `  <url>\n` +
      `    <loc>${esc(storyLoc)}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n` +
      `    <priority>0.8</priority>\n` +
      imageBlock +
      `  </url>`,
    );
  }

  // Add video pages (if they have individual URLs in the future)
  // For now, list them as part of the homepage with video extensions
  for (const doc of videos) {
    const id = docId(doc);
    if (!id) continue;
    const title = strField(doc, 'title') || 'Wildlife Video';
    const thumbnailUrl = strField(doc, 'thumbnailUrl');
    const videoUrl = strField(doc, 'videoUrl');
    const description = strField(doc, 'description') || title;
    const lastmod = isoDate(doc);

    if (videoUrl && thumbnailUrl) {
      urlEntries.push(
        `  <url>\n` +
        `    <loc>${esc(`${SITE_URL}/`)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <video:video>\n` +
        `      <video:thumbnail_loc>${esc(thumbnailUrl)}</video:thumbnail_loc>\n` +
        `      <video:title>${esc(title)}</video:title>\n` +
        `      <video:description>${esc(description)}</video:description>\n` +
        `      <video:content_loc>${esc(videoUrl)}</video:content_loc>\n` +
        `    </video:video>\n` +
        `  </url>`,
      );
    }
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset`,
    `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`,
    `  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`,
    ...urlEntries,
    `</urlset>`,
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600');
  return res.status(200).send(xml);
}
