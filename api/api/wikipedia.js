export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const animal = req.method === 'GET' ? req.query.animal : req.body?.animal;
  if (!animal) return res.status(400).json({ error: 'Missing animal parameter' });
  
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(animal)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
    );
    const wikiData = await wikiRes.json();
    const pages = wikiData.query?.pages || {};
    const page = Object.values(pages)[0];
    
    if (page && page.extract && !page.missing) {
      return res.status(200).json({
        success: true,
        animal,
        summary: page.extract.substring(0, 800),
      });
    }
    
    return res.status(404).json({ success: false, error: `No Wikipedia article found for "${animal}"` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
