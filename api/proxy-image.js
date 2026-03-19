// Vercel Serverless Function — proxies Firebase Storage images to bypass CORS
// Only allows requests to Firebase Storage URLs for security

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Security: Only allow Firebase Storage URLs
  const allowed = [
    'firebasestorage.googleapis.com',
    'wildsaura-1ef8a.firebasestorage.app',
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!allowed.some((domain) => parsedUrl.hostname.includes(domain))) {
    return res.status(403).json({ error: 'URL not allowed' });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream fetch failed' });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy fetch failed' });
  }
}
