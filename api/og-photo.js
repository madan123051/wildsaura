import { esc, injectSeoHtml, readBaseHtml, SITE_URL } from '../server/seo-render.js';
import { arrayField, boolField, getDocumentByIdOrSlug, strField } from '../server/firestore-seo.js';
import { buildJsonLdScript, buildMetaTags, buildNoindexMetaTags, buildOgImageUrl, publicMediaUrl, sanitizeSlug } from '../server/og-shared.js';

async function getPhotoById(photoId) {
  try {
    const doc = await getDocumentByIdOrSlug('photos', photoId);
    if (!doc) return null;
    const source = strField(doc, 'source').trim();
    const status = strField(doc, 'status').trim();
    const ownerId = strField(doc, 'ownerId').trim();
    const belongsToWildsaura = source === 'wildsaura' || (!source && !status && !ownerId);
    if (!belongsToWildsaura || boolField(doc, 'isPrivate', false) === true || boolField(doc, 'published', true) === false) return null;
    if (!strField(doc, 'title').trim()) return null;
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
      slug: strField(doc, 'slug'),
      firestoreId: doc.name?.split('/').pop() || photoId,
      updatedAt: doc.updateTime || '',
    };
  } catch { return null; }
}

function buildDescription(photo) {
  if (photo.caption) return photo.caption.slice(0, 200);
  return `${photo.animalName || 'Wildlife'} ${photo.category} photography by ${photo.photographer}${photo.location ? ` at ${photo.location}` : ''}.`.slice(0, 200);
}

export default async function handler(req, res) {
  const requestedToken = String(req.query.id || '').trim();
  if (!requestedToken) return res.redirect(302, SITE_URL);
  const baseHtml = readBaseHtml();
  const photo = await getPhotoById(requestedToken);
  const pageUrl = `${SITE_URL}/photo/${encodeURIComponent(requestedToken)}`;

  if (!photo) {
    const metaTags = buildNoindexMetaTags({ title: 'Photo Not Found - WILDS AURA Photography', description: 'This WILDS AURA photo is not available publicly.', pageUrl, ogImageUrl: `${SITE_URL}/photos/photo-wildlife.jpeg` });
    const injected = injectSeoHtml(baseHtml, metaTags, '<main><h1>Photo Not Found</h1><p>This photo is not available publicly.</p></main>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(injected);
  }

  const canonicalToken = photo.slug ? sanitizeSlug(photo.slug) : (photo.firestoreId || requestedToken);
  const canonicalUrl = `${SITE_URL}/photo/${encodeURIComponent(canonicalToken)}`;
  const ogImageUrl = publicMediaUrl(
    photo.imageUrl || photo.thumbnailUrl,
    buildOgImageUrl('photo', canonicalToken, photo.updatedAt),
  );
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
  const visibleContent = `<main><article><h1>${esc(photo.title)}</h1><figure><img src="${esc(publicMediaUrl(photo.imageUrl || photo.thumbnailUrl))}" alt="${esc(photo.title)}" loading="eager"><figcaption>${esc(description)}</figcaption></figure><p>Category: ${esc(photo.category)}</p>${photo.location ? `<p>Location: ${esc(photo.location)}</p>` : ''}<p>Photographer: ${esc(photo.photographer)}</p></article></main>`;
  const metaTags = buildMetaTags({ type: 'article', title, description, pageUrl: canonicalUrl, ogImageUrl }) + jsonLd;
  const injected = injectSeoHtml(baseHtml, metaTags, visibleContent);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injected);
}
