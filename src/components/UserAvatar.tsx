// src/components/UserAvatar.tsx
// ✨ UNIFIED AVATAR - Renders the same everywhere

import React from 'react';
import { Visitor } from '../types';
import { getAvatarEmoji } from '../constants/avatars';

interface UserAvatarProps {
  visitor: Visitor | null;
  profilePhotoUrl?: string; // Profile photo URL (takes precedence)
  size?: number; // In pixels (default: 44)
  showBorder?: boolean;
  style?: React.CSSProperties;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  visitor,
  profilePhotoUrl,
  size = 44,
  showBorder = true,
  style = {},
}) => {
  if (!visitor) return null;

  const emoji = getAvatarEmoji(visitor.avatarAnimal);
  const initial = visitor.displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const hasPhoto = !!profilePhotoUrl;
  const hasAnimal = !!emoji;

  // Determine background color
  const bgColor = hasPhoto ? 'transparent' : (
    hasAnimal ? 'rgba(79,159,98,0.22)' : (visitor.avatarColor || '#4ECDC4')
  );

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: hasAnimal ? `${size * 0.625}px` : `${size * 0.5}px`,
        fontWeight: hasAnimal ? 400 : 700,
        color: hasPhoto ? undefined : '#000',
        border: showBorder ? '2px solid rgba(168,216,162,0.55)' : 'none',
        flexShrink: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      {hasPhoto ? (
        <img
          src={profilePhotoUrl}
          alt={visitor.displayName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        hasAnimal ? emoji : initial
      )}
    </div>
  );
};
