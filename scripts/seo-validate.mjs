import fs from 'fs';

const robots = fs.readFileSync('public/robots.txt', 'utf-8');
const sitemapFn = fs.readFileSync('api/sitemap.xml.js', 'utf-8');
const photoHandler = fs.readFileSync('api/og-photo.js', 'utf-8');
const storyHandler = fs.readFileSync('api/og-story.js', 'utf-8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(/Allow:\s*\/photo\//.test(robots), 'robots.txt missing /photo/ allow');
assert(/Allow:\s*\//.test(robots), 'robots.txt missing broad allow');
assert(!/Disallow:\s*\/photo\//.test(robots), 'robots.txt blocks /photo/');
assert(/\/photo\//.test(sitemapFn), 'sitemap generator missing /photo/ urls');
assert(/<link rel="canonical"/.test(photoHandler), 'photo SSR missing canonical');
assert(/application\/ld\+json/.test(photoHandler), 'photo SSR missing JSON-LD');
assert(/twitter:card/.test(photoHandler), 'photo SSR missing twitter tags');
assert(/req\.query\.slug \|\| req\.query\.id/.test(storyHandler), 'story handler missing slug support');

console.log('SEO validation checks passed.');
