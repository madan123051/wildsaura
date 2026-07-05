import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AISettings } from '../types';

const SETTINGS_REF = doc(db, 'settings', 'ai_config');

const DEFAULT_SETTINGS: AISettings = {
  geminiKey: '',
  deepseekKey: '',
  chatgptKey: '',
  photoAnalysisProvider: 'gemini',
  storyProvider: 'gemini',
  chatProvider: 'gemini',
};

function sanitizeSettings(settings: Partial<AISettings>): AISettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    geminiKey: '',
    deepseekKey: '',
    chatgptKey: '',
  } as AISettings;
}

export async function getAISettings(): Promise<AISettings> {
  try {
    const snap = await getDoc(SETTINGS_REF);
    if (snap.exists()) return sanitizeSettings(snap.data() as Partial<AISettings>);
    // First time: save defaults
    await setDoc(SETTINGS_REF, sanitizeSettings(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  await setDoc(SETTINGS_REF, sanitizeSettings(settings));
}
