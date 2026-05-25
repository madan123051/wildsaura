import fs from 'fs';
import { buildMetaTags, buildOgImageUrl } from '../api/og-shared.js';

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const robots = fs.readFileSync('public/robots.txt', 'utf-8');
const sitemapFn = fs.readFileSync('api/sitemap.js', 'utf-8');
const seoRenderer = fs.readFileSync('api/seo-render.js', 'utf-8');
const indexHtml = fs.readFileSync('index.html', 'utf-8');

assert(/Sitemap:\s*https:\/\/www\.wildsaura\.com\/sitemap\.xml/.test(robots), 'robots.txt missing canonical sitemap declaration');
assert(/\/photo\//.test(sitemapFn), 'sitemap generator missing /photo/ urls');
assert(/\/story\//.test(sitemapFn), 'sitemap generator missing /story/ urls');
assert(/stripSeoTags/.test(seoRenderer), 'seo renderer missing tag de-duplication');
assert(!/property="og:image"/.test(indexHtml), 'base index.html should not contain og:image');

for (const route of [
  ['photo', 'sample-photo'],
  ['story', 'sample-story'],
  ['category', 'birds']
]) {
  const [type, slug] = route;
  const url = `https://www.wildsaura.com/${type}/${slug}`;
  const img = buildOgImageUrl(type, slug, '1');
  const tags = buildMetaTags({ type: 'article', title: 'T', description: 'D', pageUrl: url, ogImageUrl: img });
  assert((tags.match(/property="og:image"/g) || []).length === 1, `${type}: must contain exactly one og:image`);
  assert(/https:\/\//.test(img), `${type}: og:image must be absolute HTTPS URL`);
  assert(/og:image:width" content="1200"/.test(tags), `${type}: missing og:image:width 1200`);
  assert(/og:image:height" content="630"/.test(tags), `${type}: missing og:image:height 630`);
}

console.log('SEO validation checks passed.');
