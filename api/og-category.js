import { esc, injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { buildJsonLdScript, buildMetaTags, buildOgImageUrl, sanitizeSlug } from './og-shared.js';

const CATEGORY_COPY = {
  wildlife: {
    label: 'Wildlife',
    title: 'Wildlife Photography - WILDS AURA',
    description: 'Explore wildlife photography by Madan Shrestha, featuring animals, field encounters, and nature stories from Nepal, Japan, and beyond.',
  },
  birds: {
    label: 'Bird',
    title: 'Bird Photography - WILDS AURA',
    description: 'Explore bird photography on WILDS AURA, including sparrows, doves, starlings, garden birds, and field observations by Madan Shrestha.',
  },
  macro: {
    label: 'Macro',
    title: 'Macro Nature Photography - WILDS AURA',
    description: 'Explore macro nature photography with flowers, insects, textures, and small details from the natural world.',
  },
  domestic: {
    label: 'Domestic Animal',
    title: 'Domestic Animal Photography - WILDS AURA',
    description: 'Explore domestic animal photography and quiet everyday animal portraits from WILDS AURA.',
  },
  landscape: {
    label: 'Landscape',
    title: 'Landscape Photography - WILDS AURA',
    description: 'Explore landscape photography from mountains, valleys, gardens, coastlines, and city-edge nature scenes.',
  },
  nature: {
    label: 'Nature',
    title: 'Nature Photography - WILDS AURA',
    description: 'Explore nature photography with flowers, trees, seasons, insects, birds, and peaceful outdoor scenes.',
  },
  street: {
    label: 'Street',
    title: 'Street Photography - WILDS AURA',
    description: 'Explore street photography and urban nature moments captured through the WILDS AURA lens.',
  },
  other: {
    label: 'Portrait',
    title: 'Portrait Photography - WILDS AURA',
    description: 'Explore portrait photography and human stories alongside the WILDS AURA wildlife and nature archive.',
  },
};

function categoryMeta(category) {
  return CATEGORY_COPY[category] || {
    label: category.charAt(0).toUpperCase() + category.slice(1),
    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Photography - WILDS AURA`,
    description: `Explore ${category} photography and visual stories on WILDS AURA.`,
  };
}

export default async function handler(req, res) {
  const category = sanitizeSlug(req.query.slug || req.query.id || '');
  if (!category) return res.redirect(302, SITE_URL);

  const baseHtml = readBaseHtml();
  const pageUrl = `${SITE_URL}/category/${encodeURIComponent(category)}`;
  const meta = categoryMeta(category);
  const title = meta.title;
  const description = meta.description;
  const ogImageUrl = buildOgImageUrl('category', category, '1');
  const jsonLd = buildJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${meta.label} Photography`,
    description,
    url: pageUrl,
    image: ogImageUrl,
    creator: { '@type': 'Person', name: 'Madan Shrestha', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'WILDS AURA Photography',
      url: SITE_URL,
      logo: `${SITE_URL}/photos/logo.png`,
    },
    about: { '@type': 'Thing', name: `${meta.label} photography` },
  });
  const visibleContent = `<main><article><h1>${esc(meta.label)} Photography</h1><p>${esc(description)}</p><p>Browse ${esc(meta.label.toLowerCase())} photos, stories, and visual field notes from WILDS AURA.</p></article></main>`;

  const metaTags = buildMetaTags({ type: 'website', title, description, pageUrl, ogImageUrl }) + jsonLd;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectSeoHtml(baseHtml, metaTags, visibleContent));
}
