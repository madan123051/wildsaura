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
 * Uses wsrv.nl image proxy CDN to resize ANY Firebase image
 * to a small, fast-loading OG-friendly size (1200x630, JPEG, <200KB).
 * 
 * This solves:
 * - Large thumbnails timing out on WhatsApp
 * - Missing thumbnailUrl field
 * - Firebase Storage token issues
 */
function getBestOgImage(photo) {
  const fallback = `${SITE_URL}/photos/photo-wildlife.jpeg`;
  
  // Get the source image URL (prefer thumbnail, then full image)
  let sourceUrl = photo.thumbnailUrl || photo.imageUrl || '';
  
  if (!sourceUrl) return fallback;
  
  // Ensure Firebase Storage URLs have alt=media for direct access
  if (sourceUrl.includes('firebasestorage.googleapis.com') && !sourceUrl.includes('alt=media')) {
    sourceUrl += (sourceUrl.includes('?') ? '&' : '?') + 'alt=media';
  }
  
  // Use wsrv.nl image proxy CDN to resize to OG-friendly dimensions
  // This ensures ALL images are small (<200KB), fast, and properly formatted
  // WhatsApp/Facebook/Twitter will always get a quick response
  try {
    const encoded = encodeURIComponent(sourceUrl);
    return `https://wsrv.nl/?url=${encoded}&w=1200&h=630&fit=cover&output=jpg&q=80&maxage=7d`;
  } catch {
    return sourceUrl; // fallback to direct URL if encoding fails
  }
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

  // Build meta tags to inject
  const metaTags = `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${esc(pageUrl)}">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="WILDS AURA Photography">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${esc(pageUrl)}">
    <meta property="og:image" content="${esc(ogImageUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:alt" content="${esc(photo.title)}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${esc(ogImageUrl)}">
    <meta name="twitter:image:alt" content="${esc(photo.title)}">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "name": photo.title,
      "description": description,
      "contentUrl": fullImageUrl,
      "thumbnailUrl": ogImageUrl,
      "url": pageUrl,
      "author": {
        "@type": "Person",
        "name": photo.photographer
      },
      ...(photo.location ? { "contentLocation": { "@type": "Place", "name": photo.location } } : {}),
      "publisher": {
        "@type": "Organization",
        "name": "WILDS AURA Photography",
        "url": SITE_URL
      }
    })}
    </script>
  `;

  // Inject meta tags into <head>
  const injectedHtml = baseHtml.replace('</head>', `${metaTags}\n</head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectedHtml);
}
