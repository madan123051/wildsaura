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

${wikiInfo ? `SPECIES INFO (use for accuracy, don't copy-paste):\n${wikiInfo}` : ''}

WRITING STYLE — THIS IS CRITICAL:
You are writing like a REAL photographer sharing a field story. Think of how photographers write on their blogs — casual, personal, real.

DO NOT:
- Use fancy vocabulary like "majestic", "breathtaking", "magnificent", "awe-inspiring", "resplendent"
- Write like a nature documentary narrator
- Use phrases like "capturing the essence", "a testament to", "in all its glory", "raw beauty of nature"
- Start every paragraph with dramatic descriptions
- Use excessive adjectives
- Sound like ChatGPT or any AI — readers can instantly tell
- Write generic conservation messages that sound copy-pasted

DO:
- Write like you're telling a friend about your day in the field
- Be specific — mention real details (time, weather, equipment, what went wrong)
- Keep it conversational. Short sentences mixed with longer ones.
- Include one or two interesting facts about the animal (from wiki info) but weave them in naturally
- Share genuine emotions — frustration when the shot didn't work, excitement when it did
- Mention specific camera details naturally (not like a specs list)
- End with a personal thought, not a generic conservation lecture
- Use simple, clear English. No poetry.

STRUCTURE:
- 3-4 paragraphs (not 7). Keep it tight. Readers scroll fast.
- Title: Short, specific. Not dramatic. Like a blog post title.
- Excerpt: 1 sentence that sounds like the first line of a blog post, not a movie trailer.

EXAMPLES OF BAD WRITING (do NOT write like this):
❌ "The morning sun cast its golden rays across the pristine wilderness as I embarked on my journey..."
❌ "In the heart of the untamed jungle, a magnificent creature revealed itself in all its breathtaking splendor..."
❌ "This encounter was a profound reminder of nature's boundless beauty and the urgent need for conservation..."

EXAMPLES OF GOOD WRITING (write like this):
✅ "I'd been sitting in the same spot for three hours. My legs were numb and I was about to pack up when I heard movement in the tall grass."
✅ "The tiger was maybe 30 meters away, completely unbothered. It walked along the riverbank, stopped to drink, and moved on. The whole thing lasted about two minutes."
✅ "I shot this at f/5.6, ISO 800 — not ideal, but the light was fading fast and I didn't want to miss it."

${wikiUrl ? `Reference: ${wikiUrl} — mention this naturally if relevant, like "According to..." or as a 'Learn more' link at the end.` : ''}

Return ONLY valid JSON:
{
  "title": "short blog-style title",
  "excerpt": "one natural sentence",
  "content": "full story with paragraphs separated by \\n\\n. 3-4 paragraphs max.",
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
          content: `I got to ${loc} around 6 AM. The plan was simple — find ${subject} and get a decent shot before the light got too harsh. Easier said than done.\n\nAfter about an hour of walking, I spotted movement. ${caption || `A ${subject} was there, partially hidden.`} I set up quickly — my usual setup, trying to keep steady while my hands were still cold from the morning air.\n\n${wikiInfo ? `${subject} is interesting — ${wikiInfo.substring(0, 300).replace(/\n/g, ' ').trim()}. Knowing this stuff helps in the field because you can predict behavior.\n\n` : ''}The whole encounter was over in a few minutes. But that's wildlife photography — hours of waiting for moments that last seconds. I checked my shots on the way back and was happy with what I got.\n\n${wikiUrl ? `More about ${subject}: ${wikiUrl}` : '— Madan Shrestha | WILDS AURA'}`,
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
