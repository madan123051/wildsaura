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

    const prompt = `You are Madan Shrestha, a wildlife photographer from Nepal based in Japan. You run "WILDS AURA" photography website. Write a story about this photo for your website.

PHOTO DETAILS:
- Title: ${photoTitle || 'Untitled'}
- Subject: ${animalName || 'wildlife'}
- Location: ${location || 'the wild'}
- Description: ${caption || ''}

${wikiInfo ? `PHOTO CONTEXT (optional, do not quote as facts):\n${wikiInfo}` : ''}

WRITING STYLE — THIS IS CRITICAL:
You are writing like a REAL photographer sharing a field story. Think of a personal diary entry or a natural Instagram caption — warm, short, human.

DO NOT:
- Mention camera models, lens names, focal lengths, apertures, shutter speeds, or ISO values
- Include encyclopedic/Wikipedia-style animal facts, stats, or trivia
- Use robotic fillers like "Typical, right?", "Learn more about...", or labels like "Story image 1"
- Use fancy vocabulary like "majestic", "breathtaking", "magnificent", "awe-inspiring", "resplendent"
- Write like a nature documentary narrator or a generic AI

DO:
- Focus on mood, weather, patience, stillness, and emotional connection with the moment
- Keep it conversational and simple, like telling a friend what that day felt like
- Include specific scene details from the photo context (light, wind, sounds, waiting), not technical specs
- End with a personal reflective thought

STRUCTURE:
- 2-3 short paragraphs maximum
- Title: Short, natural, non-dramatic
- Excerpt: 1 warm, human sentence

Return ONLY valid JSON:
{
  "title": "short blog-style title",
  "excerpt": "one natural sentence",
  "content": "full story with paragraphs separated by \\n\\n. 2-3 short paragraphs max.",
  "tags": ["specific", "tags", "only"],
  "wikiUrl": "${wikiUrl || ''}"
}`;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let storyText = '';

    if (provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: `DeepSeek API error: ${response.status}` });
      }

      const data = await response.json();
      storyText = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'chatgpt') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: `ChatGPT API error: ${response.status}` });
      }

      const data = await response.json();
      storyText = data.choices?.[0]?.message?.content || '';

    } else {
      // Gemini
      const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      let success = false;
      let lastError = '';

      for (const model of models) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 8192,
                },
              }),
            });

            if (response.ok) {
              const data = await response.json();
              storyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (storyText) { success = true; break; }
            } else if (response.status === 429) {
              const waitTime = (attempt + 1) * 3000;
              lastError = `Rate limited (429)`;
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
        // Fallback story
        const subject = animalName || 'this creature';
        const loc = location || 'the field';
        const fallbackStory = {
          title: photoTitle || `${subject} — Field Notes`,
          excerpt: `Notes from a morning spent tracking ${subject} in ${loc}.`,
          content: `I reached ${loc} early, with soft light and cool air all around. I stayed quiet for a long time, just listening and waiting, letting the place settle me down.\n\nThen I noticed ${caption || `${subject} moving gently through the scene`}. The moment was brief but it felt deeply peaceful. Instead of rushing, I let it unfold and took in the stillness before pressing the shutter.\n\nBy the end, I walked back with a calm mind and a few frames that felt honest to the morning.`,
          tags: [animalName, location, 'wildlife', 'photography', 'field notes'].filter(Boolean),
          wikiUrl: wikiUrl || '',
        };

        return res.status(200).json({
          ...fallbackStory,
          provider: 'wikipedia-fallback',
          note: 'AI was unavailable. Basic story generated. You can edit it.',
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
          title: photoTitle || 'Field Notes',
          excerpt: storyText.substring(0, 150).replace(/\s+\S*$/, '') + '...',
          content: storyText,
          tags: [animalName, location, 'wildlife', 'photography'].filter(Boolean),
          wikiUrl,
        };
      }
    } catch (parseErr) {
      story = {
        title: photoTitle || 'Field Notes',
        excerpt: storyText.substring(0, 150).replace(/\s+\S*$/, '') + '...',
        content: storyText,
        tags: [animalName, location, 'wildlife', 'photography'].filter(Boolean),
        wikiUrl,
      };
    }

    // Post-process: strip AI-sounding words from output
    const aiWords = /\b(majestic|breathtaking|stunning|magnificent|splendor|resplendent|ethereal|enchanting|mesmerizing|captivating|awe-inspiring|pristine|untamed|boundless)\b/gi;
    const aiPhrases = /(capturing the essence|a testament to|in all its glory|raw beauty of nature|nature's grandeur|the circle of life|mother nature)/gi;

    let content = (story.content || '').replace(aiWords, '').replace(aiPhrases, '').replace(/\s{2,}/g, ' ').trim();
    let title = (story.title || '').replace(aiWords, '').replace(/\s+/g, ' ').trim();
    let excerpt = (story.excerpt || '').replace(aiWords, '').replace(aiPhrases, '').replace(/\s+/g, ' ').trim();

    if (!story.wikiUrl && wikiUrl) {
      story.wikiUrl = wikiUrl;
    }

    return res.status(200).json({
      title: title || photoTitle || 'Field Notes',
      excerpt: excerpt || '',
      content: content || '',
      tags: Array.isArray(story.tags) ? story.tags : [],
      wikiUrl: story.wikiUrl || wikiUrl || '',
      provider,
    });

  } catch (err) {
    console.error('Generate story error:', err);
    return res.status(500).json({ error: err.message || 'Story generation failed' });
  }
}
