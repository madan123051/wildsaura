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

    const systemPrompt = `You are the Wilds Aura Photography AI assistant — a friendly, knowledgeable wildlife expert chatbot.

GALLERY INFO:
- Total photos: ${photoCount}
- Animals available: ${uniqueAnimals.join(', ') || 'Various'}
- Categories: ${uniqueCategories.join(', ') || 'Various'}

PHOTO INDEX (animal → photo titles):
${photoSummary || 'No photos yet'}

YOUR PERSONALITY:
- Be warm, enthusiastic, and knowledgeable about wildlife
- Give interesting facts, behavior info, habitat details
- Keep responses concise but informative (2-4 paragraphs max)
- Use emojis naturally 🐾🦁🐘🦅
- If user asks about photography tips, share wildlife photography advice

LANGUAGE RULES:
- If user types in Hindi/Hinglish → reply in Hinglish (Roman Hindi mixed with English)
- If user types in English → reply in English
- Always be natural and conversational, NOT robotic

PHOTO MATCHING RULES:
- ONLY return photo titles that EXACTLY match titles from the PHOTO INDEX above
- Return maximum 4 most relevant photos, NOT all photos
- If the animal is not in gallery, say so and suggest similar animals from the gallery
- NEVER make up photo titles that don't exist in the index

RESPONSE FORMAT (strict JSON):
{
  "reply": "Your conversational response with facts and info",
  "animalName": "English animal name if discussed, else null",
  "wikiSearch": "Animal name for Wikipedia lookup, else null",
  "matchingPhotos": ["exact photo title 1", "exact photo title 2"],
  "suggestions": ["Tiger", "Elephant"] 
}

IMPORTANT:
- "matchingPhotos" must contain EXACT titles from PHOTO INDEX. Max 4 titles.
- "suggestions" = other available animals to explore (only when asked animal is NOT in gallery)
- If user says hi/hello/greetings, respond warmly and suggest they ask about any animal
- If user asks "what animals do you have", list the available animals naturally
- For general wildlife questions (not about a specific animal in gallery), still provide great info but skip matchingPhotos`;

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
                  temperature: 0.7,
                  maxOutputTokens: 8192,
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
            // Shorter, cleaner summary — max 400 chars
            const extract = page.extract.replace(/\n+/g, ' ').trim();
            wikiSummary = extract.substring(0, 400) + (extract.length > 400 ? '...' : '');
          }
        }
      } catch (wikiErr) {
        console.warn('Wikipedia fetch failed:', wikiErr.message);
      }
    }

    return res.status(200).json({
      reply: parsed.reply || parsed.text || content,
      animalName: parsed.animalName || null,
      matchingPhotos: validPhotos,
      matchingPhotoTitles: validPhotos, // backward compatibility
      suggestions: parsed.suggestions || [],
      wikiSummary,
      provider,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
