export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { photoTitle, animalName, location, caption } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDJsldX4kDGwqe66Wh9f023UnTysXzaD9c';
    
    const prompt = `You are a wildlife photographer named Madan Shrestha writing for your photography website "WILDS AURA". 
Write a compelling photography story/blog post based on this photo:
- Photo Title: ${photoTitle || 'Wildlife Photo'}
- Animal/Subject: ${animalName || 'unknown'}
- Location: ${location || 'unknown'}
- Caption: ${caption || ''}

Write in first person as the photographer. Include:
1. The journey to the location
2. The patience and challenges of wildlife photography
3. The magical moment when you captured the shot
4. Technical details about the photography approach
5. What this encounter meant to you

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "compelling story title",
  "excerpt": "2-3 sentence teaser",
  "content": "full story text, 4-6 paragraphs separated by \\n\\n",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(500).json({ error: `Gemini error: ${data.error?.message || 'Unknown'}` });
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean markdown code blocks
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to generate story' });
  }
}
