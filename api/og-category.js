import { injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { buildMetaTags, buildOgImageUrl, sanitizeSlug } from './og-shared.js';

export default async function handler(req, res) {
  const category = sanitizeSlug(req.query.slug || req.query.id || '');
  if (!category) return res.redirect(302, SITE_URL);

  const baseHtml = readBaseHtml();
  const pageUrl = `${SITE_URL}/category/${encodeURIComponent(category)}`;
  const title = `${category.charAt(0).toUpperCase() + category.slice(1)} Photos — WILDS AURA`;
  const description = `Explore ${category} wildlife photos and stories on WILDS AURA.`;
  const ogImageUrl = buildOgImageUrl('category', category, '1');

  const metaTags = buildMetaTags({ type: 'website', title, description, pageUrl, ogImageUrl });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectSeoHtml(baseHtml, metaTags));
}
