export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { photoTitle, animalName, location, caption, wikiInfo, provider = 'gemini', apiKey } = req.body;

    if (!apiKey) return res.status(400).json({ error: 'No API key provided. Please configure your API key in AI Settings.' });

    const wikiUrl = animalName
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(animalName.replace(/\s+/g, '_'))}`
      : '';

    // ── Build the story prompt ──
    const prompt = `You are a wildlife photographer named Madan Shrestha writing for your photography website "WILDS AURA".
Write a compelling, detailed photography story based on this encounter:

Photo Title: ${photoTitle || 'Untitled'}
Animal/Subject: ${animalName || 'wildlife subject'}
Location: ${location || 'the wild'}
Photo Description: ${caption || ''}

${wikiInfo ? `FACTUAL INFORMATION (use this for accurate details about the species):
${wikiInfo}

Wikipedia Reference: ${wikiUrl}` : ''}

Write in first person as the photographer. Create an immersive narrative that includes:
1. Setting the scene - the journey to this location, the atmosphere, time of day
2. The anticipation and patience of waiting for the perfect moment
3. The encounter - describe the animal's behavior in vivid detail using the factual information provided
4. The technical approach - camera settings, lens choice, composition decisions
5. The emotional impact - what this encounter meant to you as a photographer
6. Conservation message - why protecting this species and its habitat matters

