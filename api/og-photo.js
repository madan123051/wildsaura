// Serverless function to serve dynamic OG meta tags for social media crawlers
// When Facebook/Twitter/WhatsApp bots visit /photo/:id, they get proper OG tags
// Normal users get redirected to the SPA

const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const SITE_URL = 'https://wildsaura.vercel.app';

// Known social media crawler user agents
const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Pinterest',
  'Googlebot',
  'bingbot',
];

function isBot(userAgent) {
  if (!userAgent) return false;
  return BOT_USER_AGENTS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
}

async function getPhotoFromFirestore(photoId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/photos/${photoId}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields) return null;

    // Parse Firestore document fields
    const fields = doc.fields;
    return {
      title: fields.title?.stringValue || 'Wildlife Photo',
      caption: fields.caption?.stringValue || 'Explore stunning wildlife photography on WildSaura',
      imageUrl: fields.imageUrl?.stringValue || `${SITE_URL}/photos/logo.png`,
      category: fields.category?.stringValue || 'Wildlife',
      photographer: fields.photographer?.stringValue || 'Madan Shrestha',
      location: fields.location?.stringValue || '',
    };
  } catch (err) {
    console.error('Failed to fetch photo from Firestore:', err);
    return null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  const photoId = req.query.id;
  const userAgent = req.headers['user-agent'] || '';

  if (!photoId) {
    return res.redirect(302, SITE_URL);
  }

  // For normal users, redirect to the SPA (React router handles /photo/:id)
  if (!isBot(userAgent)) {
    // Redirect to SPA with the photo ID — the React app will open the modal
    return res.redirect(302, `${SITE_URL}/?photo=${encodeURIComponent(photoId)}`);
  }

  // For bots, fetch photo data and return HTML with OG tags
  const photo = await getPhotoFromFirestore(photoId);

  if (!photo) {
    // Fallback to generic OG tags if photo not found
    return res.redirect(302, SITE_URL);
  }

  const title = escapeHtml(`${photo.title} — WILDS AURA Photography`);
  const description = escapeHtml(photo.caption || `${photo.category} photography by ${photo.photographer}`);
  const imageUrl = escapeHtml(photo.imageUrl);
  const pageUrl = escapeHtml(`${SITE_URL}/photo/${encodeURIComponent(photoId)}`);
  const location = photo.location ? ` 📍 ${escapeHtml(photo.location)}` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}${location}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="fb:app_id" content="1631329071118237" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="WILDS AURA Photography" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}${location}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(photo.title)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}${location}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta name="twitter:creator" content="@wildsaura" />

  <!-- Redirect real users to SPA -->
  <meta http-equiv="refresh" content="0;url=${SITE_URL}/?photo=${encodeURIComponent(photoId)}" />
  <link rel="canonical" href="${pageUrl}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}${location}</p>
  <img src="${imageUrl}" alt="${escapeHtml(photo.title)}" />
  <p>Photo by ${escapeHtml(photo.photographer)} on <a href="${SITE_URL}">WILDS AURA Photography</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(200).send(html);
};
