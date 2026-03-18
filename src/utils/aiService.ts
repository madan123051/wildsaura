// AI Service for Vercel deployment - calls API routes instead of local scripts

export interface PhotoAnalysis {
  title: string;
  caption: string;
  category: 'wildlife' | 'landscape' | 'street' | 'other';
  tags: string[];
  animalName: string;
  location: string;
}

export interface AnalysisResult {
  success: boolean;
  data: PhotoAnalysis;
  error?: string;
}

export async function analyzePhoto(imageData: string): Promise<AnalysisResult> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData }),
    });
    const data = await response.json();
    if (data.success && data.data) {
      return {
        success: true,
        data: {
          title: data.data.title || '',
          caption: data.data.caption || '',
          category: data.data.category || 'wildlife',
          tags: data.data.tags || [],
          animalName: data.data.animalName || '',
          location: data.data.location || '',
        },
      };
    }
    return { success: false, data: getFallback(), error: data.error || 'AI analysis failed' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, data: getFallback(), error: `⚠️ AI failed: ${msg}` };
  }
}

function getFallback(): PhotoAnalysis {
  return {
    title: '',
    caption: '',
    category: 'wildlife',
    tags: ['nature', 'photography', 'wildlife'],
    animalName: '',
    location: '',
  };
}

export async function getAnimalInfo(animal: string): Promise<string> {
  try {
    const response = await fetch(`/api/wikipedia?animal=${encodeURIComponent(animal)}`);
    const data = await response.json();
    return data.success ? data.summary : '';
  } catch (err) {
    return '';
  }
}

// Chat response interface (matches old geminiAI format for AIChatbot compatibility)
export interface ChatResponse {
  text: string;
  matchingPhotoTitles: string[];
  wikiSummary?: string;
  animalName?: string;
  suggestedAnimals?: string[];
}

export async function getChatResponse(
  userMessage: string,
  galleryPhotos: { title: string; category: string; tags?: string[]; animalName?: string; location?: string }[]
): Promise<ChatResponse> {
  const fallback: ChatResponse = {
    text: "I'd love to help! 🐾 Ask me about animals in our gallery, photography tips, or anything wildlife related!",
    matchingPhotoTitles: [],
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        photos: galleryPhotos,
      }),
    });
    const data = await response.json();
    
    if (data.error) {
      return { ...fallback, text: data.error };
    }

    return {
      text: data.reply || data.text || fallback.text,
      matchingPhotoTitles: data.matchingPhotos || data.matchingPhotoTitles || [],
      wikiSummary: data.wikiSummary || undefined,
      animalName: data.animalName || undefined,
      suggestedAnimals: data.suggestions || data.suggestedAnimals || undefined,
    };
  } catch {
    return fallback;
  }
}

// Wikipedia summary (for admin panel)
export async function getWikiSummary(query: string): Promise<{ title: string; summary: string; imageUrl?: string } | null> {
  try {
    const response = await fetch(`/api/wikipedia?animal=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data.success) {
      return { title: query, summary: data.summary };
    }
    return null;
  } catch {
    return null;
  }
}
