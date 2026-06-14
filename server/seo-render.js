import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://www.wildsaura.com';

export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function readBaseHtml() {
  const htmlPath = path.join(process.cwd(), 'dist', 'index.html');
  return fs.readFileSync(htmlPath, 'utf-8');
}

export function stripSeoTags(html) {
  return html
    .replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, '')
    .replace(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<title>[^<]*<\/title>/i, '');
}

export function injectSeoHtml(baseHtml, metaTags, visibleContentHtml = '') {
  const cleaned = stripSeoTags(baseHtml);
  const withHead = cleaned.replace('</head>', `${metaTags}\n</head>`);
  if (!visibleContentHtml) return withHead;
  return withHead.replace(
    /<div\s+id=["']root["'][^>]*>[\s\S]*?<\/div>/i,
    `<div id="root">${visibleContentHtml}</div>`,
  );
}

export function defaultRobotsMeta() {
  return '<meta name="robots" content="index,follow,max-image-preview:large">';
}

export { SITE_URL };
