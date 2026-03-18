export interface Photo {
  id: number;
  firestoreId?: string;
  title: string;
  category: 'wildlife' | 'landscape' | 'street' | 'other';
  imageUrl: string;
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
  displayName: string;
  avatarColor?: string;
  content: string;
  createdAt: string;
}

export interface Visitor {
  displayName: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string;
  loginMethod: 'email' | 'google' | 'facebook' | 'apple';
}

export interface Story {
  id: number;
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
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}
