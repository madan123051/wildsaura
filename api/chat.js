export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, photos, provider = 'gemini', apiKey } = req.body;

    const resolvedKey = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!resolvedKey) return res.status(500).json({ error: 'API key not configured' });

    // Hindi animal name mapping (expanded)
    const hindiMap = {
      'sher': 'Tiger', 'baagh': 'Tiger', 'bagh': 'Tiger', 'tiger': 'Tiger',
      'hathi': 'Elephant', 'haathi': 'Elephant', 'elephant': 'Elephant',
      'bandar': 'Monkey', 'monkey': 'Monkey',
      'mor': 'Peacock', 'mayur': 'Peacock', 'peacock': 'Peacock',
      'cheetah': 'Cheetah', 'cheeta': 'Cheetah',
      'girgit': 'Chameleon', 'chameleon': 'Chameleon',
      'saanp': 'Snake', 'samp': 'Snake', 'snake': 'Snake',
      'machhli': 'Fish', 'fish': 'Fish',
      'magarmach': 'Crocodile', 'crocodile': 'Crocodile', 'magar': 'Crocodile',
      'ullu': 'Owl', 'owl': 'Owl',
      'tota': 'Parrot', 'parrot': 'Parrot',
      'gaay': 'Cow', 'cow': 'Cow',
      'ghoda': 'Horse', 'horse': 'Horse',
      'bhalu': 'Bear', 'bear': 'Bear',
      'hirn': 'Deer', 'hiran': 'Deer', 'deer': 'Deer',
      'lomdi': 'Fox', 'fox': 'Fox',
      'bhediya': 'Wolf', 'wolf': 'Wolf',
      'genda': 'Rhinoceros', 'gainda': 'Rhinoceros', 'rhino': 'Rhinoceros',
      'chidiya': 'Bird', 'pakshi': 'Bird', 'bird': 'Bird',
      'macchar': 'Mosquito', 'titli': 'Butterfly', 'butterfly': 'Butterfly',
      'kutta': 'Dog', 'dog': 'Dog', 'billi': 'Cat', 'cat': 'Cat',
      'gidh': 'Vulture', 'vulture': 'Vulture',
      'kabutar': 'Pigeon', 'pigeon': 'Pigeon',
      'hans': 'Swan', 'swan': 'Swan',
      'bagula': 'Heron', 'heron': 'Heron',
      'kingfisher': 'Kingfisher',
      'eagle': 'Eagle', 'cheel': 'Eagle',
      'hawk': 'Hawk', 'baaz': 'Hawk',
      'leopard': 'Leopard', 'tendua': 'Leopard',
      'lion': 'Lion', 'singh': 'Lion', 'babbar sher': 'Lion',
      'gorilla': 'Gorilla', 'zebra': 'Zebra', 'giraffe': 'Giraffe',
      'dolphin': 'Dolphin', 'whale': 'Whale', 'shark': 'Shark',
      'turtle': 'Turtle', 'kachhua': 'Turtle',
      'frog': 'Frog', 'mendhak': 'Frog',
      'rabbit': 'Rabbit', 'khargosh': 'Rabbit',
      'squirrel': 'Squirrel', 'gilhari': 'Squirrel',
    };

    // Detect Hindi
    const isHindi = /[\u0900-\u097F]/.test(message) ||
      Object.keys(hindiMap).some(k => message.toLowerCase().includes(k));

    // Build a concise photo catalog (not full list dump)
    const uniqueAnimals = [...new Set(photos?.map(p => p.animalName).filter(Boolean) || [])];
    const uniqueCategories = [...new Set(photos?.map(p => p.category).filter(Boolean) || [])];
    const photoCount = photos?.length || 0;

    // Build compact photo index: group by animal name
    const photoIndex = {};
    (photos || []).forEach(p => {
      const key = (p.animalName || p.category || 'other').toLowerCase();
      if (!photoIndex[key]) photoIndex[key] = [];
      photoIndex[key].push(p.title);
    });

    const photoSummary = Object.entries(photoIndex)
      .map(([animal, titles]) => `${animal}: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? ` (+${titles.length - 3} more)` : ''}`)
      .join('\n');

    const systemPrompt = `Wilds Aura chatbot: gallery-only assistant.
Reply max 30 words, 1-2 short sentences.
No encyclopedia/Wikipedia facts, no habitat/DNA/behavior teaching.
Only help users find photos that exist in this gallery.

GALLERY:
- Total photos: ${photoCount}
- Animals: ${uniqueAnimals.join(', ') || 'Various'}
- Categories: ${uniqueCategories.join(', ') || 'Various'}
- Index:
${photoSummary || 'No photos yet'}

Rules:
- Hindi/Hinglish input -> Hinglish reply. English input -> English reply.
- If animal exists: one short welcome sentence + include exact matching photo titles (max 4).
- If animal missing: say "I don't have photos of [animal] in my gallery yet, but check out these other amazing species I have captured!" and suggest existing animals.
- Never invent titles.
- Never set wikiSearch.

Return strict JSON:
{
  "reply": "Very short response within 30 words",
  "animalName": "English animal name if discussed, else null",
  "wikiSearch": null,
  "matchingPhotos": ["exact photo title 1", "exact photo title 2"],
  "suggestions": ["Tiger", "Chimpanzee"]
}`;

    let content = '';
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    if (provider === 'gemini') {
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
                  temperature: 0.2,
                  maxOutputTokens: 120,
                  responseMimeType: 'application/json',
                },
              }),
            });

            if (response.ok) {
              const data = await response.json();
              content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (content) { success = true; break; }
            } else if (response.status === 429) {
              const waitTime = (attempt + 1) * 3000;
              console.warn(`Gemini ${model} rate limited (429). Waiting ${waitTime / 1000}s...`);
              lastError = `Rate limited (429)`;
              await sleep(waitTime);
              continue;
            } else {
              lastError = `${model} error ${response.status}`;
              console.warn(`Gemini ${model} failed: ${response.status}`);
              break;
            }
          } catch (modelErr) {
            lastError = modelErr.message;
            console.warn(`Gemini ${model} failed:`, modelErr.message);
            break;
          }
        }
        if (success) break;
      }

      if (!success) {
        return res.status(500).json({ error: `AI unavailable. ${lastError}. Please try again.` });
      }

    } else if (provider === 'chatgpt') {
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
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('ChatGPT error:', errText);
        return res.status(500).json({ error: `ChatGPT API error: ${response.status}` });
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';

    } else {
      // DeepSeek
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
          max_tokens: 1000,
        }),
      });

      if (!dsResponse.ok) {
        const errText = await dsResponse.text();
        return res.status(500).json({ error: `DeepSeek API error: ${errText}` });
      }

      const dsData = await dsResponse.json();
      content = dsData.choices?.[0]?.message?.content || '';
    }

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: content };
    } catch {
      parsed = { reply: content };
    }

    // Normalize matchingPhotos field
    const matchingPhotos = parsed.matchingPhotos || parsed.matchingPhotoTitles || [];

    // Validate matching photos — only keep titles that actually exist in gallery
    const validPhotos = matchingPhotos.filter(title => 
      (photos || []).some(p => p.title.toLowerCase() === title.toLowerCase())
    ).slice(0, 4); // Max 4

    return res.status(200).json({
      reply: parsed.reply || parsed.text || content,
      animalName: parsed.animalName || null,
      matchingPhotos: validPhotos,
      matchingPhotoTitles: validPhotos, // backward compatibility
      suggestions: parsed.suggestions || [],
      provider,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
