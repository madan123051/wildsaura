// src/components/ProfileModal.tsx - FIXED VERSION (Key changes marked with ✨)
// Changes: Import from shared constants, use UserAvatar component

import React, { useState, useEffect } from 'react';
import { X, LogOut, Upload, Camera, Trash2 } from 'lucide-react';
import { Visitor } from '../types';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  updateUserAvatar,
  updateSpiritAnimal,
  type UserProfile,
} from '../services/userProfileService';
import { getCurrentUser, updateUserPassword, logout } from '../services/authService';
import { ANIMAL_AVATARS, AVATAR_COLORS } from '../constants/avatars'; // ✨ SHARED CONSTANTS
import { UserAvatar } from './UserAvatar'; // ✨ SHARED COMPONENT

interface ProfileModalProps {
  isOpen: boolean;
  visitor: Visitor | null;
  onClose: () => void;
  onVisitorUpdate: (updatedVisitor: Visitor) => void;
  onLogout: () => void;
  downloadCount?: number;
  communities?: Array<{ id: string; name: string; isMember?: boolean }>;
  onJoinCommunity?: (communityId: string) => Promise<void>;
  onLeaveCommunity?: (communityId: string) => Promise<void>;
  userCommunities?: string[];
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  visitor,
  onClose,
  onVisitorUpdate,
  onLogout,
  downloadCount = 0,
  communities = [],
  onJoinCommunity,
  onLeaveCommunity,
  userCommunities = [],
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoHover, setPhotoHover] = useState(false);
  const [communityActionLoading, setCommunityActionLoading] = useState<string | null>(null);

  // Form states for editing
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [spiritAnimal, setSpiritAnimal] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      setEditing(false);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const p = await getCurrentUserProfile();
      if (p) {
        setProfile(p);
        setDisplayName(p.displayName);
        setBio(p.bio || '');
        setLocation(p.location || '');
        setWebsite(p.website || '');
        setSpiritAnimal(p.spiritAnimal || '');
      }
    } catch (err: any) {
      // Silently fail - visitor fallback still works
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError('');

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const maxSize = 600;
            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              async (blob) => {
                if (!blob) {
                  setError('Failed to compress image');
                  setUploadingPhoto(false);
                  return;
                }

                const blobReader = new FileReader();
                blobReader.onloadend = async () => {
                  try {
                    const compressedBase64 = blobReader.result as string;
                    const originalSize = (file.size / 1024 / 1024).toFixed(2);
                    const compressedSize = (blob.size / 1024 / 1024).toFixed(2);

                    await updateCurrentUserProfile({
                      displayName,
                      bio,
                      location,
                      website,
                      profilePhotoUrl: compressedBase64,
                    });

                    await loadProfile();
                    setSuccess(`✨ Photo updated! (${originalSize}MB → ${compressedSize}MB)`);
                  } catch (err: any) {
                    setError('Failed to save photo');
                  } finally {
                    setUploadingPhoto(false);
                  }
                };
                blobReader.readAsDataURL(blob);
              },
              'image/webp',
              0.7
            );
          };
          img.onerror = () => {
            setError('Failed to load image');
            setUploadingPhoto(false);
          };
          img.src = reader.result as string;
        } catch (err: any) {
          setError(err.message || 'Failed to compress photo');
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Remove profile photo?')) return;

    try {
      setLoading(true);
      await updateCurrentUserProfile({
        displayName,
        bio,
        location,
        website,
        profilePhotoUrl: '',
      });
      await loadProfile();
      setSuccess('Profile photo removed');
    } catch (err: any) {
      setError('Failed to remove photo');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!onJoinCommunity) return;

    try {
      setCommunityActionLoading(communityId);
      await onJoinCommunity(communityId);
      setSuccess('Joined community! 🎉');
    } catch (err: any) {
      setError('Failed to join community');
    } finally {
      setCommunityActionLoading(null);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!onLeaveCommunity || !confirm('Leave this community?')) return;

    try {
      setCommunityActionLoading(communityId);
      await onLeaveCommunity(communityId);
      setSuccess('Left community');
    } catch (err: any) {
      setError('Failed to leave community');
    } finally {
      setCommunityActionLoading(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      await updateCurrentUserProfile({ displayName, bio, location, website });

      const authUser = getCurrentUser();
      if (spiritAnimal && authUser) {
        await updateSpiritAnimal(authUser.uid, spiritAnimal);
      }

      // Update visitor for backward compatibility
      if (visitor) {
        onVisitorUpdate({ ...visitor, displayName: displayName.trim() });
      }

      await loadProfile();
      setEditing(false);
      setSuccess('Profile updated successfully! ✨');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match or are empty');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await updateUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully! 🔐');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarColorChange = async (color: string) => {
    const authUser = getCurrentUser();
    if (!authUser) return;

    try {
      await updateUserAvatar(authUser.uid, '', color);
      await loadProfile();

      if (visitor) {
        onVisitorUpdate({ ...visitor, avatarColor: color });
      }

      setSuccess('Avatar color updated!');
    } catch (err: any) {
      setError(err.message || 'Failed to update avatar');
    }
  };

  const handleAnimalSelect = async (animalId: string) => {
    if (visitor) {
      onVisitorUpdate({ ...visitor, avatarAnimal: animalId });
    }

    setSpiritAnimal(animalId);

    const authUser = getCurrentUser();
    if (authUser) {
      try {
        await updateSpiritAnimal(authUser.uid, animalId);
      } catch (err) {
        // Silently fail
      }
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await logout();
        onLogout();
      } catch (err: any) {
        setError(err.message || 'Logout failed');
      }
    }
  };

  if (!isOpen || !visitor) return null;

  const profilePhotoUrl = profile?.profilePhotoUrl as string | undefined;

  // Shared styles
  const s = {
    overlay: {
      position: 'fixed' as const,
      inset: 0 as const,
      zIndex: 120,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    },
    container: {
      width: 'min(720px, 100%)',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      borderRadius: 16,
      background: 'var(--wa-dropdown-bg)',
      border: '1px solid var(--wa-dropdown-border)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      padding: '1.5rem',
    },
    label: {
      display: 'block' as const,
      color: 'var(--wa-text-muted)',
      fontSize: '0.75rem',
      marginBottom: 4,
    },
    input: {
      width: '100%',
      background: 'var(--wa-bg-input)',
      border: '1px solid var(--wa-border)',
      borderRadius: 8,
      padding: '0.55rem 0.7rem',
      color: 'var(--wa-text)',
      outline: 'none',
      fontSize: '0.92rem',
    },
    card: {
      background: 'var(--wa-label-bg)',
      border: '1px solid var(--wa-border)',
      borderRadius: 12,
      padding: '0.75rem',
    },
    button: {
      border: 'none',
      borderRadius: 8,
      padding: '0.55rem 0.9rem',
      cursor: 'pointer',
      fontWeight: 700 as const,
      fontSize: '0.88rem',
    },
    alert: (type: 'error' | 'success') => ({
      padding: '0.6rem 0.9rem',
      borderRadius: 8,
      marginBottom: '0.75rem',
      fontSize: '0.88rem',
      background: type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(79,159,98,0.15)',
      color: type === 'error' ? 'rgba(239,68,68,0.9)' : 'rgba(79,159,98,0.9)',
      border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(79,159,98,0.3)'}`,
    }),
  };

  const joinedCommunities = communities.filter((c) => userCommunities.includes(c.id));
  const availableCommunities = communities.filter((c) => !userCommunities.includes(c.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={s.overlay}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={s.container}
      >
        {/* ─── Header ─── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}>
          <h2 style={{ margin: 0, color: 'var(--wa-gold)', fontSize: '1.2rem' }}>
            {editing ? '✏️ Edit Profile' : '👤 My Profile'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--wa-text)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── Alerts ─── */}
        {error && <div style={s.alert('error')}>{error}</div>}
        {success && <div style={s.alert('success')}>{success}</div>}

        {/* ─── VIEW MODE ─── */}
        {!editing ? (
          <>
            {/* Avatar + Identity - using shared UserAvatar ✨ */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              {/* Photo Upload Area */}
              <div
                style={{
                  position: 'relative' as const,
                  display: 'flex',
                  flexShrink: 0,
                }}
                onMouseEnter={() => setPhotoHover(true)}
                onMouseLeave={() => setPhotoHover(false)}
              >
                {/* ✨ NOW USING SHARED COMPONENT */}
                <UserAvatar
                  visitor={visitor}
                  profilePhotoUrl={profilePhotoUrl}
                  size={88}
                  showBorder={true}
                  style={{
                    position: 'relative',
                  }}
                />

                {/* Photo Upload Overlay */}
                {photoHover && (
                  <div
                    style={{
                      position: 'absolute' as const,
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                      }}
                      title="Upload photo"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        style={{ display: 'none' }}
                      />
                      <Camera size={18} />
                    </label>
                    {profilePhotoUrl && (
                      <button
                        onClick={handleDeletePhoto}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Delete photo"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div>
                <div style={{ color: 'var(--wa-text)', fontWeight: 700, fontSize: '1.05rem' }}>
                  {visitor.displayName}
                </div>
                <div style={{ color: 'var(--wa-text-muted)', fontSize: '0.88rem' }}>
                  {visitor.email}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: 4, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: 'rgba(168,216,162,0.15)',
                      color: 'var(--wa-gold)',
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: 20,
                      border: '1px solid rgba(168,216,162,0.3)',
                    }}
                  >
                    {visitor.loginMethod.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
              gap: '0.6rem',
              marginBottom: '1rem',
            }}>
              {[
                { label: 'Downloads', value: downloadCount },
                { label: 'Followers', value: profile?.followerCount ?? 0 },
                { label: 'Following', value: profile?.followingCount ?? 0 },
                { label: 'Liked Photos', value: profile?.totalPhotosLiked ?? 0 },
                { label: 'Liked Stories', value: profile?.totalStoriesLiked ?? 0 },
                {
                  label: 'Communities',
                  value: userCommunities.length,
                },
              ].map(({ label, value }) => (
                <div key={label} style={s.card}>
                  <div style={{ color: 'var(--wa-text-muted)', fontSize: '0.72rem' }}>
                    {label}
                  </div>
                  <div style={{ color: 'var(--wa-gold)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Profile Details */}
            {(profile?.bio || profile?.location || profile?.website) && (
              <div style={{ ...s.card, marginBottom: '1rem' }}>
                {profile.bio && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.78rem' }}>📝 Bio </span>
                    <span style={{ color: 'var(--wa-text)', fontSize: '0.9rem' }}>{profile.bio}</span>
                  </div>
                )}
                {profile.location && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.78rem' }}>📍 Location </span>
                    <span style={{ color: 'var(--wa-text)', fontSize: '0.9rem' }}>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div>
                    <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.78rem' }}>🌐 Website </span>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--wa-gold)', fontSize: '0.9rem' }}
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Joined Communities */}
            {joinedCommunities.length > 0 && (
              <div style={{ ...s.card, marginBottom: '1rem' }}>
                <div style={{ color: 'var(--wa-text)', fontWeight: 600, marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                  🏘️ Joined Communities ({joinedCommunities.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {joinedCommunities.map((community) => (
                    <div
                      key={community.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(79,159,98,0.15)',
                        border: '1px solid rgba(79,159,98,0.3)',
                        borderRadius: 20,
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ color: 'var(--wa-text)' }}>{community.name}</span>
                      <button
                        onClick={() => handleLeaveCommunity(community.id)}
                        disabled={communityActionLoading === community.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(239,68,68,0.8)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          padding: 0,
                        }}
                        title="Leave community"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Communities to Join */}
            {availableCommunities.length > 0 && (
              <div style={{ ...s.card, marginBottom: '1rem' }}>
                <div style={{ color: 'var(--wa-text)', fontWeight: 600, marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                  🌍 Available Communities
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {availableCommunities.map((community) => (
                    <button
                      key={community.id}
                      onClick={() => handleJoinCommunity(community.id)}
                      disabled={communityActionLoading === community.id}
                      style={{
                        ...s.button,
                        width: '100%',
                        background: 'linear-gradient(135deg, #3f7b4a 0%, #9fcb8f 55%, #72aa81 100%)',
                        color: '#062013',
                        fontSize: '0.8rem',
                        padding: '0.4rem 0.6rem',
                      }}
                    >
                      {communityActionLoading === community.id ? '...' : `+ ${community.name}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Profile Button */}
            <button
              onClick={() => {
                setEditing(true);
                setError('');
                setSuccess('');
              }}
              style={{
                ...s.button,
                width: '100%',
                background: 'linear-gradient(135deg, #3f7b4a 0%, #9fcb8f 55%, #72aa81 100%)',
                color: '#062013',
                marginBottom: '0.6rem',
              }}
            >
              Edit Profile
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                ...s.button,
                width: '100%',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'rgba(239,68,68,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </>
        ) : (
          /* ─── EDIT MODE ─── */
          <form onSubmit={handleSaveProfile}>
            {/* Display Name */}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={s.label}>Display Name *</label>
              <input
                style={s.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                disabled={loading}
              />
            </div>

            {/* Bio */}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={s.label}>Bio</label>
              <textarea
                style={{ ...s.input, resize: 'vertical' as const, minHeight: 72 }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Location + Website */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.7rem',
              marginBottom: '0.9rem',
            }}>
              <div>
                <label style={s.label}>📍 Location</label>
                <input
                  style={s.input}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Your location"
                  disabled={loading}
                />
              </div>
              <div>
                <label style={s.label}>🌐 Website</label>
                <input
                  style={s.input}
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Spirit Animal - using shared ANIMAL_AVATARS ✨ */}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={s.label}>🐾 Spirit Animal</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
                  gap: '0.45rem',
                }}
              >
                {ANIMAL_AVATARS.map((animal) => {
                  const selected = (visitor.avatarAnimal || spiritAnimal) === animal.id;
                  return (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => handleAnimalSelect(animal.id)}
                      style={{
                        padding: '0.6rem 0.3rem',
                        borderRadius: 10,
                        border: selected ? '2px solid var(--wa-gold)' : '1px solid var(--wa-border)',
                        background: selected ? 'rgba(79,159,98,0.25)' : 'var(--wa-bg-input)',
                        color: 'var(--wa-text)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '1.3rem' }}>{animal.emoji}</div>
                      <div style={{ fontSize: '0.68rem' }}>{animal.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Avatar Color - using shared AVATAR_COLORS ✨ */}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={s.label}>🎨 Avatar Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleAvatarColorChange(color)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: color,
                      border:
                        (profile?.avatarColor || visitor.avatarColor) === color
                          ? '3px solid var(--wa-gold)'
                          : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Change Password */}
            <div style={{ ...s.card, marginBottom: '1rem' }}>
              <div style={{ color: 'var(--wa-text)', fontWeight: 600, marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                🔐 Change Password
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.6rem',
                  marginBottom: '0.6rem',
                }}
              >
                <div>
                  <label style={s.label}>New Password</label>
                  <input
                    style={s.input}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label style={s.label}>Confirm</label>
                  <input
                    style={s.input}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    disabled={loading}
                  />
                </div>
              </div>
              {(newPassword || confirmPassword) && (
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={loading}
                  style={{
                    ...s.button,
                    width: '100%',
                    background: 'rgba(79,159,98,0.2)',
                    color: 'rgba(79,159,98,0.9)',
                    border: '1px solid rgba(79,159,98,0.3)',
                  }}
                >
                  Update Password
                </button>
              )}
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...s.button,
                  flex: 1,
                  background: 'linear-gradient(135deg, #3f7b4a 0%, #9fcb8f 55%, #72aa81 100%)',
                  color: '#062013',
                }}
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError('');
                  setSuccess('');
                  loadProfile();
                }}
                disabled={loading}
                style={{
                  ...s.button,
                  background: 'var(--wa-label-bg)',
                  border: '1px solid var(--wa-border)',
                  color: 'var(--wa-text)',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
