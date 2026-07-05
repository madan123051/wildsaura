// AI Service for Vercel deployment - calls API routes with multi-provider support
import { getAISettings } from '../services/aiSettingsService';
import { AISettings } from '../types';

// ── Interfaces ──────────────────────────────────────────────────────────────

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

export interface ChatResponse {
  text: string;
  matchingPhotoTitles: string[];
  animalName?: string;
  suggestedAnimals?: string[];
}

export interface StoryResult {
  success: boolean;
  title?: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  wikiUrl?: string;
  error?: string;
}

// ── Settings Cache ──────────────────────────────────────────────────────────

let cachedSettings: AISettings | null = null;
let cacheTime = 0;
const CACHE_DURATION = 300000; // 5 minutes

async function getSettings(): Promise<AISettings> {
  if (cachedSettings && Date.now() - cacheTime < CACHE_DURATION) return cachedSettings;
  cachedSettings = await getAISettings();
  cacheTime = Date.now();
  return cachedSettings;
}

// Clear cache (useful when settings are updated in admin panel)
export function clearAISettingsCache(): void {
  cachedSettings = null;
  cacheTime = 0;
}

// ── Photo Analysis ──────────────────────────────────────────────────────────

export async function analyzePhoto(imageData: string): Promise<AnalysisResult> {
  try {
    const settings = await getSettings();
    const provider = settings.photoAnalysisProvider;

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, provider }),
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

// ── Animal Info (Wikipedia - no AI needed) ───────────────────────────────────

export async function getAnimalInfo(animal: string): Promise<string> {
  try {
    const response = await fetch(`/api/wikipedia?animal=${encodeURIComponent(animal)}`);
    const data = await response.json();
    return data.success ? data.summary : '';
  } catch {
    return '';
  }
}

// ── Chat Response ───────────────────────────────────────────────────────────

export async function getChatResponse(
  userMessage: string,
  galleryPhotos: { title: string; category: string; tags?: string[]; animalName?: string; location?: string }[]
): Promise<ChatResponse> {
  const fallback: ChatResponse = {
    text: "I can help you find animals available in this gallery. Try Tiger, Chimpanzee, or Lion.",
    matchingPhotoTitles: [],
  };

  try {
    const settings = await getSettings();
    const provider = settings.chatProvider;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        photos: galleryPhotos,
        provider,
      }),
    });
    const data = await response.json();

    if (data.error) {
      return { ...fallback, text: data.error };
    }

    return {
      text: data.reply || data.text || fallback.text,
      matchingPhotoTitles: data.matchingPhotos || data.matchingPhotoTitles || [],
      animalName: data.animalName || undefined,
      suggestedAnimals: data.suggestions || data.suggestedAnimals || undefined,
    };
  } catch {
    return fallback;
  }
}

// ── Story Generation (NEW) ──────────────────────────────────────────────────

export async function generateStory(
  photoTitle: string,
  animalName: string,
  location: string,
  caption: string,
  wikiInfo: string
): Promise<StoryResult> {
  try {
    const settings = await getSettings();
    const provider = settings.storyProvider;

    const response = await fetch('/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoTitle,
        animalName,
        location,
        caption,
        wikiInfo,
        provider,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Story generation failed' };
    }

    return {
      success: true,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      tags: data.tags,
      wikiUrl: data.wikiUrl,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: `Story generation failed: ${msg}` };
  }
}

// ── Wikipedia Summary (for admin panel) ─────────────────────────────────────

export async function getWikiSummary(query: string): Promise<{ title: string; summary: string; url?: string; imageUrl?: string } | null> {
  try {
    const response = await fetch(`/api/wikipedia?animal=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data.success) {
      return { title: query, summary: data.summary, url: data.url };
    }
    return null;
  } catch {
    return null;
  }
}
