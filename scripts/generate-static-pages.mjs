import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { esc, injectSeoHtml, SITE_URL } from '../server/seo-render.js';
import { buildJsonLdScript, buildMetaTags, DEFAULT_OG_IMAGE } from '../server/og-shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const baseHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

const PAGE_DEFINITIONS = [
  {
    path: '/',
    type: 'website',
    schemaType: 'WebSite',
    title: 'WILDS AURA - Wildlife & Nature Photography by Madan Shrestha',
    description: 'Explore wildlife, bird, nature, landscape, macro, and portrait photography by Madan Shrestha, with field stories from Nepal and Japan.',
    heading: 'WILDS AURA Wildlife Photography',
    body: 'Wildlife photos, nature stories, bird portraits, macro details, landscapes, and conservation-minded visual storytelling by Madan Shrestha.',
    keywords: ['wildlife photography', 'nature photography', 'bird photography', 'Nepal wildlife', 'Japan nature photography'],
  },
  {
    path: '/photos',
    type: 'website',
    schemaType: 'ImageGallery',
    title: 'Wildlife Photo Gallery - WILDS AURA',
    description: 'Browse WILDS AURA photo collections across wildlife, birds, macro, domestic animals, landscapes, nature, street, and portrait photography.',
    heading: 'Wildlife and Nature Photo Gallery',
    body: 'A curated photography gallery featuring wild animals, birds, flowers, landscapes, street scenes, portraits, and field observations.',
    keywords: ['wildlife photo gallery', 'bird photos', 'nature photo gallery', 'landscape photography'],
  },
  {
    path: '/photo-grid',
    canonicalPath: '/photos',
    type: 'website',
    schemaType: 'ImageGallery',
    title: 'Wildlife Photo Gallery - WILDS AURA',
    description: 'Browse WILDS AURA photo collections across wildlife, birds, macro, domestic animals, landscapes, nature, street, and portrait photography.',
    heading: 'Wildlife and Nature Photo Gallery',
    body: 'A curated photography gallery featuring wild animals, birds, flowers, landscapes, street scenes, portraits, and field observations.',
    keywords: ['wildlife photo gallery', 'bird photos', 'nature photo gallery', 'landscape photography'],
  },
  {
    path: '/story-grid',
    type: 'website',
    schemaType: 'CollectionPage',
    title: 'Wildlife Stories - WILDS AURA',
    description: 'Read short wildlife and nature photography stories from WILDS AURA, including field notes, species encounters, and conservation-minded reflections.',
    heading: 'Wildlife Photography Stories',
    body: 'Field stories and visual essays behind the photographs, from birds and flowers to forests, mountains, and everyday wildlife encounters.',
    keywords: ['wildlife stories', 'nature stories', 'photography stories', 'field notes'],
  },
  {
    path: '/community',
    type: 'website',
    schemaType: 'WebPage',
    title: 'WILDS AURA Community - Nature Photographers and Wildlife Lovers',
    description: 'Join the WILDS AURA community for wildlife photography, nature stories, conversations, and conservation support.',
    heading: 'WILDS AURA Community',
    body: 'A place for photographers, wildlife lovers, and nature-minded visitors to connect around photos, stories, and animal protection.',
    keywords: ['wildlife photography community', 'nature photographers', 'WILDS AURA community'],
  },
  {
    path: '/about',
    type: 'profile',
    schemaType: 'AboutPage',
    title: 'About WILDS AURA - Madan Shrestha Wildlife Photography',
    description: 'Learn about WILDS AURA, a wildlife and nature photography project by Madan Shrestha focused on Nepal, Japan, and animal protection.',
    heading: 'About WILDS AURA',
    body: 'WILDS AURA connects photography, field stories, and a mission to protect animals through visual storytelling.',
    keywords: ['Madan Shrestha photographer', 'WildSaura about', 'wildlife photographer Nepal'],
  },
  {
    path: '/contact',
    type: 'website',
    schemaType: 'ContactPage',
    title: 'Contact WILDS AURA - Wildlife Photography',
    description: 'Contact WILDS AURA for photography partnerships, media inquiries, wildlife storytelling, volunteering, and collaboration.',
    heading: 'Contact WILDS AURA',
    body: 'Reach out for wildlife photography partnerships, media inquiries, community work, volunteering, and conservation-focused collaborations.',
    keywords: ['contact wildlife photographer', 'WILDS AURA contact', 'Madan Shrestha contact'],
  },
  {
    path: '/terms',
    type: 'website',
    schemaType: 'WebPage',
    title: 'Terms and Conditions - WILDS AURA',
    description: 'Read the WILDS AURA terms and conditions for photography usage, downloads, community behavior, and site access.',
    heading: 'Terms and Conditions',
    body: 'Terms for using WILDS AURA photography, downloads, stories, comments, and community features.',
    keywords: ['WILDS AURA terms', 'photography usage terms'],
  },
  {
    path: '/privacy-policy',
    type: 'website',
    schemaType: 'WebPage',
    title: 'Privacy Policy - WILDS AURA',
    description: 'Read the WILDS AURA privacy policy covering contact form data, comments, community data, advertising cookies, and future Instagram or Facebook connector data.',
    heading: 'Privacy Policy',
    body: 'Wildsaura privacy practices for contact messages, comments, community posts, advertising cookies, Google AdSense, and future Instagram or Facebook connector data.',
    keywords: ['WILDS AURA privacy policy', 'Wildsaura privacy', 'Meta app privacy policy'],
  },
  {
    path: '/data-deletion',
    type: 'website',
    schemaType: 'WebPage',
    title: 'Data Deletion - WILDS AURA',
    description: 'Request deletion of your WILDS AURA contact form, comment, community, profile, or connected social account data.',
    heading: 'Data Deletion',
    body: 'Instructions for requesting deletion of WILDS AURA website, profile, community, comment, or connector data.',
    keywords: ['WILDS AURA data deletion', 'Wildsaura delete data', 'Meta app data deletion'],
  },
  {
    path: '/marketplace',
    type: 'website',
    schemaType: 'CollectionPage',
    title: 'Buy Authentic Nepal Photography - WILDS AURA Marketplace',
    description: 'Discover authentic Nepal photography and support local photographers and animal rescue work through the WILDS AURA marketplace.',
    heading: 'Authentic Nepal Photography Marketplace',
    body: 'A photography marketplace direction for authentic Nepal images, local creators, and animal support initiatives.',
    keywords: ['Nepal stock photography', 'buy Nepal photos', 'authentic photography marketplace'],
  },
  {
    path: '/ngo',
    type: 'website',
    schemaType: 'WebPage',
    title: 'Support Animal Rescue in Nepal - WILDS AURA',
    description: 'WILDS AURA supports a growing mission around injured and abandoned animals in Nepal through photography and community action.',
    heading: 'Support Animals in Nepal',
    body: 'A developing animal support mission focused on rescue, treatment, feeding, transparency, and verified local partners.',
    keywords: ['animal rescue Nepal', 'support animals Nepal', 'wildlife conservation Nepal'],
  },
  {
    path: '/video-grid',
    type: 'website',
    schemaType: 'CollectionPage',
    title: 'Wildlife and Nature Videos - WILDS AURA',
    description: 'Watch WILDS AURA wildlife, nature, travel, and field videos alongside photography stories and galleries.',
    heading: 'Wildlife and Nature Videos',
    body: 'Short wildlife, nature, travel, and field videos from the WILDS AURA photography project.',
    keywords: ['wildlife videos', 'nature videos', 'WILDS AURA videos'],
  },
];

