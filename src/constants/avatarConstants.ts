// Shared avatar configuration - used by Header, ProfileModal, CommunityPage
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

// Helper to get avatar emoji for a visitor's spirit animal
export function getVisitorAvatarEmoji(avatarAnimal?: string): string | null {
  if (!avatarAnimal) return null;
  const animal = ANIMAL_AVATARS.find(a => a.id === avatarAnimal);
  return animal?.emoji || null;
}
