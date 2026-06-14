import { esc, injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { arrayField, boolField, getDocumentByIdOrSlug, strField } from './firestore-seo.js';
import { buildJsonLdScript, buildMetaTags, buildNoindexMetaTags, buildOgImageUrl, sanitizeSlug } from './og-shared.js';

async function getStory(storyId) {
  try {
    const doc = await getDocumentByIdOrSlug('stories', storyId);
    if (!doc) return null;
    if (boolField(doc, 'isPrivate', false) === true || boolField(doc, 'published', true) === false) return null;
    if (!strField(doc, 'title').trim()) return null;
    return {
      title: strField(doc, 'title') || 'Wildlife Story',
      excerpt: strField(doc, 'excerpt'),
      content: strField(doc, 'content'),
      coverImageUrl: strField(doc, 'coverImageUrl'),
      author: strField(doc, 'author') || strField(doc, 'photographer') || 'Madan Shrestha',
      tags: arrayField(doc, 'tags'),
      slug: strField(doc, 'slug'),
      firestoreId: doc.name?.split('/').pop() || storyId,
      updatedAt: doc.updateTime || '',
      createdAt: doc.createTime || '',
    };
  } catch { return null; }
}

export default async function handler(req, res) {
  const storyId = String(req.query.slug || req.query.id || '').trim();
  if (!storyId) return res.redirect(302, SITE_URL);
  const pageUrl = `${SITE_URL}/story/${encodeURIComponent(storyId)}`;
  const baseHtml = readBaseHtml();
  const story = await getStory(storyId);

  if (!story) {
    const metaTags = buildNoindexMetaTags({ title: 'Story Not Found - WILDS AURA Stories', description: 'This WILDS AURA story is not available publicly.', pageUrl, ogImageUrl: `${SITE_URL}/photos/photo-wildlife.jpeg` });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(injectSeoHtml(baseHtml, metaTags, '<main><h1>Story Not Found</h1><p>This story is not available publicly.</p></main>'));
  }

  const canonicalToken = story.slug ? sanitizeSlug(story.slug) : (story.firestoreId || storyId);
  const ogImageUrl = buildOgImageUrl('story', canonicalToken, story.updatedAt);
  const title = `${story.title} — WILDS AURA Stories`;
  const description = (story.excerpt || `${story.title} by ${story.author}`).slice(0, 200);
  const canonicalUrl = `${SITE_URL}/story/${encodeURIComponent(canonicalToken)}`;
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
