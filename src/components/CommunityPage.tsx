import React, { useState } from 'react';
import { User, Post } from '../types';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';

interface CommunityPageProps {
  user: User;
  posts: Post[];
  isDarkMode: boolean;
  onNewPost?: () => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  user,
  posts,
  isDarkMode,
  onNewPost,
}) => {
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleProfileClick = (profileUser: User) => {
    setSelectedUserProfile(profileUser);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedUserProfile(null);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
              ← Back
            </button>
          </div>

          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
            🌿 WildSaura Community
          </h1>

          <button
            onClick={onNewPost}
            className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            + New Post
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}
            >
              {/* Post Header - User Info (CLICKABLE) */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => handleProfileClick(post.author)}
                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  title={`View ${post.author.name}'s profile`}
                >
                  <UserAvatar
                    user={post.author}
                    size="medium"
                    showBorder={false}
                    isClickable={true}
                  />
                </button>

                <button
                  onClick={() => handleProfileClick(post.author)}
                  className="flex-1 text-left hover:opacity-80 transition-opacity"
                  title={`View ${post.author.name}'s profile`}
                >
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {post.author.name}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </button>
              </div>

              {/* Post Content */}
              <div className={`${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4 text-base leading-relaxed`}>
                {post.content}
              </div>

              {/* Post Image - if available */}
              {post.imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden bg-gray-200">
                  <img
                    src={post.imageUrl}
                    alt="Post content"
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

              {/* Post Stats */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-700">
                <button className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 hover:text-red-600'} transition-colors`}>
                  <span>❤️</span>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {post.likes || 0}
                  </span>
                </button>

                <button className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors`}>
                  <span>💬</span>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {post.comments || 0}
                  </span>
                </button>

                <button className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'} transition-colors ml-auto`}>
                  <span>📤</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="text-lg">No posts yet</p>
            <p className="text-sm">Be the first to share your wildlife moment!</p>
          </div>
        )}
      </div>

      {/* Profile Modal - Opens from Community Posts */}
      {isProfileModalOpen && selectedUserProfile && (
        <ProfileModal
          user={selectedUserProfile}
          isDarkMode={isDarkMode}
          onClose={handleCloseProfileModal}
        />
      )}
    </div>
  );
};
