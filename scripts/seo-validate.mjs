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
const ogPhoto = fs.readFileSync('api/og-photo.js', 'utf-8');
const ogStory = fs.readFileSync('api/og-story.js', 'utf-8');
const ogVideo = fs.readFileSync('api/og-video.js', 'utf-8');
const vercelJson = fs.readFileSync('vercel.json', 'utf-8');
const packageJson = fs.readFileSync('package.json', 'utf-8');
const staticPageGenerator = fs.readFileSync('scripts/generate-static-pages.mjs', 'utf-8');
const vercelConfig = JSON.parse(vercelJson);

assert(/Sitemap:\s*https:\/\/www\.wildsaura\.com\/sitemap\.xml/.test(robots), 'robots.txt missing canonical sitemap declaration');
assert(/\/photo\//.test(sitemapFn), 'sitemap generator missing /photo/ urls');
assert(/\/story\//.test(sitemapFn), 'sitemap generator missing /story/ urls');
assert(/\/video\//.test(sitemapFn), 'sitemap generator missing /video/ urls');
assert(/xmlns:video=/.test(sitemapFn), 'sitemap generator missing video namespace');
assert(/video:content_loc/.test(sitemapFn), 'sitemap generator missing video content URLs');
assert(/\/category\//.test(sitemapFn), 'sitemap generator missing /category/ urls');
assert(/isPublicWildsauraPhoto/.test(sitemapFn), 'sitemap must filter shared-database photos to public WildSaura records');
assert(/isPublicStory/.test(sitemapFn), 'sitemap must filter incomplete or private stories');
assert(/stripSeoTags/.test(seoRenderer), 'seo renderer missing tag de-duplication');
assert(/name="robots"/.test(seoRenderer), 'seo renderer must strip base robots tags before route injection');
assert(seoRenderer.includes('/<div\\s+id='), 'seo renderer must replace populated build-time root content on dynamic routes');
assert(/generate-static-pages\.mjs/.test(packageJson), 'build script must generate static SEO pages after Vite build');
assert(/PAGE_DEFINITIONS/.test(staticPageGenerator), 'static page generator missing page definitions');
assert(/About WILDS AURA/.test(staticPageGenerator), 'static page generator missing about page metadata');
assert(/Wildlife Photo Gallery/.test(staticPageGenerator), 'static page generator missing photo gallery metadata');
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
assert(/VideoObject/.test(ogVideo), 'video renderer missing VideoObject structured data');
assert(/status\(404\)/.test(ogVideo), 'video renderer must return 404 for unavailable videos');
assert(!/cdn\.wildsaura\.com/.test(ogShared), 'SEO images must not point to the unavailable cdn.wildsaura.com host');
assert(/"source": "\/photo\/:id"/.test(vercelJson), 'vercel rewrite missing /photo/:id');
assert(/"source": "\/story\/:slug"/.test(vercelJson), 'vercel rewrite missing /story/:slug');
assert(/"source": "\/video\/:id"/.test(vercelJson), 'vercel rewrite missing /video/:id');
assert(/"source": "\/category\/:slug"/.test(vercelJson), 'vercel rewrite missing /category/:slug');
assert(!/api\/static-page/.test(vercelJson), 'static SEO pages should be generated at build time, not deployed as an extra function');
assert(!vercelConfig.redirects?.some((r) => r.source === '/:path*' && String(r.destination).includes('www.wildsaura.com')), 'domain-level www redirects should stay in Vercel domain settings, not app routes');

for (const [type, slug] of [['photo', 'sample-photo'], ['story', 'sample-story'], ['category', 'birds']]) {
  const sanitizedSlug = sanitizeSlug(slug);
  const pageUrl = `https://www.wildsaura.com/${type}/${sanitizedSlug}`;
  const img = buildOgImageUrl(type, sanitizedSlug, '1');
  const tags = buildMetaTags({ type: type === 'category' ? 'website' : 'article', title: 'T', description: 'D', pageUrl, ogImageUrl: img });
  validateOgImageUrl(img, type);
  validateMetaHtml(tags, type);
}

console.log('SEO validation checks passed.');
