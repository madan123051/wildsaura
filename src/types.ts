export interface Photo {
  id: number;
  firestoreId?: string;
  slug?: string;
  title: string;
  category: 'wildlife' | 'birds' | 'macro' | 'domestic' | 'landscape' | 'street' | 'nature' | 'other';
  imageUrl: string;
  thumbnailUrl?: string;       // Optimized gallery thumbnail (WebP ~200-300KB, 720px)
  location?: string;
  caption?: string;
  altText?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoPhrases?: string[];
  type: 'photo' | 'video';
  cameraModel?: string;
  lens?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focalLength?: string;
  tags?: string[];
  animalName?: string;
  wikiSummary?: string;
  likeCount: number;
  viewCount?: number;
  liked: boolean;
  published?: boolean;
  photographer?: string;
  latitude?: number;
  longitude?: number;
  originalSize?: number;       // Original file size in bytes (before compression)
  compressedSize?: number;     // Compressed WebP size in bytes (after compression)
  createdAt?: any;             // Firestore Timestamp or ISO string — upload/publish date
}

export interface Category {
  key: string;
  label: string;
  imageUrl: string;
}

export interface FilterTab {
  key: string;
  label: string;
}

export interface Comment {
  id: number;
  firestoreId?: string;
  displayName: string;
  avatarColor?: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
}

/**
 * User Profile stored in Firestore
 * This is the main user data structure used across the app
 */
export interface User {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User's email
  displayName: string;            // User's display name
  avatarUrl?: string;             // Profile picture URL
  avatarColor?: string;           // Fallback avatar background color
  spiritAnimal?: string;          // User's chosen spirit animal
  bio?: string;                   // User bio
  location?: string;              // User location
  website?: string;               // User website
  loginMethod: 'email' | 'google' | 'facebook' | 'apple'; // How user logged in
  createdAt: any;                 // Account creation date (Firestore Timestamp)
  updatedAt: any;                 // Last profile update (Firestore Timestamp)
  isVerified?: boolean;           // Email verification status
  totalPhotosLiked?: number;      // Total photos liked by user
  totalStoriesLiked?: number;     // Total stories liked by user
  followerCount?: number;         // Number of followers
  followingCount?: number;        // Number of following
  isAdmin?: boolean;              // Admin privilege flag
  lastLoginAt?: any;              // Last login timestamp
}

/**
 * Visitor - Deprecated in favor of User
 * Kept for backwards compatibility
 */
export interface Visitor {
  displayName: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string;
  avatarAnimal?: string;
  loginMethod: 'email' | 'google' | 'facebook' | 'apple';
}

export interface Story {
  id: number;
  firestoreId?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  tags: string[];
  createdAt: string;
  viewCount: number;
  likeCount: number;
  liked: boolean;
  photographer?: string;
}

export interface Video {
  id: number;
  firestoreId?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  location?: string;
  duration?: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  liked: boolean;
  photographer?: string;
  originalSize?: number;       // Original video file size in bytes
  compressedSize?: number;     // Compressed upload size in bytes
  aspectRatio?: string;        // Video aspect ratio e.g. '16:9', '9:16', '1:1', '4:5'
  videoWidth?: number;         // Original video width in pixels
  videoHeight?: number;        // Original video height in pixels
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface AISettings {
  geminiKey: string;
  deepseekKey: string;
  chatgptKey: string;
  photoAnalysisProvider: 'gemini' | 'chatgpt';
  storyProvider: 'gemini' | 'deepseek' | 'chatgpt';
  chatProvider: 'gemini' | 'deepseek' | 'chatgpt';
}

export type GalleryCategory = 'wildlife' | 'birds' | 'landscapes' | 'portraits' | 'others';

export interface GalleryPhoto {
  id?: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  storagePath?: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg';
  sizeBytes?: number;
  originalSize?: number;
  photographer?: string;
  createdAt?: any;
}