function buildVisibleContent(page) {
  return `<main><article><h1>${esc(page.heading)}</h1><p>${esc(page.body)}</p><nav aria-label="Important WILDS AURA pages"><a href="/photos">Photos</a> <a href="/story-grid">Stories</a> <a href="/video-grid">Videos</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/privacy-policy">Privacy Policy</a> <a href="/data-deletion">Data Deletion</a></nav></article></main>`;
}

function renderPage(page) {
  const canonicalPath = page.canonicalPath || page.path;
  const pageUrl = `${SITE_URL}${canonicalPath}`;
  const jsonLd = buildJsonLdScript({
    '@context': 'https://schema.org',
    '@type': page.schemaType,
    name: page.heading,
    headline: page.heading,
    description: page.description,
    url: pageUrl,
    image: DEFAULT_OG_IMAGE,
    keywords: page.keywords?.join(', '),
    creator: { '@type': 'Person', name: 'Madan Shrestha', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'WILDS AURA Photography',
      url: SITE_URL,
      logo: `${SITE_URL}/photos/logo.png`,
    },
    potentialAction: page.path === '/'
      ? {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        }
      : undefined,
  });

  const metaTags = buildMetaTags({
    type: page.type,
    title: page.title,
    description: page.description,
    pageUrl,
    ogImageUrl: DEFAULT_OG_IMAGE,
  }) + jsonLd;

  return injectSeoHtml(baseHtml, metaTags, buildVisibleContent(page));
}

function outputPathFor(pagePath) {
  if (pagePath === '/') return path.join(distDir, 'index.html');
  return path.join(distDir, pagePath.replace(/^\/+/, ''), 'index.html');
}

for (const page of PAGE_DEFINITIONS) {
  const outputPath = outputPathFor(page.path);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderPage(page));
}

console.log(`Generated ${PAGE_DEFINITIONS.length} static SEO pages.`);
