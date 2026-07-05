export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageData, provider = 'gemini' } = req.body;
    const apiKey = provider === 'chatgpt' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY;
    if (!imageData) return res.status(400).json({ success: false, error: 'No image data provided' });
    if (!apiKey) return res.status(500).json({ success: false, error: `${provider} API key is not configured in Vercel environment variables.` });

    const prompt = `You are a professional wildlife photographer writing for your own portfolio website. Analyze this photo and write like a real photographer would — not like AI.

RULES FOR WRITING:
- Title: Short, specific, evocative. Like a photographer names their shot. 3-7 words max. NO generic phrases like "Majestic Beauty" or "A Glimpse of Nature". Use the actual subject. Examples of GOOD titles: "Morning Hunt", "Spotted Deer at Dawn", "The Watchful Owl", "Monsoon Kingfisher", "Tiger Crossing the Stream"
- Caption: 1 short sentence. What's happening in the photo. Write like a photo caption in National Geographic — factual, clear, specific. NO flowery language. NO "showcasing" or "capturing the essence" or "breathtaking". Just describe what you see. Example: "A Bengal tiger wades through shallow water in Chitwan, early morning light catching its wet fur."
- Tags: Specific, useful tags. Include species name, behavior, habitat, season if visible.
- Location: Only if you can genuinely identify it from vegetation/terrain. Don't guess randomly.

BAD examples (too AI-sounding):
- "Majestic Tiger in its Natural Splendor" ❌
- "This breathtaking photograph captures the raw beauty of nature as a magnificent creature..." ❌
- "A stunning display of wildlife photography showcasing..." ❌

GOOD examples (natural, professional):
- Title: "Waiting for Prey" ✅
- Caption: "A crested serpent eagle perches silently on a dry branch, scanning the forest floor below." ✅

Return ONLY valid JSON:
{
  "title": "short specific title",
  "caption": "one clear sentence describing the photo",
  "category": "wildlife" or "landscape" or "street" or "other",
  "tags": ["specific", "useful", "tags"],
  "animalName": "common name or empty string",
  "scientificName": "scientific name or empty string",
  "location": "location if identifiable or empty string"
}`;

    let analysisText = '';

    if (provider === 'chatgpt') {
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
          temperature: 0.4,
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
      // Gemini Vision
      const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      let success = false;
      let lastError = '';

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

      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (const model of models) {
        for (let attempt = 0; attempt < 3; attempt++) {
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
                  temperature: 0.4,
                  maxOutputTokens: 4096,
                },
              }),
            });

            if (response.ok) {
              const data = await response.json();
              analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (analysisText) { success = true; break; }
            } else if (response.status === 429) {
              const waitTime = (attempt + 1) * 3000;
              console.warn(`Gemini ${model} rate limited (429). Waiting ${waitTime / 1000}s...`);
              lastError = `${model}: Rate limited (429)`;
              await sleep(waitTime);
              continue;
            } else if (response.status === 403) {
              lastError = `${model}: Access denied (403)`;
              break;
            } else {
              lastError = `${model} error ${response.status}`;
              break;
            }
          } catch (modelErr) {
            lastError = modelErr.message;
            break;
          }
        }
        if (success) break;
      }

      if (!success) {
        return res.status(500).json({
          success: false,
          error: `AI analysis failed. ${lastError}. Try again in a minute or switch provider in AI Settings.`,
        });
      }
    }

    // Parse JSON response
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
      console.error('JSON parse error:', parseErr.message);
      return res.status(500).json({ success: false, error: 'Failed to parse AI response. Please try again.' });
    }

    // Post-process: enforce quality rules
    let title = (analysis.title || '').trim();
    let caption = (analysis.caption || analysis.description || '').trim();

    // Strip AI-sounding words from title
    const aiWords = /\b(majestic|breathtaking|stunning|magnificent|splendor|glorious|resplendent|ethereal|enchanting|mesmerizing|captivating|awe-inspiring)\b/gi;
    title = title.replace(aiWords, '').replace(/\s+/g, ' ').trim();

    // If title is too long, truncate at last word before 50 chars
    if (title.length > 50) {
      title = title.substring(0, 50).replace(/\s+\S*$/, '');
    }

    // Strip AI phrases from caption
    const aiPhrases = /\b(showcasing|capturing the essence|a testament to|breathtaking|stunning display|raw beauty|nature's|in all its glory|magnificent|majestic)\b/gi;
    caption = caption.replace(aiPhrases, '').replace(/\s+/g, ' ').replace(/^[,.\s]+/, '').trim();

    // Limit caption to ~150 chars (1-2 sentences)
    if (caption.length > 200) {
      // Find sentence end before 200 chars
      const sentenceEnd = caption.substring(0, 200).lastIndexOf('.');
      if (sentenceEnd > 50) {
        caption = caption.substring(0, sentenceEnd + 1);
      } else {
        caption = caption.substring(0, 200).replace(/\s+\S*$/, '') + '.';
      }
    }

    const result = {
      title,
      caption,
      category: ['wildlife', 'landscape', 'street', 'other'].includes(analysis.category) ? analysis.category : 'wildlife',
      tags: Array.isArray(analysis.tags) ? analysis.tags.slice(0, 10) : [],
      animalName: analysis.animalName || analysis.animal || '',
      scientificName: analysis.scientificName || '',
      location: analysis.location || '',
    };

    // Wikipedia info
    let wikiSummary = '';
    if (result.animalName) {
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.animalName)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
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

    return res.status(200).json({ success: true, data: result, wikiSummary, provider });

  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