Style: Engaging, vivid, emotional. Mix technical photography language with poetic nature writing.
Length: 5-7 substantial paragraphs.
${wikiUrl ? `Include the Wikipedia reference link (${wikiUrl}) naturally at the end of the story.` : ''}

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "title": "compelling story title that draws readers in",
  "excerpt": "2-3 sentence captivating teaser that makes people want to read more",
  "content": "full story text with paragraphs separated by \\n\\n. Include the Wikipedia reference link at the end if available.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "wikiUrl": "${wikiUrl || ''}"
}`;

    // Helper: wait for given ms
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let storyText = '';

    if (provider === 'deepseek') {
      // ── DeepSeek ──
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 3000,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('DeepSeek error:', errText);
        return res.status(500).json({ error: `DeepSeek API error: ${response.status}` });
      }

      const data = await response.json();
      storyText = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'chatgpt') {
      // ── ChatGPT (OpenAI) ──
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 3000,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('ChatGPT error:', errText);
        return res.status(500).json({ error: `ChatGPT API error: ${response.status}` });
      }

      const data = await response.json();
      storyText = data.choices?.[0]?.message?.content || '';

    } else {
      // ── Gemini (default) — with model fallback and retry for 429 rate limits ──
      // NOTE: gemini-2.0-flash and gemini-1.5-* are deprecated/removed by Google (March 2026).
      // Only use gemini-2.5-* models.
      const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      let success = false;
      let lastError = '';

      for (const model of models) {
        // Build request body — disable thinking for 2.5 models to avoid
        // 400 errors (thinking ON requires maxOutputTokens > thinkingBudget)
        const requestBody = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 3000,
            // Disable thinking: our app only needs JSON responses,
            // and small maxOutputTokens conflicts with thinking budget.
            thinkingConfig: { thinkingBudget: 0 },
          },
        };

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
              storyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (storyText) {
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
            } else if (response.status === 403) {
              lastError = `${model}: Access denied (403)`;
              console.warn(`Gemini ${model}: 403 Forbidden — skipping`);
              break;
            } else {
              const errText = await response.text();
              lastError = `${model} error ${response.status}: ${errText.substring(0, 200)}`;
              console.warn(`Gemini ${model} failed: ${response.status}`, errText.substring(0, 200));
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
        // ── FALLBACK: Generate a story using Wikipedia data only (no AI) ──
        console.warn('All Gemini models failed. Using Wikipedia-only fallback story.');
        
        // Try to get Wikipedia info if not already provided
        let wikiContent = wikiInfo || '';
        if (!wikiContent && animalName) {
          try {
            const wikiRes = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(animalName)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
            );
            if (wikiRes.ok) {
              const wikiData = await wikiRes.json();
              const pages = wikiData.query?.pages || {};
              const page = Object.values(pages)[0];
              if (page && page.extract && !page.missing) {
                wikiContent = page.extract.substring(0, 1000);
              }
            }
          } catch (e) {
            console.warn('Wikipedia fallback also failed:', e.message);
          }
        }

        // Build a beautiful template story from available data
        const subject = animalName || 'this magnificent creature';
        const loc = location || 'the wilderness';
        const desc = caption || `a stunning ${subject} in its natural habitat`;

        const fallbackStory = {
          title: photoTitle || `Encounter with ${subject}`,
          excerpt: `A breathtaking encounter with ${subject} in ${loc}. ${wikiContent ? wikiContent.substring(0, 150) + '...' : `This moment captured the raw beauty of nature.`}`,
          content: `The morning air was crisp as I ventured deep into ${loc}, my camera gear slung over my shoulder and anticipation building with every step. As a wildlife photographer, these moments of solitude in nature are what I live for — the quiet before the extraordinary.\n\n${desc}. I had been tracking signs of ${subject} for hours, moving silently through the terrain, when suddenly the moment presented itself. My heart raced as I slowly raised my camera, careful not to make any sudden movements that might disturb this incredible scene.\n\n${wikiContent ? `${subject} is truly fascinating. ${wikiContent}\n\n` : ''}The encounter lasted only a few precious minutes, but in those moments, time seemed to stand still. I fired off several shots, adjusting my composition and settings to capture every nuance of the scene. The golden light filtering through created a natural spotlight on ${subject}, as if nature itself was directing this photograph.\n\nAs a photographer from Nepal now based in Japan, I've been fortunate to witness incredible wildlife across two very different landscapes. But encounters like this one remind me why I do what I do — to share the untold stories of wildlife and their habitats, and to inspire others to protect these precious moments.\n\nEvery photograph is more than just an image; it's a testament to the patience, respect, and deep love for nature that drives wildlife photography. I hope this story inspires you to step outside, observe the natural world around you, and find your own moment of wonder.\n\n${wikiUrl ? `Learn more about ${subject}: ${wikiUrl}` : '— Madan Shrestha | WILDS AURA'}`,
          tags: [animalName, location, 'wildlife', 'photography', 'nature', 'conservation'].filter(Boolean),
          wikiUrl: wikiUrl || '',
        };

        return res.status(200).json({
          ...fallbackStory,
          provider: 'wikipedia-fallback',
          note: 'AI was rate limited. Story generated from Wikipedia data. You can edit and improve it manually.',
        });
      }
    }

    // Parse story JSON
    let story;
    try {
      const jsonMatch = storyText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        story = JSON.parse(jsonMatch[0]);
      } else {
        story = {
          title: photoTitle || 'Wildlife Encounter',
          excerpt: storyText.substring(0, 200) + '...',
          content: storyText,
          tags: [animalName, location, 'wildlife', 'photography', 'nature'].filter(Boolean),
          wikiUrl: wikiUrl,
        };
      }
    } catch (parseErr) {
      console.warn('Story JSON parse failed, using raw text:', parseErr.message);
      story = {
        title: photoTitle || 'Wildlife Encounter',
        excerpt: storyText.substring(0, 200) + '...',
        content: storyText,
        tags: [animalName, location, 'wildlife', 'photography', 'nature'].filter(Boolean),
        wikiUrl: wikiUrl,
      };
    }

    if (!story.wikiUrl && wikiUrl) {
      story.wikiUrl = wikiUrl;
    }

    return res.status(200).json({
      title: story.title || photoTitle || 'Wildlife Encounter',
      excerpt: story.excerpt || '',
      content: story.content || '',
      tags: Array.isArray(story.tags) ? story.tags : [],
      wikiUrl: story.wikiUrl || wikiUrl || '',
      provider,
    });

  } catch (err) {
    console.error('Generate story error:', err);
    return res.status(500).json({ error: err.message || 'Story generation failed' });
  }
}
