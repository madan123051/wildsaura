export interface Photo {
  id: number;
  firestoreId?: string;
  title: string;
  category: 'wildlife' | 'landscape' | 'street' | 'nature' | 'other';
  imageUrl: string;
  thumbnailUrl?: string;       // ← NEW: Optimized gallery thumbnail (WebP ~150KB, 600px)
  location?: string;
  caption?: string;
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
  liked: boolean;
  published?: boolean;
  photographer?: string;
  latitude?: number;
  longitude?: number;
  originalSize?: number;       // ← NEW: Original file size in bytes (before compression)
  compressedSize?: number;     // ← NEW: Compressed WebP size in bytes (after compression)
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
  originalSize?: number;       // ← NEW: Original video file size in bytes
  aspectRatio?: string;        // ← NEW: Video aspect ratio e.g. '16:9', '9:16', '1:1', '4:5'
  videoWidth?: number;         // ← NEW: Original video width in pixels
  videoHeight?: number;        // ← NEW: Original video height in pixels
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
