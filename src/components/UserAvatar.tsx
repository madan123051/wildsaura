import React from 'react';
import { User } from '../types';
import { ANIMAL_AVATARS } from '../constants/avatars';

interface UserAvatarProps {
  user?: User | null;
  size?: 'small' | 'medium' | 'large';
  showBorder?: boolean;
  onClick?: () => void;
  isClickable?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'medium',
  showBorder = false,
  onClick,
  isClickable = false,
}) => {
  // Safety check: if no user, show placeholder
  if (!user) {
    return (
      <div
        className={`${
          size === 'small' ? 'w-8 h-8' : size === 'medium' ? 'w-12 h-12' : 'w-24 h-24'
        } rounded-full bg-gray-300 animate-pulse`}
      />
    );
  }

  // Get avatar configuration with fallback
  const spiritAnimal = user.spiritAnimal || 'leopard';
  const avatarConfig = ANIMAL_AVATARS[spiritAnimal] || ANIMAL_AVATARS['leopard'];

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-8 h-8',
      text: 'text-xs',
      border: 'border-2',
    },
    medium: {
      container: 'w-12 h-12',
      text: 'text-sm',
      border: 'border-2',
    },
    large: {
      container: 'w-24 h-24',
      text: 'text-3xl',
      border: 'border-4',
    },
  };

  const config = sizeConfig[size];

  // Determine if we should show spirit animal or initials
  const showSpiritAnimal = size === 'large' || (size === 'medium' && showBorder);
  const userName = user.name || 'U';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const containerClass = `
    ${config.container}
    ${showBorder ? config.border : 'border-0'}
    rounded-full
    flex
    items-center
    justify-center
    font-bold
    transition-all
    ${isClickable && onClick ? 'cursor-pointer hover:opacity-80' : ''}
    ${showBorder ? `border-[${avatarConfig.color}] bg-gradient-to-br` : 'bg-opacity-20'}
  `.trim();

  const backgroundColor = showBorder ? `from-${avatarConfig.color}/20 to-${avatarConfig.color}/10` : `bg-${avatarConfig.color}/30`;

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`${containerClass} ${backgroundColor}`}
      onClick={handleClick}
      style={{
        borderColor: showBorder ? avatarConfig.color : 'transparent',
        backgroundColor: `${avatarConfig.color}30`,
        backgroundImage: showBorder
          ? `linear-gradient(135deg, ${avatarConfig.color}20, ${avatarConfig.color}10)`
          : 'none',
      }}
      role={isClickable && onClick ? 'button' : undefined}
      tabIndex={isClickable && onClick ? 0 : undefined}
      onKeyPress={isClickable && onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
    >
      {showSpiritAnimal ? (
        <span className={`${config.text}`}>{avatarConfig.emoji}</span>
      ) : (
        <span className={`${config.text} text-white font-bold`}>{initials}</span>
      )}
    </div>
  );
}