import React, { useState, useEffect } from 'react';
import { getCurrentUser, logout, updateUserPassword } from '../services/authService';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  updateSpiritAnimal,
  updateUserAvatar,
} from '../services/userProfileService';
import { UserProfile } from '../services/userProfileService';
import './UserProfile.css';

interface UserProfilePageProps {
  onLogout?: () => void;
  onClose?: () => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ onLogout, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [spiritAnimal, setSpiritAnimal] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const spiritAnimals = [
    '🦁 Lion - Strength',
    '🦅 Eagle - Vision',
    '🐘 Elephant - Wisdom',
    '🐯 Tiger - Power',
    '🦌 Deer - Grace',
    '🦉 Owl - Knowledge',
    '🐺 Wolf - Loyalty',
    '🦊 Fox - Cunning',
  ];

  const avatarColors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await getCurrentUserProfile();
      if (profile) {
        setProfile(profile);
        setDisplayName(profile.displayName);
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setWebsite(profile.website || '');
        setSpiritAnimal(profile.spiritAnimal || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
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
      await updateCurrentUserProfile({
        displayName,
        bio,
        location,
        website,
      });

      if (spiritAnimal) {
        await updateSpiritAnimal(authUser?.uid || '', spiritAnimal);
      }

      await loadProfile();
      setEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setSuccess('Password updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await logout();
        if (onLogout) {
          onLogout();
        }
      } catch (err: any) {
        setError(err.message || 'Logout failed');
      }
    }
  };

  const handleAvatarColorChange = async (color: string) => {
    try {
      if (authUser) {
        await updateUserAvatar(authUser.uid, '', color);
        await loadProfile();
        setSuccess('Avatar color updated!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update avatar');
    }
  };

  if (loading && !profile) {
    return (
      <div className="user-profile-container">
        <div className="loading">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <h2>👤 My Profile</h2>
          {onClose && (
            <button className="close-button" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>

        {error && <div className="profile-alert error">{error}</div>}
        {success && <div className="profile-alert success">{success}</div>}

        {/* Profile View / Edit Mode */}
        {!editing ? (
          // View Mode
          <div className="profile-view">
            {/* Avatar Section */}
            <div className="avatar-section">
              <div
                className="avatar"
                style={{ backgroundColor: profile?.avatarColor || '#4ECDC4' }}
              >
                {profile?.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <h3>{profile?.displayName}</h3>
                <p>{profile?.email}</p>
                <span className="badge">{profile?.loginMethod.toUpperCase()}</span>
              </div>
            </div>

            {/* Profile Details */}
            <div className="profile-details">
              {profile?.bio && (
                <div className="detail-item">
                  <span className="label">📝 Bio</span>
                  <span className="value">{profile.bio}</span>
                </div>
              )}

              {profile?.spiritAnimal && (
                <div className="detail-item">
                  <span className="label">🐾 Spirit Animal</span>
                  <span className="value">{profile.spiritAnimal}</span>
                </div>
              )}

              {profile?.location && (
                <div className="detail-item">
                  <span className="label">📍 Location</span>
                  <span className="value">{profile.location}</span>
                </div>
              )}

              {profile?.website && (
                <div className="detail-item">
                  <span className="label">🌐 Website</span>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website}
                  </a>
                </div>
              )}

              <div className="detail-item">
                <span className="label">📅 Member Since</span>
                <span className="value">
                  {new Date(profile?.createdAt as any).toLocaleDateString()}
                </span>
              </div>

              {/* Stats */}
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-number">{profile?.followerCount || 0}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{profile?.followingCount || 0}</span>
                  <span className="stat-label">Following</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{profile?.totalPhotosLiked || 0}</span>
                  <span className="stat-label">Liked Photos</span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <button
              className="button primary"
              onClick={() => setEditing(true)}
            >
              ✏️ Edit Profile
            </button>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={handleSaveProfile} className="profile-edit">
            {/* Display Name */}
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                disabled={loading}
              />
            </div>

            {/* Bio */}
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Spirit Animal */}
            <div className="form-group">
              <label>Spirit Animal 🐾</label>
              <select
                value={spiritAnimal}
                onChange={(e) => setSpiritAnimal(e.target.value)}
                disabled={loading}
              >
                <option value="">Select an animal...</option>
                {spiritAnimals.map((animal) => (
                  <option key={animal} value={animal}>
                    {animal}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Your location"
                disabled={loading}
              />
            </div>

            {/* Website */}
            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                disabled={loading}
              />
            </div>

            {/* Avatar Color */}
            <div className="form-group">
              <label>Avatar Color</label>
              <div className="color-palette">
                {avatarColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${
                      profile?.avatarColor === color ? 'selected' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleAvatarColorChange(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Change Password */}
            <div className="password-section">
              <h4>🔐 Change Password</h4>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
              </div>
              {(newPassword || confirmPassword) && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={handleChangePassword}
                  disabled={loading}
                >
                  Update Password
                </button>
              )}
            </div>

            {/* Buttons */}
            <div className="profile-buttons">
              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setEditing(false);
                  loadProfile();
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Logout Button */}
        <button className="button danger" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfilePage;
