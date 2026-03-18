export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data' });
    
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return res.status(500).json({ success: false, error: 'Gemini API key not configured' });
    
    // Extract base64 from data URL
    const base64Match = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!base64Match) return res.status(400).json({ success: false, error: 'Invalid image data format' });
    
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];
    
    // Models to try in order (fallback chain)
    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
    
    const prompt = `You are a wildlife photography expert. Analyze this photo carefully and identify:
1. The exact animal species (if it's a wildlife photo) or the subject
2. A creative photography title (4-8 words)
3. A detailed caption (2-3 sentences describing what you see)
4. Relevant tags for searchability
5. The likely location/habitat based on the species and environment
6. The photo category

Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "Creative photography title",
  "caption": "Detailed description of what you see in the photo",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "location": "Most likely location/habitat",
  "category": "wildlife" or "landscape" or "street" or "other",
  "animalName": "Common species name (or empty string if not an animal)"
}`;

    const requestBody = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
      }
    });

    let geminiData = null;
    let lastError = '';

    // Try each model with retries
    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Wait before retry (exponential backoff)
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: requestBody,
            }
          );

          if (geminiResponse.status === 429) {
            lastError = `Rate limited (429) on ${model}, attempt ${attempt + 1}`;
            console.warn(lastError);
            continue; // Retry
          }

          if (!geminiResponse.ok) {
            lastError = `${model} error: ${geminiResponse.status}`;
            console.warn(lastError);
            break; // Try next model
          }

          geminiData = await geminiResponse.json();
          break; // Success!
        } catch (e) {
          lastError = `${model} fetch error: ${e.message}`;
          console.warn(lastError);
        }
      }
      if (geminiData) break; // Got data, stop trying models
    }

    if (!geminiData) {
      return res.status(429).json({ success: false, error: `AI temporarily busy. Please wait 30 seconds and try again. (${lastError})` });
    }
    
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ success: false, error: 'Could not parse AI response', raw: content });
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Step 2: Fetch Wikipedia info if animal detected
    let wikiInfo = '';
    if (parsed.animalName && parsed.animalName.length > 0) {
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(parsed.animalName)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
        );
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const pages = wikiData.query?.pages || {};
          const page = Object.values(pages)[0];
          if (page && page.extract && !page.missing) {
            wikiInfo = page.extract.substring(0, 600);
          }
        }
      } catch (e) {
        console.warn('Wikipedia fetch failed:', e.message);
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        title: parsed.title || '',
        caption: parsed.caption || '',
        tags: parsed.tags || [],
        location: parsed.location || '',
        category: parsed.category || 'wildlife',
        animalName: parsed.animalName || '',
        wikiInfo: wikiInfo,
      },
    });
  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
