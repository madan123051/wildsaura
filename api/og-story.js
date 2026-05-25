/**
 * api/og-story.js
 *
 * Serves /story/:id with proper OG meta tags for social sharing.
 * Uses wsrv.nl image proxy CDN to ensure story cover images
 * are always small and fast-loading for WhatsApp/Facebook/Twitter.
 */

import { esc, injectSeoHtml, readBaseHtml, SITE_URL, defaultRobotsMeta } from './seo-render.js';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';

async function getStoryFromFirestore(storyId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/stories/${encodeURIComponent(storyId)}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields) return null;
    const f = doc.fields;
    return {
      title: f.title?.stringValue || 'Wildlife Story',
      excerpt: f.excerpt?.stringValue || f.content?.stringValue?.slice(0, 200) || '',
      coverImage: f.coverImage?.stringValue || '',
      thumbnailUrl: f.thumbnailUrl?.stringValue || '',
      author: f.author?.stringValue || 'Madan Shrestha',
      category: f.category?.stringValue || 'wildlife',
      publishedAt: f.publishedAt?.timestampValue || '',
      readTime: f.readTime?.integerValue || f.readTime?.stringValue || '5',
    };
  } catch (err) {
    console.error('Firestore fetch failed:', err);
    return null;
  }
}

/**
 * Use wsrv.nl image proxy CDN to resize story cover images
 * to OG-friendly size (1200x630, JPEG, <200KB).
 */
function getBestOgImage(story) {
  const fallback = `${SITE_URL}/photos/photo-wildlife.jpeg`;
  
  let sourceUrl = story.thumbnailUrl || story.coverImage || '';
  
  if (!sourceUrl) return fallback;
  
  // Ensure Firebase Storage URLs have alt=media
  if (sourceUrl.includes('firebasestorage.googleapis.com') && !sourceUrl.includes('alt=media')) {
    sourceUrl += (sourceUrl.includes('?') ? '&' : '?') + 'alt=media';
  }
  
  // Proxy through wsrv.nl for reliable, fast OG images
  try {
    const encoded = encodeURIComponent(sourceUrl);
    return `https://wsrv.nl/?url=${encoded}&w=1200&h=630&fit=cover&output=jpg&q=80&maxage=7d`;
  } catch {
    return sourceUrl;
  }
}

export default async function handler(req, res) {
  const storyId = req.query.slug || req.query.id;
  if (!storyId) {
    return res.redirect(302, SITE_URL);
  }

  let baseHtml = '';
  try {
    baseHtml = readBaseHtml();
  } catch {
    return res.redirect(302, `${SITE_URL}/?story=${encodeURIComponent(storyId)}`);
  }

  const story = await getStoryFromFirestore(storyId);

  if (!story) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(baseHtml);
  }

  const pageUrl = `${SITE_URL}/story/${encodeURIComponent(storyId)}`;
  const title = `${story.title} — WILDS AURA Stories`;
  const description = story.excerpt.slice(0, 200) || `${story.title} — A wildlife story by ${story.author}`;
  const ogImageUrl = getBestOgImage(story);

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
    <meta property="og:image:alt" content="${esc(story.title)}">
    ${story.publishedAt ? `<meta property="article:published_time" content="${esc(story.publishedAt)}">` : ''}
    <meta property="article:author" content="${esc(story.author)}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${esc(ogImageUrl)}">
    <meta name="twitter:image:alt" content="${esc(story.title)}">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": story.title,
      "description": description,
      "image": ogImageUrl,
      "url": pageUrl,
      "author": {
        "@type": "Person",
        "name": story.author
      },
      ...(story.publishedAt ? { "datePublished": story.publishedAt } : {}),
      "publisher": {
        "@type": "Organization",
        "name": "WILDS AURA Photography",
        "url": SITE_URL
      }
    })}
    </script>
  `;

  const visibleHtml = `
    <main>
      <article>
        <h1>${esc(story.title)}</h1>
        <img src="${esc(story.coverImage || ogImageUrl)}" alt="${esc(story.title)}" />
        <p>${esc(description)}</p>
        <a href="/stories">Browse all stories</a>
      </article>
    </main>
  `;
  const injectedHtml = injectSeoHtml(baseHtml, metaTags, visibleHtml);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectedHtml);
}
