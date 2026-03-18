export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { message, photos } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
    
    // Hindi animal name mapping
    const hindiMap = {
      'sher': 'Tiger', 'baagh': 'Tiger', 'bagh': 'Tiger',
      'hathi': 'Elephant', 'haathi': 'Elephant',
      'bandar': 'Monkey', 'mor': 'Peacock', 'mayur': 'Peacock',
      'cheetah': 'Cheetah', 'girgit': 'Chameleon',
      'saanp': 'Snake', 'samp': 'Snake',
      'machhli': 'Fish', 'magarmach': 'Crocodile',
      'ullu': 'Owl', 'tota': 'Parrot', 'gaay': 'Cow',
      'ghoda': 'Horse', 'bhalu': 'Bear', 'hirn': 'Deer',
      'hiran': 'Deer', 'lomdi': 'Fox', 'bhediya': 'Wolf',
      'genda': 'Rhinoceros', 'gainda': 'Rhinoceros',
    };
    
    // Detect Hindi
    const isHindi = /[\u0900-\u097F]/.test(message) || 
      Object.keys(hindiMap).some(k => message.toLowerCase().includes(k));
    
    const photoList = photos?.map(p => `${p.title} (${p.animalName || p.category})`).join(', ') || 'No photos yet';
    
    const systemPrompt = `You are the Wilds Aura Photography assistant chatbot. You help visitors explore wildlife photography.

Available photos in gallery: ${photoList}

Rules:
1. If user asks about an animal, identify it and provide info
2. If user types in Hindi/Hinglish, reply in Hinglish
3. If user types in English, reply in English  
4. Always return a JSON response:
{
  "reply": "Your conversational response",
  "animalName": "English name of animal if mentioned, else null",
  "wikiSearch": "Animal name to search Wikipedia for, else null",
  "hasPhotos": true/false if this animal exists in gallery,
  "suggestions": ["Tiger", "Elephant", "Monkey"] // suggest available animals if asked animal not in gallery
}`;

    const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    
    if (!dsResponse.ok) {
      const errText = await dsResponse.text();
      return res.status(500).json({ error: `DeepSeek API error: ${errText}` });
    }
    
    const dsData = await dsResponse.json();
    const content = dsData.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: content };
    } catch {
      parsed = { reply: content };
    }
    
    // Fetch Wikipedia if animal identified
    let wikiSummary = null;
    if (parsed.wikiSearch || parsed.animalName) {
      const searchTerm = parsed.wikiSearch || parsed.animalName;
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchTerm)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
        );
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const pages = wikiData.query?.pages || {};
          const page = Object.values(pages)[0];
          if (page && page.extract && !page.missing) {
            wikiSummary = page.extract.substring(0, 500) + (page.extract.length > 500 ? '...' : '');
          }
        }
      } catch (wikiErr) {
        console.warn('Wikipedia fetch failed:', wikiErr.message);
      }
    }
    
    return res.status(200).json({
      ...parsed,
      wikiSummary,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
