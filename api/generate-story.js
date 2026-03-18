export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { photoTitle, animalName, location, caption, wikiInfo, provider = 'gemini', apiKey } = req.body;

    if (!apiKey) return res.status(400).json({ error: 'No API key provided' });

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
      // ── Gemini (default) ──
      const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
      let success = false;

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 3000,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            storyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (storyText) {
              success = true;
              break;
            }
          }
        } catch (modelErr) {
          console.warn(`Gemini ${model} failed:`, modelErr.message);
        }
      }

      if (!success) {
        return res.status(500).json({ error: 'All Gemini models failed for story generation' });
      }
    }

    // Parse story JSON
    let story;
    try {
      const jsonMatch = storyText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        story = JSON.parse(jsonMatch[0]);
      } else {
        // If AI returned plain text, wrap it
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

    // Ensure wikiUrl is in the response
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
