export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const animal = req.query.animal;
    if (!animal) return res.status(400).json({ success: false, error: 'Missing animal parameter' });

    // Search Wikipedia
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(animal)}&prop=extracts|pageimages&exintro=true&explaintext=true&pithumbsize=300&format=json&origin=*`
    );

    if (!searchRes.ok) {
      return res.status(500).json({ success: false, error: 'Wikipedia API error' });
    }

    const data = await searchRes.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];

    if (!page || page.missing || !page.extract) {
      // Try search API as fallback
      const searchFallback = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(animal)}&limit=1&format=json&origin=*`
      );

      if (searchFallback.ok) {
        const searchData = await searchFallback.json();
        if (searchData[1] && searchData[1].length > 0) {
          const bestMatch = searchData[1][0];
          const retryRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestMatch)}&prop=extracts|pageimages&exintro=true&explaintext=true&pithumbsize=300&format=json&origin=*`
          );

          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryPages = retryData.query?.pages || {};
            const retryPage = Object.values(retryPages)[0];

            if (retryPage && retryPage.extract && !retryPage.missing) {
              return res.status(200).json({
                success: true,
                animal: bestMatch,
                summary: retryPage.extract.substring(0, 800),
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(retryPage.title)}`,
                imageUrl: retryPage.thumbnail?.source || null,
              });
            }
          }
        }
      }

      return res.status(404).json({ success: false, error: `No Wikipedia article found for "${animal}"` });
    }

    return res.status(200).json({
      success: true,
      animal,
      summary: page.extract.substring(0, 800),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      imageUrl: page.thumbnail?.source || null,
    });

  } catch (err) {
    console.error('Wikipedia error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Wikipedia lookup failed' });
  }
}
