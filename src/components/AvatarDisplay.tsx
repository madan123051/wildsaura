import React from 'react';

interface AvatarDisplayProps {
  displayName?: string;
  avatarUrl?: string;
  spiritAnimal?: string;
  avatarColor?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Animal emoji mappings - same as ProfileModal
const ANIMAL_EMOJIS: Record<string, string> = {
  'tiger': '🐯',
  'lion': '🦁',
  'elephant': '🐘',
  'wolf': '🐺',
  'eagle': '🦅',
  'deer': '🦌',
  'owl': '🦉',
  'fox': '🦊',
};

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  displayName = 'U',
  avatarUrl,
  spiritAnimal,
  avatarColor = '#4ECDC4',
  size = 48,
  className = '',
  style = {},
}) => {
  // Get spirit animal emoji if it exists
  const animalEmoji = spiritAnimal ? ANIMAL_EMOJIS[spiritAnimal.toLowerCase()] : null;
  
  // Get initial letter
  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
  
  // Determine background color - use green if there's a spirit animal
  const bgColor = animalEmoji ? 'rgba(79,159,98,0.22)' : avatarColor;
  
  // Determine font size based on avatar size
  const isSmall = size < 60;
  const fontSize = animalEmoji 
    ? `${size * 0.6}px`  // Larger emoji
    : `${size * 0.45}px`; // Smaller initial
  
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: avatarUrl ? 'transparent' : bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    fontWeight: 700,
    overflow: 'hidden',
    border: '2px solid rgba(168,216,162,0.55)',
    flexShrink: 0,
    ...style,
  };

  return (
    <div
      className={className}
      style={containerStyle}
      title={displayName}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        animalEmoji || initial
      )}
    </div>
  );
};

export default AvatarDisplay;