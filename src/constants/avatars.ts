// src/constants/avatars.ts
// ✨ UNIFIED AVATAR SYSTEM - Single source of truth

export const ANIMAL_AVATARS = [
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'elephant', emoji: '🐘', label: 'Elephant' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'eagle', emoji: '🦅', label: 'Eagle' },
  { id: 'deer', emoji: '🦌', label: 'Deer' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
  { id: 'fox', emoji: '🦊', label: 'Fox' },
];

export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
];

// Helper function to get avatar emoji by ID
export const getAvatarEmoji = (animalId?: string): string | null => {
  if (!animalId) return null;
  return ANIMAL_AVATARS.find(a => a.id === animalId)?.emoji || null;
};

// Helper function to get avatar label by ID
export const getAvatarLabel = (animalId?: string): string | undefined => {
  if (!animalId) return undefined;
  return ANIMAL_AVATARS.find(a => a.id === animalId)?.label;
};

// Type for animal avatar
export type AnimalAvatarType = typeof ANIMAL_AVATARS[number];
