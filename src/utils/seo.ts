type SeoPayload = {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
};

function upsertMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    if (selector.includes('property=')) el.setAttribute('property', selector.match(/"(.+)"/)?.[1] || '');
    if (selector.includes('name=')) el.setAttribute('name', selector.match(/"(.+)"/)?.[1] || '');
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function updateSeo(payload: SeoPayload) {
  document.title = payload.title;
  upsertMeta('meta[name="description"]', 'content', payload.description);
  upsertMeta('meta[property="og:title"]', 'content', payload.title);
  upsertMeta('meta[property="og:description"]', 'content', payload.description);
  upsertMeta('meta[property="og:type"]', 'content', payload.type || 'website');
  upsertMeta('meta[property="og:url"]', 'content', payload.url || window.location.href);
  upsertMeta('meta[name="twitter:title"]', 'content', payload.title);
  upsertMeta('meta[name="twitter:description"]', 'content', payload.description);
  if (payload.image) {
    upsertMeta('meta[property="og:image"]', 'content', payload.image);
    upsertMeta('meta[name="twitter:image"]', 'content', payload.image);
  }
}
