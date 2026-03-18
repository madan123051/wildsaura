import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AISettings } from '../types';

const SETTINGS_REF = doc(db, 'settings', 'ai_config');

const DEFAULT_SETTINGS: AISettings = {
  geminiKey: 'AIzaSyAt9uflO3WoBkBvSug9aHcDCP1FKLd-jqY',
  deepseekKey: 'sk-80076b2fe6284809ad64ba50ebdc1d88',
  chatgptKey: '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',
  photoAnalysisProvider: 'gemini',
  storyProvider: 'gemini',
  chatProvider: 'gemini',
};

export async function getAISettings(): Promise<AISettings> {
  try {
    const snap = await getDoc(SETTINGS_REF);
    if (snap.exists()) return { ...DEFAULT_SETTINGS, ...snap.data() } as AISettings;
    // First time: save defaults
    await setDoc(SETTINGS_REF, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  await setDoc(SETTINGS_REF, settings);
}
