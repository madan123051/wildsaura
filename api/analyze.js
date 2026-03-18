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
      // NOTE: gemini-2.0-flash and gemini-1.5-* are deprecated/removed by Google (March 2026).
      // Only use gemini-2.5-* models.
      const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
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

      // Helper: wait for given ms
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (const model of models) {
        // Build request body — disable thinking for all 2.5 models to avoid
        // 400 errors (thinking ON requires maxOutputTokens > thinkingBudget)
        const requestBody = {
          contents: [{
            parts: [
              { text: prompt },
              imageParts,
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            // Disable thinking: our app only needs short JSON responses,
            // and small maxOutputTokens conflicts with thinking budget.
            thinkingConfig: { thinkingBudget: 0 },
          },
        };

        // Try each model with up to 3 retries for rate limit (429) errors
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });

            if (response.ok) {
              const data = await response.json();
              analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (analysisText) {
                success = true;
                break;
              }
            } else if (response.status === 429) {
              // Rate limited — wait and retry
              const waitTime = (attempt + 1) * 3000; // 3s, 6s, 9s
              console.warn(`Gemini ${model} rate limited (429). Waiting ${waitTime / 1000}s before retry ${attempt + 1}/3...`);
              lastError = `${model}: Rate limited (429). Retried ${attempt + 1} times.`;
              await sleep(waitTime);
              continue; // retry same model
            } else if (response.status === 403) {
              // Forbidden — API not enabled or key invalid, skip model
              lastError = `${model}: Access denied (403). Check if Generative Language API is enabled in Google Cloud Console.`;
              console.warn(`Gemini ${model}: 403 Forbidden — skipping`);
              break; // skip to next model
            } else {
              const errText = await response.text();
              lastError = `${model} error ${response.status}: ${errText.substring(0, 200)}`;
              console.warn(`Gemini ${model} failed: ${response.status}`, errText.substring(0, 200));
              break; // skip to next model for other errors
            }
          } catch (modelErr) {
            lastError = modelErr.message;
            console.warn(`Gemini ${model} failed:`, modelErr.message);
            break; // skip to next model on network errors
          }
        }
        if (success) break;
      }

      if (!success) {
        return res.status(500).json({
          success: false,
          error: `AI analysis failed after retries. ${lastError}. Tips: 1) Wait 1 minute and try again. 2) Switch to ChatGPT in AI Settings. 3) Check your API key is valid.`,
        });
      }
    }

    // Parse the JSON response
    let analysis;
    try {
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
