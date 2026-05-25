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

import { esc, injectSeoHtml, readBaseHtml, SITE_URL, defaultRobotsMeta } from './seo-render.js';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';

async function getPhotoById(photoId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/photos/${encodeURIComponent(photoId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    if (!res.ok) {
      console.error(`Firestore fetch failed: ${res.status} ${res.statusText} for photoId: ${photoId}`);
      return null;
    }
    const doc = await res.json();
    if (!doc.fields) {
      console.error(`No fields in Firestore doc for photoId: ${photoId}`);
      return null;
    }
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
      slug: f.slug?.stringValue || photoId,
    };
  } catch (err) {
    console.error('Firestore fetch error:', err?.message || err);
    return null;
  }
}

/**
 * Pick the best OG image URL for social crawlers.
 * Uses wsrv.nl image proxy CDN to resize ANY Firebase image
 * to a small, fast-loading OG-friendly size (1200x630, JPEG, <200KB).
 * 
 * This solves:
 * - Large thumbnails timing out on WhatsApp (3s crawler limit)
 * - Missing thumbnailUrl field
 * - Firebase Storage token issues
 */
function getBestOgImage(photo) {
  const fallback = `${SITE_URL}/photos/photo-wildlife.jpeg`;
  
  // Get the source image URL (prefer thumbnail for speed, then full image)
  let sourceUrl = '';
  
  // Try thumbnailUrl first (smaller, loads faster)
  if (photo.thumbnailUrl && photo.thumbnailUrl.startsWith('http')) {
    sourceUrl = photo.thumbnailUrl;
  }
  // Fallback to full imageUrl
  else if (photo.imageUrl && photo.imageUrl.startsWith('http')) {
    sourceUrl = photo.imageUrl;
  }
  
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
  const requestedSlug = String(req.query.id || "").trim();
  if (!requestedSlug) {
    return res.redirect(302, SITE_URL);
  }

  // Read the built SPA HTML (bundled via includeFiles in vercel.json)
  let baseHtml = '';
  try {
    baseHtml = readBaseHtml();
  } catch (err) {
    console.error('Failed to read dist/index.html:', err?.message);
    // Fall back to a minimal redirect if build HTML not available
    return res.redirect(302, `${SITE_URL}/photo/${encodeURIComponent(requestedSlug)}`);
  }

  // Fetch photo data from Firestore
  const photo = await getPhotoById(requestedSlug);

  if (!photo) {
    const pageUrl = `${SITE_URL}/photo/${encodeURIComponent(requestedSlug)}`;
    const genericMeta = `
    <title>Wildlife Photo — WILDS AURA Photography</title>
    ${defaultRobotsMeta()}
    <meta name="description" content="Explore wildlife photography on WILDS AURA.">
    <link rel="canonical" href="${esc(pageUrl)}">
    <meta property="og:title" content="Wildlife Photo — WILDS AURA Photography">
    <meta property="og:description" content="Explore wildlife photography on WILDS AURA.">
    <meta property="og:url" content="${esc(pageUrl)}">
    <meta property="og:image" content="${SITE_URL}/photos/photo-wildlife.jpeg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Wildlife Photo — WILDS AURA Photography">
    `;
    const visibleHtml = `
      <main><article><h1>Wildlife Photo</h1><img src="${SITE_URL}/photos/photo-wildlife.jpeg" alt="Wildlife Photo" /><p>This photo page is temporarily unavailable, but you can browse the complete collection below.</p><p><a href="/photos">Browse all photos</a></p><p><a href="/">Return to homepage</a></p></article></main>`;
    const injected = injectSeoHtml(baseHtml, genericMeta, visibleHtml);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(injected);
  }

  const canonicalSlug = (photo?.slug || requestedSlug || "").trim();
  const pageUrl = `${SITE_URL}/photo/${encodeURIComponent(canonicalSlug)}`;
  const title = `${photo.title} — WILDS AURA Photography`;
  const description = buildDescription(photo);
  const ogImageUrl = getBestOgImage(photo);
  const fullImageUrl = photo.imageUrl || ogImageUrl;

  // Build meta tags to inject
  // IMPORTANT: Remove any existing OG/Twitter tags from base HTML to prevent duplicates

  const metaTags = `
    <title>${esc(title)}</title>
    ${defaultRobotsMeta()}
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
  const visibleHtml = `
    <main>
      <article>
        <h1>${esc(photo.title)}</h1>
        <img src="${esc(fullImageUrl)}" alt="${esc(photo.title)}" />
        <p>${esc(description)}</p>
        <a href="/photos">Browse all photos</a>
      </article>
    </main>
  `;
  const injectedHtml = injectSeoHtml(baseHtml, metaTags, visibleHtml);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectedHtml);
}
