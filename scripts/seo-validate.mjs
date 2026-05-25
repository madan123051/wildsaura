import fs from 'fs';
import { buildMetaTags, buildOgImageUrl, sanitizeSlug } from '../api/og-shared.js';

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function count(haystack, pattern) {
  return (haystack.match(pattern) || []).length;
}

function validateMetaHtml(tags, routeLabel) {
  assert(count(tags, /property="og:image"/g) === 1, `${routeLabel}: must contain exactly one og:image`);
  assert(count(tags, /property="og:title"/g) === 1, `${routeLabel}: must contain exactly one og:title`);
  assert(count(tags, /property="og:description"/g) === 1, `${routeLabel}: must contain exactly one og:description`);
  assert(count(tags, /property="og:url"/g) === 1, `${routeLabel}: must contain exactly one og:url`);
  assert(count(tags, /name="twitter:card"/g) === 1, `${routeLabel}: must contain exactly one twitter:card`);
  assert(/name="twitter:card" content="summary_large_image"/.test(tags), `${routeLabel}: twitter:card must be summary_large_image`);
  assert(/og:image:width" content="1200"/.test(tags), `${routeLabel}: missing og:image:width 1200`);
  assert(/og:image:height" content="630"/.test(tags), `${routeLabel}: missing og:image:height 630`);
}

function validateOgImageUrl(url, routeLabel) {
  assert(/^https:\/\//.test(url), `${routeLabel}: og:image must be absolute https URL`);
  assert(!url.includes('firestore.googleapis.com'), `${routeLabel}: og:image must not use Firestore URL`);
}

const robots = fs.readFileSync('public/robots.txt', 'utf-8');
const sitemapFn = fs.readFileSync('api/sitemap.js', 'utf-8');
const seoRenderer = fs.readFileSync('api/seo-render.js', 'utf-8');
const indexHtml = fs.readFileSync('index.html', 'utf-8');
const appTsx = fs.readFileSync('src/App.tsx', 'utf-8');
const ogShared = fs.readFileSync('api/og-shared.js', 'utf-8');
const vercelJson = fs.readFileSync('vercel.json', 'utf-8');

assert(/Sitemap:\s*https:\/\/www\.wildsaura\.com\/sitemap\.xml/.test(robots), 'robots.txt missing canonical sitemap declaration');
assert(/\/photo\//.test(sitemapFn), 'sitemap generator missing /photo/ urls');
assert(/\/story\//.test(sitemapFn), 'sitemap generator missing /story/ urls');
assert(/\/category\//.test(sitemapFn), 'sitemap generator missing /category/ urls');
assert(/stripSeoTags/.test(seoRenderer), 'seo renderer missing tag de-duplication');
assert(!/property="og:/.test(indexHtml), 'base index.html must not contain OG meta tags');
assert(!/twitter:card/.test(indexHtml), 'base index.html must not contain twitter OG tags');
assert(!/updatePhotoMeta\(|updateStoryMeta\(|resetMeta\(/.test(appTsx), 'client runtime SEO mutations must be disabled');
assert(/photos\/photo-wildlife\.jpeg/.test(ogShared), 'default OG fallback must use existing static image path');
assert(/"source": "\/photo\/:id"/.test(vercelJson), 'vercel rewrite missing /photo/:id');
assert(/"source": "\/story\/:slug"/.test(vercelJson), 'vercel rewrite missing /story/:slug');
assert(/"source": "\/category\/:slug"/.test(vercelJson), 'vercel rewrite missing /category/:slug');

for (const [type, slug] of [['photo', 'sample-photo'], ['story', 'sample-story'], ['category', 'birds']]) {
  const sanitizedSlug = sanitizeSlug(slug);
  const pageUrl = `https://www.wildsaura.com/${type}/${sanitizedSlug}`;
  const img = buildOgImageUrl(type, sanitizedSlug, '1');
  const tags = buildMetaTags({ type: type === 'category' ? 'website' : 'article', title: 'T', description: 'D', pageUrl, ogImageUrl: img });
  validateOgImageUrl(img, type);
  validateMetaHtml(tags, type);
}

console.log('SEO validation checks passed.');
