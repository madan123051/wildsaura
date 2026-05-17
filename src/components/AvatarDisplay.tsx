import React from 'react';
import { ANIMAL_AVATARS } from '../constants/avatarConstants';

interface AvatarDisplayProps {
  displayName?: string;
  avatarUrl?: string;
  spiritAnimal?: string;
  avatarColor?: string;
  size?: number;
  showBorder?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Unified Avatar Component — used everywhere across the app:
 *  • Header sidebar (size ~44)
 *  • Community posts (size ~42)
 *  • Profile Modal (size ~88)
 *
 * Priority: profilePhoto > spiritAnimal emoji > initial letter
 */
export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  displayName = 'U',
  avatarUrl,
  spiritAnimal,
  avatarColor = '#4ECDC4',
  size = 48,
  showBorder = true,
  isClickable = false,
  onClick,
  className = '',
  style = {},
}) => {
  // Get spirit animal emoji if it exists
  const animalEntry = spiritAnimal
    ? ANIMAL_AVATARS.find(a => a.id === spiritAnimal)
    : null;
  const animalEmoji = animalEntry?.emoji || null;

  // Get initial letter
  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';

  // Background: transparent when photo, green tint when emoji, avatarColor when initial
  const bgColor = avatarUrl
    ? 'transparent'
    : animalEmoji
      ? 'rgba(79,159,98,0.22)'
      : avatarColor;

  // Determine font size based on avatar size
  const fontSize = animalEmoji
    ? `${Math.round(size * 0.55)}px`
    : `${Math.round(size * 0.42)}px`;

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    fontWeight: 700,
    overflow: 'hidden',
    border: showBorder ? '2px solid rgba(168,216,162,0.55)' : 'none',
    flexShrink: 0,
    cursor: isClickable && onClick ? 'pointer' : 'default',
    transition: 'opacity 0.2s',
    ...style,
  };

  const handleClick = () => {
    if (isClickable && onClick) onClick();
  };

  return (
    <div
      className={className}
      style={containerStyle}
      title={displayName}
      onClick={handleClick}
      onMouseOver={(e) => {
        if (isClickable && onClick) (e.currentTarget as HTMLDivElement).style.opacity = '0.82';
      }}
      onMouseOut={(e) => {
        if (isClickable && onClick) (e.currentTarget as HTMLDivElement).style.opacity = '1';
      }}
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
