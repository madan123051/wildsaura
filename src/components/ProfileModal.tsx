import React, { useState, useEffect } from 'react';
import { X, LogOut } from 'lucide-react';
import { Visitor } from '../types';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  updateUserAvatar,
  updateSpiritAnimal,
  type UserProfile,
} from '../services/userProfileService';
import { getCurrentUser, updateUserPassword, logout } from '../services/authService';

const ANIMAL_AVATARS = [
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'elephant', emoji: '🐘', label: 'Elephant' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'eagle', emoji: '🦅', label: 'Eagle' },
  { id: 'deer', emoji: '🦌', label: 'Deer' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
  { id: 'fox', emoji: '🦊', label: 'Fox' },
];

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
];

interface ProfileModalProps {
  isOpen: boolean;
  visitor: Visitor | null;
  onClose: () => void;
  onVisitorUpdate: (updatedVisitor: Visitor) => void;
  onLogout: () => void;
  downloadCount?: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  visitor,
  onClose,
  onVisitorUpdate,
  onLogout,
  downloadCount = 0,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    // Update local visitor state
    if (visitor) {
      onVisitorUpdate({ ...visitor, avatarAnimal: animalId });
    }

    // Update form state
    setSpiritAnimal(animalId);

    // Also save to Firestore
    const authUser = getCurrentUser();
    if (authUser) {
      try {
        await updateSpiritAnimal(authUser.uid, animalId);
      } catch (err) {
        // Silently fail - visitor state already updated
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

  const currentAnimal = ANIMAL_AVATARS.find((a) => a.id === (visitor.avatarAnimal || spiritAnimal));
  const initial = visitor.displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const avatarBg = currentAnimal ? 'rgba(79,159,98,0.22)' : (profile?.avatarColor || visitor.avatarColor);

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
        }}
        >
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
            {/* Avatar + Identity */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: avatarBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: currentAnimal ? '2rem' : '1.5rem',
                  border: '2px solid rgba(168,216,162,0.55)',
                  flexShrink: 0,
                }}
              >
                {currentAnimal?.emoji || initial}
              </div>
              <div>
                <div style={{ color: 'var(--wa-text)', fontWeight: 700, fontSize: '1.05rem' }}>
                  {visitor.displayName}
                </div>
                <div style={{ color: 'var(--wa-text-muted)', fontSize: '0.88rem' }}>
                  {visitor.email}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: 4 }}>
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
                  {currentAnimal && (
                    <span
                      style={{
                        background: 'rgba(79,159,98,0.15)',
                        color: 'var(--wa-gold)',
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 20,
                        border: '1px solid rgba(79,159,98,0.3)',
                      }}
                    >
                      {currentAnimal.emoji} {currentAnimal.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
              gap: '0.6rem',
              marginBottom: '1rem',
            }}
            >
              {[
                { label: 'Downloads', value: downloadCount },
                { label: 'Followers', value: profile?.followerCount ?? 0 },
                { label: 'Following', value: profile?.followingCount ?? 0 },
                { label: 'Liked Photos', value: profile?.totalPhotosLiked ?? 0 },
                { label: 'Liked Stories', value: profile?.totalStoriesLiked ?? 0 },
                {
                  label: 'Member Since',
                  value: profile?.createdAt
                    ? new Date((profile.createdAt as any).toDate?.() ?? profile.createdAt).getFullYear()
                    : '—',
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

            {/* Edit Button */}
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
              ✏️ Edit Profile
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
            }}
            >
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

            {/* Spirit Animal */}
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

            {/* Avatar Color */}
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
