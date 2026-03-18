export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageData, provider = 'gemini', apiKey } = req.body;
    if (!imageData) return res.status(400).json({ success: false, error: 'No image data provided' });
    if (!apiKey) return res.status(400).json({ success: false, error: 'No API key provided. Please configure your API key in AI Settings.' });

    const prompt = `Analyze this wildlife/nature photograph and return a JSON response with these fields:
{
  "title": "A compelling, descriptive title for this photo",
  "caption": "A detailed 2-3 sentence description of what's in the photo",
  "category": "wildlife" or "landscape" or "street" or "other",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "animalName": "Common name of the animal/bird if present, or empty string",
  "scientificName": "Scientific name if animal detected, or empty string",
  "location": "Best guess of location/habitat based on the image, or empty string"
}

Return ONLY the JSON object, no markdown, no code blocks, no explanation.`;

    let analysisText = '';

    if (provider === 'chatgpt') {
      // ── OpenAI GPT-4o-mini Vision ──
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          }],
          max_tokens: 2048,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('ChatGPT Vision error:', errText);
        return res.status(500).json({ success: false, error: `ChatGPT API error: ${response.status}` });
      }

      const data = await response.json();
      analysisText = data.choices?.[0]?.message?.content || '';

    } else {
      // ── Gemini Vision (default) ──
      // Fixed model order: use stable models first, avoid rate-limited experimental ones
      const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let success = false;
      let lastError = '';

      // Prepare image parts
      let imageParts;
      if (imageData.startsWith('data:')) {
        const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          imageParts = {
            inlineData: {
              mimeType: base64Match[1],
              data: base64Match[2],
            },
          };
        }
      }

      if (!imageParts) {
        imageParts = {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData.replace(/^data:[^;]+;base64,/, ''),
          },
        };
      }

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  imageParts,
                ],
              }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (analysisText) {
              success = true;
              break;
            }
          } else {
            lastError = `${model} error ${response.status}`;
            console.warn(`Gemini ${model} failed: ${response.status}`);
          }
        } catch (modelErr) {
          lastError = modelErr.message;
          console.warn(`Gemini ${model} failed:`, modelErr.message);
        }
      }

      if (!success) {
        return res.status(500).json({ 
          success: false, 
          error: `AI analysis failed. ${lastError}. Please try again or switch to ChatGPT in AI Settings.` 
        });
      }
    }

    // Parse the JSON response
    let analysis;
    try {
      // Clean up the response — remove markdown code blocks if present
      let cleanText = analysisText.trim();
      cleanText = cleanText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({ success: false, error: 'AI returned non-JSON response' });
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message, 'Raw:', analysisText.substring(0, 200));
      return res.status(500).json({ success: false, error: 'Failed to parse AI response. Please try again.' });
    }

    // Validate and normalize
    const result = {
      title: analysis.title || '',
      caption: analysis.caption || analysis.description || '',
      category: ['wildlife', 'landscape', 'street', 'other'].includes(analysis.category) ? analysis.category : 'wildlife',
      tags: Array.isArray(analysis.tags) ? analysis.tags.slice(0, 10) : [],
      animalName: analysis.animalName || analysis.animal || '',
      scientificName: analysis.scientificName || '',
      location: analysis.location || '',
    };

    // If animal detected, try to fetch Wikipedia info
    let wikiSummary = '';
    if (result.animalName) {
      try {
        const searchTerm = result.animalName;
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
        console.warn('Wikipedia lookup failed:', wikiErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: result,
      wikiSummary,
      provider,
    });

  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
