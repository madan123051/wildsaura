import React, { useState } from 'react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';

interface HeaderProps {
  user?: User | null;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onSettingsClick: () => void;
  onSearchClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isDarkMode,
  onThemeToggle,
  onSettingsClick,
  onSearchClick,
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleProfileClick = () => {
    if (user) setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const userName = user?.name || 'User';
  const userEmail = user?.email || 'Loading...';

  return (
    <>
      <header className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'} sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="text-xl font-bold text-amber-600">🦁 WildSaura</div>
          </div>

          {/* Center - Title */}
          <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            WildSaura Photography
          </h1>

          {/* Right - Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Settings */}
            <button
              onClick={onSettingsClick}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Settings"
            >
              ⚙️
            </button>

            {/* Notifications */}
            <button
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Notifications"
            >
              🔔
            </button>

            {/* Search */}
            <button
              onClick={onSearchClick}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Search"
            >
              🔍
            </button>

            {/* User Profile - CLICKABLE WITH SAFETY CHECKS */}
            {user ? (
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:opacity-75"
                title="Open profile"
              >
                <UserAvatar
                  user={user}
                  size="small"
                  isClickable={true}
                />
                <div className="hidden sm:block text-left">
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {userName}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {userEmail}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-2">
                <div className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
              </div>
            )}

            {/* Menu */}
            <button
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Profile Modal - Opens from Header */}
      {isProfileModalOpen && user && (
        <ProfileModal
          user={user}
          isDarkMode={isDarkMode}
          onClose={handleCloseProfileModal}
        />
      )}
    </>
  );
};