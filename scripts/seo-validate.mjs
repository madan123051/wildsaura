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
const staticPageRenderer = fs.readFileSync('api/static-page.js', 'utf-8');
const indexHtml = fs.readFileSync('index.html', 'utf-8');
const appTsx = fs.readFileSync('src/App.tsx', 'utf-8');
const ogShared = fs.readFileSync('api/og-shared.js', 'utf-8');
const ogPhoto = fs.readFileSync('api/og-photo.js', 'utf-8');
const ogStory = fs.readFileSync('api/og-story.js', 'utf-8');
const vercelJson = fs.readFileSync('vercel.json', 'utf-8');
const vercelConfig = JSON.parse(vercelJson);

assert(/Sitemap:\s*https:\/\/www\.wildsaura\.com\/sitemap\.xml/.test(robots), 'robots.txt missing canonical sitemap declaration');
assert(/\/photo\//.test(sitemapFn), 'sitemap generator missing /photo/ urls');
assert(/\/story\//.test(sitemapFn), 'sitemap generator missing /story/ urls');
assert(/\/category\//.test(sitemapFn), 'sitemap generator missing /category/ urls');
assert(/isPublicWildsauraPhoto/.test(sitemapFn), 'sitemap must filter shared-database photos to public WildSaura records');
assert(/isPublicStory/.test(sitemapFn), 'sitemap must filter incomplete or private stories');
assert(/stripSeoTags/.test(seoRenderer), 'seo renderer missing tag de-duplication');
assert(/name="robots"/.test(seoRenderer), 'seo renderer must strip base robots tags before route injection');
assert(/PAGE_DEFINITIONS/.test(staticPageRenderer), 'static page SEO renderer missing page definitions');
assert(/About WILDS AURA/.test(staticPageRenderer), 'static page SEO renderer missing about page metadata');
assert(/Wildlife Photo Gallery/.test(staticPageRenderer), 'static page SEO renderer missing photo gallery metadata');
assert(!/property="og:/.test(indexHtml), 'base index.html must not contain OG meta tags');
assert(!/twitter:card/.test(indexHtml), 'base index.html must not contain twitter OG tags');
assert(!/updatePhotoMeta\(|updateStoryMeta\(|resetMeta\(/.test(appTsx), 'client runtime SEO mutations must be disabled');
assert(/matchesPhotoRoute/.test(appTsx), 'client must resolve photo deep links by slug, Firestore ID, or numeric ID');
assert(/href: '\/photos'/.test(appTsx) || /href: '\/photos'/.test(fs.readFileSync('src/components/Header.tsx', 'utf-8')), 'header must expose crawlable /photos link');
assert(/photos\/photo-wildlife\.jpeg/.test(ogShared), 'default OG fallback must be /photos/photo-wildlife.jpeg');
assert(/buildNoindexMetaTags/.test(ogShared), 'shared OG helper must support noindex fallback pages');
assert(!/sanitizeSlug\(req\.query\.id/.test(ogPhoto), 'photo renderer must preserve mixed-case Firestore IDs before lookup');
assert(!/sanitizeSlug\(req\.query\.slug/.test(ogStory), 'story renderer must preserve mixed-case Firestore IDs before lookup');
assert(/status\(404\)/.test(ogPhoto), 'photo renderer must return 404 for unavailable photos');
assert(/status\(404\)/.test(ogStory), 'story renderer must return 404 for unavailable stories');
assert(/"source": "\/photo\/:id"/.test(vercelJson), 'vercel rewrite missing /photo/:id');
assert(/"source": "\/story\/:slug"/.test(vercelJson), 'vercel rewrite missing /story/:slug');
assert(/"source": "\/category\/:slug"/.test(vercelJson), 'vercel rewrite missing /category/:slug');
assert(!vercelConfig.redirects?.some((r) => r.source === '/:path*' && String(r.destination).includes('www.wildsaura.com')), 'domain-level www redirects should stay in Vercel domain settings, not app routes');
assert(vercelConfig.rewrites?.some((r) => r.source === '/about' && r.destination.includes('/api/static-page')), 'vercel rewrite missing static page SEO renderer for /about');
assert(vercelConfig.rewrites?.some((r) => r.source === '/photos' && r.destination.includes('/api/static-page')), 'vercel rewrite missing static page SEO renderer for /photos');

for (const [type, slug] of [['photo', 'sample-photo'], ['story', 'sample-story'], ['category', 'birds']]) {
  const sanitizedSlug = sanitizeSlug(slug);
  const pageUrl = `https://www.wildsaura.com/${type}/${sanitizedSlug}`;
  const img = buildOgImageUrl(type, sanitizedSlug, '1');
  const tags = buildMetaTags({ type: type === 'category' ? 'website' : 'article', title: 'T', description: 'D', pageUrl, ogImageUrl: img });
  validateOgImageUrl(img, type);
  validateMetaHtml(tags, type);
}

console.log('SEO validation checks passed.');
