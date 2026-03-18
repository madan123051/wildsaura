export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, photos, provider = 'gemini', apiKey } = req.body;

    // Fallback: use env var if no key provided (backward compatibility)
    const resolvedKey = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!resolvedKey) return res.status(500).json({ error: 'API key not configured' });

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

    let content = '';

    // Helper: wait for given ms
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    if (provider === 'gemini') {
      // ── Gemini — with retry for 429 rate limits ──
      const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      let success = false;
      let lastError = '';

      for (const model of models) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolvedKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: `${systemPrompt}\n\nUser message: ${message}` }],
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 8192,
                  },
              }),
            });

            if (response.ok) {
              const data = await response.json();
              content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (content) {
                success = true;
                break;
              }
            } else if (response.status === 429) {
              // Rate limited — wait and retry
              const waitTime = (attempt + 1) * 3000; // 3s, 6s, 9s
              console.warn(`Gemini ${model} rate limited (429). Waiting ${waitTime / 1000}s before retry ${attempt + 1}/3...`);
              lastError = `Rate limited (429)`;
              await sleep(waitTime);
              continue;
            } else {
              lastError = `${model} error ${response.status}`;
              console.warn(`Gemini ${model} failed for chat: ${response.status}`);
              break;
            }
          } catch (modelErr) {
            lastError = modelErr.message;
            console.warn(`Gemini ${model} failed for chat:`, modelErr.message);
            break;
          }
        }
        if (success) break;
      }

      if (!success) {
        return res.status(500).json({ error: `Gemini chat failed after retries. ${lastError}. Please wait a moment and try again.` });
      }

    } else if (provider === 'chatgpt') {
      // ── ChatGPT (OpenAI) ──
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resolvedKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('ChatGPT chat error:', errText);
        return res.status(500).json({ error: `ChatGPT API error: ${response.status}` });
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';

    } else {
      // ── DeepSeek (default fallback for backward compatibility) ──
      const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resolvedKey}`,
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
      content = dsData.choices?.[0]?.message?.content || '';
    }

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
      provider,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
