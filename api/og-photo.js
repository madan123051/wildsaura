/**
 * api/og-photo.js
 *
 * Serves /photo/:id for ALL visitors (bots + real users).
 * Reads the built dist/index.html, injects photo-specific meta tags,
 * and returns the full SPA with correct SEO metadata already in the HTML source.
 *
 * Google crawlers see: real <title>, <meta description>, OG tags, JSON-LD ImageObject schema.
 * Real users get: the full React SPA — photo modal auto-opens via URL routing in App.tsx.
 */

import fs from 'fs';
import path from 'path';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const SITE_URL = 'https://www.wildsaura.com';

async function getPhotoFromFirestore(photoId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/photos/${encodeURIComponent(photoId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields) return null;
    const f = doc.fields;
    return {
      title: f.title?.stringValue || 'Wildlife Photo',
      caption: f.caption?.stringValue || '',
      imageUrl: f.imageUrl?.stringValue || '',
      thumbnailUrl: f.thumbnailUrl?.stringValue || '',
      category: f.category?.stringValue || 'wildlife',
      photographer: f.photographer?.stringValue || 'Madan Shrestha',
      location: f.location?.stringValue || '',
      animalName: f.animalName?.stringValue || '',
      tags: f.tags?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [],
      published: f.published?.booleanValue !== false,
    };
  } catch (err) {
    console.error('Firestore fetch failed:', err);
    return null;
  }
}

/**
 * Pick the best OG image URL for social crawlers.
 * Priority:
 *   1. thumbnailUrl — smaller, loads faster for WhatsApp/Facebook/Twitter crawlers
 *   2. imageUrl — full resolution (may be slow for crawlers but works)
 *   3. Default wildlife photo fallback
 *
 * Also converts Firebase Storage URLs to direct download URLs
 * for better crawler compatibility.
 */
function getBestOgImage(photo) {
  const fallback = `${SITE_URL}/photos/photo-wildlife.jpeg`;
  
  // Prefer thumbnail for OG (smaller = faster for crawlers)
  let ogUrl = photo.thumbnailUrl || photo.imageUrl || fallback;
  
  // Ensure Firebase Storage URLs have alt=media for direct access
  if (ogUrl.includes('firebasestorage.googleapis.com') && !ogUrl.includes('alt=media')) {
    ogUrl += (ogUrl.includes('?') ? '&' : '?') + 'alt=media';
  }
  
  return ogUrl;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDescription(photo) {
  const parts = [];
  if (photo.caption) return photo.caption.slice(0, 200);
  if (photo.animalName) parts.push(photo.animalName);
  parts.push(`${photo.category.charAt(0).toUpperCase() + photo.category.slice(1)} photography`);
  if (photo.location) parts.push(`photographed at ${photo.location}`);
  parts.push(`by ${photo.photographer}`);
  parts.push('on WILDS AURA');
  return parts.join(' ').slice(0, 200);
}

export default async function handler(req, res) {
  const photoId = req.query.id;
  if (!photoId) {
    return res.redirect(302, SITE_URL);
  }

  // Read the built SPA HTML (bundled via includeFiles in vercel.json)
  let baseHtml = '';
  try {
    const htmlPath = path.join(process.cwd(), 'dist', 'index.html');
    baseHtml = fs.readFileSync(htmlPath, 'utf-8');
  } catch {
    // Fall back to a minimal redirect if build HTML not available (local dev)
    return res.redirect(302, `${SITE_URL}/?photo=${encodeURIComponent(photoId)}`);
  }

  // Fetch photo data from Firestore
  const photo = await getPhotoFromFirestore(photoId);

  if (!photo) {
    // Photo not found — serve the SPA anyway (it'll handle 404 gracefully)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(baseHtml);
  }

  const pageUrl = `${SITE_URL}/photo/${encodeURIComponent(photoId)}`;
  const title = `${photo.title} — WILDS AURA Photography`;
  const description = buildDescription(photo);
  const ogImageUrl = getBestOgImage(photo);
  const fullImageUrl = photo.imageUrl || ogImageUrl;
  const keywords = [photo.category, photo.animalName, photo.location, ...photo.tags]
    .filter(Boolean)
    .join(', ');

  // JSON-LD: ImageObject structured data (for Google Images indexing)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: photo.title,
    description: description,
    contentUrl: fullImageUrl,
    thumbnailUrl: ogImageUrl,
    url: pageUrl,
    representativeOfPage: true,
    author: { '@type': 'Person', name: photo.photographer },
    creator: { '@type': 'Person', name: photo.photographer },
    copyrightHolder: { '@type': 'Organization', name: 'WILDS AURA Photography', url: SITE_URL },
    license: `${SITE_URL}/terms`,
    acquireLicensePage: `${SITE_URL}/marketplace`,
    keywords: keywords || undefined,
    ...(photo.location
      ? { locationCreated: { '@type': 'Place', name: photo.location } }
      : {}),
    isPartOf: {
      '@type': 'ImageGallery',
      name: 'WILDS AURA Wildlife Photography Gallery',
      url: SITE_URL,
    },
  };

  // BreadcrumbList for better SERP display
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Photos', item: `${SITE_URL}/photos` },
      { '@type': 'ListItem', position: 3, name: photo.title, item: pageUrl },
    ],
  };

  const jsonLdBlock = `
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;

  // Replace static meta tags in index.html with photo-specific ones
  let html = baseHtml;

  // 1. Replace <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${esc(title)}</title>`,
  );

  // 2. Replace meta description
  html = html.replace(
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(description)}" />`,
  );

  // 3. Replace canonical URL
  html = html.replace(
    /<link\s+rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${esc(pageUrl)}" />`,
  );

  // 4. Replace OG tags — with additional image metadata for WhatsApp/Facebook
  html = html
    .replace(/<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="article" />`)
    .replace(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`)
    .replace(/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(ogImageUrl)}" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta property="og:image:type" content="image/jpeg" />`)
    .replace(/<meta\s+property="og:image:alt"[^>]*>/, `<meta property="og:image:alt" content="${esc(photo.title)}" />`)
    .replace(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(pageUrl)}" />`);

  // 5. Replace Twitter card tags — use summary_large_image for big photo preview
  html = html
    .replace(/<meta\s+name="twitter:card"[^>]*>/, `<meta name="twitter:card" content="summary_large_image" />`)
    .replace(/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`)
    .replace(/<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`)
    .replace(/<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(ogImageUrl)}" />`);

  // 6. Replace static JSON-LD and inject photo-specific structured data
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  html = html.replace('</head>', `${jsonLdBlock}\n</head>`);

  // Short cache for dynamic content (5 min CDN, revalidate in background)
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  return res.status(200).send(html);
}
