import { esc, injectSeoHtml, readBaseHtml, SITE_URL } from './seo-render.js';
import { arrayField, getDocumentByIdOrSlug, intField, strField, timestampField } from './firestore-seo.js';
import {
  buildJsonLdScript,
  buildMetaTags,
  buildNoindexMetaTags,
  DEFAULT_OG_IMAGE,
  isPublicHttpUrl,
  publicMediaUrl,
} from './og-shared.js';

function isoDuration(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  if (/^PT/i.test(raw)) return raw.toUpperCase();
  const parts = raw.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return undefined;
  if (parts.length === 2) return `PT${parts[0] ? `${parts[0]}M` : ''}${parts[1]}S`;
  if (parts.length === 3) return `PT${parts[0] ? `${parts[0]}H` : ''}${parts[1] ? `${parts[1]}M` : ''}${parts[2]}S`;
  return undefined;
}

async function getVideo(videoId) {
  try {
    const doc = await getDocumentByIdOrSlug('videos', videoId);
    if (!doc) return null;
    const title = strField(doc, 'title').trim();
    const videoUrl = strField(doc, 'videoUrl').trim();
    if (!title || !isPublicHttpUrl(videoUrl)) return null;
    return {
      title,
      description: strField(doc, 'description').trim(),
      videoUrl,
      thumbnailUrl: strField(doc, 'thumbnailUrl').trim(),
      tags: arrayField(doc, 'tags'),
      location: strField(doc, 'location').trim(),
      duration: strField(doc, 'duration').trim(),
      uploadDate: timestampField(doc, 'createdAt') || doc.createTime || '',
      updatedAt: doc.updateTime || '',
      width: intField(doc, 'videoWidth'),
      height: intField(doc, 'videoHeight'),
      firestoreId: doc.name?.split('/').pop() || videoId,
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const videoId = String(req.query.id || '').trim();
  if (!videoId) return res.redirect(302, `${SITE_URL}/video-grid`);

  const pageUrl = `${SITE_URL}/video/${encodeURIComponent(videoId)}`;
  const baseHtml = readBaseHtml();
  const video = await getVideo(videoId);

  if (!video) {
    const metaTags = buildNoindexMetaTags({
      title: 'Video Not Found - WILDS AURA',
      description: 'This WILDS AURA video is not available publicly.',
      pageUrl,
      ogImageUrl: DEFAULT_OG_IMAGE,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(injectSeoHtml(baseHtml, metaTags, '<main><h1>Video Not Found</h1><p>This video is not available publicly.</p></main>'));
  }

  const canonicalUrl = `${SITE_URL}/video/${encodeURIComponent(video.firestoreId)}`;
  const thumbnailUrl = publicMediaUrl(video.thumbnailUrl);
  const description = (
    video.description ||
    `${video.title}, a wildlife and nature video${video.location ? ` filmed in ${video.location}` : ''} by WILDS AURA Photography.`
  ).slice(0, 200);
  const title = `${video.title} - WILDS AURA Video`;
  const jsonLd = buildJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description,
    thumbnailUrl: [thumbnailUrl],
    uploadDate: video.uploadDate,
    duration: isoDuration(video.duration),
    contentUrl: video.videoUrl,
    embedUrl: canonicalUrl,
    url: canonicalUrl,
    width: video.width || undefined,
    height: video.height || undefined,
    keywords: video.tags.join(', '),
    contentLocation: video.location ? { '@type': 'Place', name: video.location } : undefined,
    creator: { '@type': 'Person', name: 'Madan Shrestha', url: SITE_URL },
  });
  const visibleContent = `<main><article><h1>${esc(video.title)}</h1><video controls preload="metadata" poster="${esc(thumbnailUrl)}" src="${esc(video.videoUrl)}"></video><p>${esc(description)}</p>${video.location ? `<p>Location: ${esc(video.location)}</p>` : ''}</article></main>`;
  const metaTags = buildMetaTags({
    type: 'video.other',
    title,
    description,
    pageUrl: canonicalUrl,
    ogImageUrl: thumbnailUrl,
  }) + jsonLd;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(injectSeoHtml(baseHtml, metaTags, visibleContent));
}
