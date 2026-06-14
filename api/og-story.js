import { esc, injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { arrayField, getDocumentByIdOrSlug, strField } from './firestore-seo.js';
import { buildJsonLdScript, buildMetaTags, buildOgImageUrl, sanitizeSlug } from './og-shared.js';

async function getStory(storyId) {
  try {
    const doc = await getDocumentByIdOrSlug('stories', storyId);
    if (!doc) return null;
    return {
      title: strField(doc, 'title') || 'Wildlife Story',
      excerpt: strField(doc, 'excerpt'),
      content: strField(doc, 'content'),
      coverImageUrl: strField(doc, 'coverImageUrl'),
      author: strField(doc, 'author') || strField(doc, 'photographer') || 'Madan Shrestha',
      tags: arrayField(doc, 'tags'),
      slug: strField(doc, 'slug') || doc.name?.split('/').pop() || storyId,
      updatedAt: doc.updateTime || '',
      createdAt: doc.createTime || '',
    };
  } catch { return null; }
}

export default async function handler(req, res) {
  const storyId = sanitizeSlug(req.query.slug || req.query.id || '');
  if (!storyId) return res.redirect(302, SITE_URL);
  const pageUrl = `${SITE_URL}/story/${encodeURIComponent(storyId)}`;
  const baseHtml = readBaseHtml();
  const story = await getStory(storyId);

  if (!story) {
    const metaTags = buildMetaTags({ type: 'article', title: 'Wildlife Story — WILDS AURA Stories', description: 'Read wildlife stories on WILDS AURA.', pageUrl, ogImageUrl: `${SITE_URL}/photos/photo-wildlife.jpeg` });
    return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(injectSeoHtml(baseHtml, metaTags));
  }

  const slug = sanitizeSlug(story.slug || storyId);
  const ogImageUrl = buildOgImageUrl('story', slug, story.updatedAt);
  const title = `${story.title} — WILDS AURA Stories`;
  const description = (story.excerpt || `${story.title} by ${story.author}`).slice(0, 200);
  const canonicalUrl = `${SITE_URL}/story/${encodeURIComponent(slug)}`;
  const jsonLd = buildJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description,
    image: story.coverImageUrl || ogImageUrl,
    url: canonicalUrl,
    author: { '@type': 'Person', name: story.author },
    datePublished: story.createdAt,
    dateModified: story.updatedAt,
    keywords: story.tags?.join(', '),
  });
  const visibleContent = `<main><article><h1>${esc(story.title)}</h1><p>${esc(description)}</p></article></main>`;
  const metaTags = buildMetaTags({ type: 'article', title, description, pageUrl: canonicalUrl, ogImageUrl }) + jsonLd;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectSeoHtml(baseHtml, metaTags, visibleContent));
}
