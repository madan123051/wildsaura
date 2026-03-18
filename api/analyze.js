export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data' });
    
    const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyDJsldX4kDGwqe66Wh9f023UnTysXzaD9c';
    
    // Extract base64 from data URL
    const base64Match = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!base64Match) return res.status(400).json({ success: false, error: 'Invalid image data format' });
    
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];
    
    // Models to try in order
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    
    const prompt = `You are a wildlife photography expert. Analyze this photo and return ONLY a JSON object (no markdown, no code blocks, no explanation):
{"title": "Creative title 4-8 words", "caption": "2-3 sentence description of the photo", "tags": ["tag1","tag2","tag3","tag4","tag5"], "location": "Most likely location/habitat", "category": "wildlife", "animalName": "Common species name or empty string"}`;

    const requestBody = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      }
    });

    let lastError = '';
    
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          
          const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          });
          
          if (geminiResponse.status === 429) {
            lastError = `${model} rate limited (429)`;
            await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
            continue;
          }
          
          if (geminiResponse.status === 404) {
            lastError = `${model} not found (404)`;
            break;
          }
          
          if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            lastError = `${model} error ${geminiResponse.status}`;
            break;
          }
          
          const geminiData = await geminiResponse.json();
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (!content) {
            lastError = `${model} returned empty response`;
            break;
          }
          
          // Parse JSON - handle multiple formats
          let parsed = null;
          
          // Method 1: Try direct JSON parse
          try {
            parsed = JSON.parse(content.trim());
          } catch(e) {
            // Method 2: Extract from ```json ... ``` code blocks
            const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
              try {
                parsed = JSON.parse(codeBlockMatch[1].trim());
              } catch(e2) {}
            }
            
            // Method 3: Find JSON object in text
            if (!parsed) {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  parsed = JSON.parse(jsonMatch[0]);
                } catch(e3) {}
              }
            }
          }
          
          if (!parsed) {
            return res.status(200).json({ 
              success: false, 
              error: 'Could not parse AI response',
              raw: content.substring(0, 500)
            });
          }
          
          // Fetch Wikipedia info if animal detected
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
            model: model,
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
          
        } catch (fetchErr) {
          lastError = `${model} fetch error: ${fetchErr.message}`;
          continue;
        }
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      error: `AI analysis failed. ${lastError}. Please try again.`
    });
    
  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
