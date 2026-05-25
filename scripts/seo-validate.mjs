import fs from 'fs';

const robots = fs.readFileSync('public/robots.txt', 'utf-8');
const sitemapFn = fs.readFileSync('api/sitemap.js', 'utf-8');
const photoHandler = fs.readFileSync('api/og-photo.js', 'utf-8');
const storyHandler = fs.readFileSync('api/og-story.js', 'utf-8');
const seoRenderer = fs.readFileSync('api/seo-render.js', 'utf-8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(/Sitemap:\s*https:\/\/www\.wildsaura\.com\/sitemap\.xml/.test(robots), 'robots.txt missing canonical sitemap declaration');
assert(/\/photo\//.test(sitemapFn), 'sitemap generator missing /photo/ urls');
assert(/\/story\//.test(sitemapFn), 'sitemap generator missing /story/ urls');
assert(!fs.existsSync('api/sitemap.xml.js'), 'duplicate sitemap generator api/sitemap.xml.js should not exist');
assert(!fs.existsSync('public/sitemap.xml'), 'static sitemap file should not exist');
assert(/<link rel="canonical"/.test(photoHandler), 'photo SSR missing canonical');
assert(/<link rel="canonical"/.test(storyHandler), 'story SSR missing canonical');
assert(/stripSeoTags/.test(seoRenderer), 'seo renderer missing tag de-duplication');
assert(/application\/ld\+json/.test(photoHandler), 'photo SSR missing JSON-LD');

console.log('SEO validation checks passed.');
