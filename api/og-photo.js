import { esc, injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { arrayField, getDocumentByIdOrSlug, strField } from './firestore-seo.js';
import { buildJsonLdScript, buildMetaTags, buildOgImageUrl, sanitizeSlug } from './og-shared.js';

async function getPhotoById(photoId) {
  try {
    const doc = await getDocumentByIdOrSlug('photos', photoId);
    if (!doc) return null;
    return {
      title: strField(doc, 'title') || 'Wildlife Photo',
      caption: strField(doc, 'caption'),
      imageUrl: strField(doc, 'imageUrl'),
      thumbnailUrl: strField(doc, 'thumbnailUrl'),
      category: strField(doc, 'category') || 'wildlife',
      photographer: strField(doc, 'photographer') || 'Madan Shrestha',
      location: strField(doc, 'location'),
      animalName: strField(doc, 'animalName'),
      tags: arrayField(doc, 'tags'),
      slug: strField(doc, 'slug') || doc.name?.split('/').pop() || photoId,
      updatedAt: doc.updateTime || '',
    };
  } catch { return null; }
}

function buildDescription(photo) {
  if (photo.caption) return photo.caption.slice(0, 200);
  return `${photo.animalName || 'Wildlife'} ${photo.category} photography by ${photo.photographer}${photo.location ? ` at ${photo.location}` : ''}.`.slice(0, 200);
}

export default async function handler(req, res) {
  const requestedSlug = sanitizeSlug(req.query.id || '');
  if (!requestedSlug) return res.redirect(302, SITE_URL);
  const baseHtml = readBaseHtml();
  const photo = await getPhotoById(requestedSlug);
  const pageUrl = `${SITE_URL}/photo/${encodeURIComponent(requestedSlug)}`;

  if (!photo) {
    const metaTags = buildMetaTags({ type: 'article', title: 'Wildlife Photo — WILDS AURA Photography', description: 'Explore wildlife photography on WILDS AURA.', pageUrl, ogImageUrl: `${SITE_URL}/photos/photo-wildlife.jpeg` });
    const injected = injectSeoHtml(baseHtml, metaTags);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(injected);
  }

  const canonicalSlug = sanitizeSlug(photo.slug || requestedSlug);
  const canonicalUrl = `${SITE_URL}/photo/${encodeURIComponent(canonicalSlug)}`;
  const ogImageUrl = buildOgImageUrl('photo', canonicalSlug, photo.updatedAt);
  const title = `${photo.title} — WILDS AURA Photography`;
  const description = buildDescription(photo);
  const jsonLd = buildJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: photo.title,
    description,
    contentUrl: photo.imageUrl || photo.thumbnailUrl || ogImageUrl,
    thumbnailUrl: photo.thumbnailUrl || photo.imageUrl || ogImageUrl,
    url: canonicalUrl,
    creator: { '@type': 'Person', name: photo.photographer },
    keywords: photo.tags?.join(', '),
    locationCreated: photo.location ? { '@type': 'Place', name: photo.location } : undefined,
  });
  const visibleContent = `<main><article><h1>${esc(photo.title)}</h1><p>${esc(description)}</p><p>Category: ${esc(photo.category)}</p>${photo.location ? `<p>Location: ${esc(photo.location)}</p>` : ''}</article></main>`;
  const metaTags = buildMetaTags({ type: 'article', title, description, pageUrl: canonicalUrl, ogImageUrl }) + jsonLd;
  const injected = injectSeoHtml(baseHtml, metaTags, visibleContent);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injected);
}
