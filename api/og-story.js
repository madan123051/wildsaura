/**
 * api/og-story.js
 *
 * Serves /story/:slug for ALL visitors (bots + real users).
 * Reads built dist/index.html, injects story-specific meta tags, returns full SPA.
 *
 * Google crawlers see: real <title>, <meta description>, OG article tags,
 * JSON-LD Article schema. Users get the full SPA with story auto-loaded.
 */

import fs from 'fs';
import path from 'path';

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const SITE_URL = 'https://www.wildsaura.com';

async function getStoryBySlug(slug) {
  try {
    // Use Firestore REST runQuery to find story by slug field
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
    const body = JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'stories' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'slug' },
            op: 'EQUAL',
            value: { stringValue: slug },
          },
        },
        limit: 1,
      },
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) return null;
    const results = await res.json();
    const doc = results?.[0]?.document;
    if (!doc?.fields) return null;
    const f = doc.fields;
    return {
      title: f.title?.stringValue || 'Wildlife Story',
      excerpt: f.excerpt?.stringValue || '',
      content: f.content?.stringValue || '',
      coverImageUrl: f.coverImageUrl?.stringValue || `${SITE_URL}/photos/logo.png`,
      tags: f.tags?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [],
      photographer: f.photographer?.stringValue || 'Madan Shrestha',
      slug: f.slug?.stringValue || slug,
      createdAt: f.createdAt?.timestampValue || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Firestore story fetch failed:', err);
    return null;
  }
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) {
    return res.redirect(302, SITE_URL);
  }

  // Read the built SPA HTML
  let baseHtml = '';
  try {
    const htmlPath = path.join(process.cwd(), 'dist', 'index.html');
    baseHtml = fs.readFileSync(htmlPath, 'utf-8');
  } catch {
    return res.redirect(302, `${SITE_URL}/?story=${encodeURIComponent(slug)}`);
  }

  // Fetch story data
  const story = await getStoryBySlug(slug);

  if (!story) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(baseHtml);
  }

  const pageUrl = `${SITE_URL}/story/${encodeURIComponent(story.slug)}`;
  const title = `${story.title} — WILDS AURA`;
  const description = story.excerpt ||
    (story.content ? story.content.replace(/\n/g, ' ').slice(0, 160) + '...' : `Wildlife story by ${story.photographer} on WILDS AURA`);
  const imageUrl = story.coverImageUrl;

  // Estimate read time
  const wordCount = (story.content || '').split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // JSON-LD: Article structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: description,
    image: { '@type': 'ImageObject', url: imageUrl, representativeOfPage: true },
    url: pageUrl,
    author: { '@type': 'Person', name: story.photographer, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'WILDS AURA Photography',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/photos/logo.png` },
    },
    datePublished: story.createdAt,
    keywords: story.tags.join(', ') || undefined,
    timeRequired: `PT${readTime}M`,
    articleSection: 'Wildlife Photography',
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };

  // BreadcrumbList
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Stories', item: `${SITE_URL}/stories` },
      { '@type': 'ListItem', position: 3, name: story.title, item: pageUrl },
    ],
  };

  const jsonLdBlock = `
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;

  // Replace meta tags in index.html
  let html = baseHtml;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(description)}" />`,
  );
  html = html.replace(
    /<link\s+rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${esc(pageUrl)}" />`,
  );

  html = html
    .replace(/<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="article" />`)
    .replace(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`)
    .replace(/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(imageUrl)}" />`)
    .replace(/<meta\s+property="og:image:alt"[^>]*>/, `<meta property="og:image:alt" content="${esc(story.title)}" />`)
    .replace(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(pageUrl)}" />`);

  html = html
    .replace(/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`)
    .replace(/<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`)
    .replace(/<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(imageUrl)}" />`);

  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  html = html.replace('</head>', `${jsonLdBlock}\n</head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  return res.status(200).send(html);
}
