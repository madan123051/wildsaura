import React from 'react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';

interface ProfileModalProps {
  user: User;
  isDarkMode: boolean;
  onClose: () => void;
  onEditProfile?: () => void;
  onSignOut?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isDarkMode,
  onClose,
  onEditProfile,
  onSignOut,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl max-w-md w-full p-8 relative border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 text-2xl ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}
          title="Close"
        >
          ✕
        </button>

        {/* Header Icon */}
        <div className={`text-3xl mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          👤
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'} mb-6`}>
          My Profile
        </h2>

        {/* Avatar - Large with Border and Spirit Animal */}
        <div className="flex justify-center mb-6">
          <UserAvatar
            user={user}
            size="large"
            showBorder={true}
            isClickable={false}
          />
        </div>

        {/* User Info */}
        <div className="text-center mb-6">
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {user.name}
          </h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            {user.email}
          </p>

          {/* Auth Provider Badge */}
          {user.authProvider && (
            <div className="mt-3 flex justify-center">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                user.authProvider === 'GOOGLE'
                  ? isDarkMode
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
                    : 'bg-blue-100 text-blue-700 border border-blue-300'
                  : isDarkMode
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50'
                  : 'bg-purple-100 text-purple-700 border border-purple-300'
              }`}>
                {user.authProvider}
              </span>
            </div>
          )}
        </div>

        <hr className={isDarkMode ? 'border-slate-700 my-6' : 'border-gray-200 my-6'} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Downloads */}
          <div className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-lg p-4 text-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Downloads
            </p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {user.downloadCount || 0}
            </p>
          </div>

          {/* Followers */}
          <div className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-lg p-4 text-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Followers
            </p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {user.followerCount || 0}
            </p>
          </div>

          {/* Following */}
          <div className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-lg p-4 text-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Following
            </p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {user.followingCount || 0}
            </p>
          </div>

          {/* Liked Photos */}
          <div className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-lg p-4 text-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Liked Photos
            </p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {user.likedPhotosCount || 0}
            </p>
          </div>

          {/* Liked Stories */}
          <div className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-lg p-4 text-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Liked Stories
            </p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {user.likedStoriesCount || 0}
            </p>
          </div>

          {/* Communities */}
          <div className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-lg p-4 text-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Communities
            </p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {user.communityCount || 0}
            </p>
          </div>
        </div>

        {/* Spirit Animal Display */}
        {user.spiritAnimal && (
          <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'} text-center`}>
            <p className={`text-xs uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Spirit Animal
            </p>
            <p className={`text-lg font-semibold capitalize ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {user.spiritAnimal}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onEditProfile}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Edit Profile
          </button>

          <button
            onClick={onSignOut}
            className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              isDarkMode
                ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50 border border-red-700'
                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
            }`}
          >
            <span>↗️</span>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
