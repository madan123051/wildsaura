import React, { lazy, Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Photo, Category, FilterTab, Visitor, Story, Comment, Video, GalleryPhoto } from './types';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategorySection } from './components/CategorySection';
import { Gallery } from './components/Gallery';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { StoriesSection } from './components/StoriesSection';
import { OurAppsSection } from './components/OurAppsSection';
import { downloadPhoto } from './utils/downloadPhoto';
import { LiveStats } from './components/LiveStats';
import type { SiteSettings } from './services/siteSettingsService';
import type { AppNotification } from './components/NotificationPanel';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })),
);
const PhotoModal = lazy(() =>
  import('./components/PhotoModal').then((module) => ({ default: module.PhotoModal })),
);
const PhotoGallery = lazy(() =>
  import('./components/PhotoGallery').then((module) => ({ default: module.PhotoGallery })),
);
const SearchBar = lazy(() =>
  import('./components/SearchBar').then((module) => ({ default: module.SearchBar })),
);
const AIChatbot = lazy(() =>
  import('./components/AIChatbot').then((module) => ({ default: module.AIChatbot })),
);
const VisitorLogin = lazy(() =>
  import('./components/VisitorLogin').then((module) => ({ default: module.VisitorLogin })),
);
const VideoSection = lazy(() =>
  import('./components/VideoSection').then((module) => ({ default: module.VideoSection })),
);
const TermsConditions = lazy(() =>
  import('./components/TermsConditions').then((module) => ({ default: module.TermsConditions })),
);
const PrivacyPolicyPage = lazy(() =>
  import('./components/MetaEligibilityPages').then((module) => ({ default: module.PrivacyPolicyPage })),
);
const DataDeletionPage = lazy(() =>
  import('./components/MetaEligibilityPages').then((module) => ({ default: module.DataDeletionPage })),
);
const StoryDetail = lazy(() =>
  import('./components/StoryDetail').then((module) => ({ default: module.StoryDetail })),
);
const PhotoGridPage = lazy(() =>
  import('./components/PhotoGridPage').then((module) => ({ default: module.PhotoGridPage })),
);
const StoryGridPage = lazy(() =>
  import('./components/StoryGridPage').then((module) => ({ default: module.StoryGridPage })),
);
const VideoGridPage = lazy(() =>
  import('./components/VideoGridPage').then((module) => ({ default: module.VideoGridPage })),
);
const VideoDetail = lazy(() =>
  import('./components/VideoDetail').then((module) => ({ default: module.VideoDetail })),
);
const ProfileModal = lazy(() =>
  import('./components/ProfileModal').then((module) => ({ default: module.ProfileModal })),
);
const CommunityPage = lazy(() =>
  import('./components/CommunityPage').then((module) => ({ default: module.CommunityPage })),
);
const PhotoMap = lazy(() =>
  import('./components/PhotoMap').then((module) => ({ default: module.PhotoMap })),
);
const NotificationPanel = lazy(() =>
  import('./components/NotificationPanel').then((module) => ({ default: module.NotificationPanel })),
);
const SelfAdPopup = lazy(() => import('./components/SelfAdPopup'));

const logoUrl = '/photos/logo-header.webp';
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
type CounterField = 'viewCount' | 'likeCount';
const addUserLike = async (email: string, targetType: 'photo' | 'story' | 'video', targetId: string) =>
  (await import('./services/userLikesService')).addUserLike(email, targetType, targetId);
const removeUserLike = async (email: string, targetType: 'photo' | 'story' | 'video', targetId: string) =>
  (await import('./services/userLikesService')).removeUserLike(email, targetType, targetId);
const getUserLikes = async (email: string) =>
  (await import('./services/userLikesService')).getUserLikes(email);
const deletePhotoFromFirestore = async (id: string) =>
  (await import('./services/photoService')).deletePhotoFromFirestore(id);
const incrementPhotoCounter = async (id: string, field: CounterField, amount: number) =>
  (await import('./services/photoService')).incrementPhotoCounter(id, field, amount);
const addStoryToFirestore = async (story: any) =>
  (await import('./services/storyService')).addStoryToFirestore(story);
const deleteStoryFromFirestore = async (id: string) =>
  (await import('./services/storyService')).deleteStoryFromFirestore(id);
const updateStoryInFirestore = async (id: string, story: any) =>
  (await import('./services/storyService')).updateStoryInFirestore(id, story);
const incrementStoryCounter = async (id: string, field: CounterField, amount: number) =>
  (await import('./services/storyService')).incrementStoryCounter(id, field, amount);
const uploadStoryCoverToStorage = async (dataUrl: string, fileName: string) =>
  (await import('./services/storyService')).uploadStoryCoverToStorage(dataUrl, fileName);
const addVideoToFirestore = async (video: any) =>
  (await import('./services/videoService')).addVideoToFirestore(video);
const deleteVideoFromFirestore = async (id: string) =>
  (await import('./services/videoService')).deleteVideoFromFirestore(id);
const updateVideoInFirestore = async (id: string, video: any) =>
  (await import('./services/videoService')).updateVideoInFirestore(id, video);
const incrementVideoCounter = async (id: string, field: CounterField, amount: number) =>
  (await import('./services/videoService')).incrementVideoCounter(id, field, amount);
const uploadVideoThumbnailToStorage = async (dataUrl: string, fileName: string) =>
  (await import('./services/videoService')).uploadVideoThumbnailToStorage(dataUrl, fileName);
const uploadVideoToStorage = async (dataUrl: string, fileName: string) =>
  (await import('./services/videoService')).uploadVideoToStorage(dataUrl, fileName);
const addCommentToFirestore = async (comment: any) =>
  (await import('./services/commentService')).addCommentToFirestore(comment);
const deleteCommentFromFirestore = async (id: string) =>
  (await import('./services/commentService')).deleteCommentFromFirestore(id);
const saveVisitorToFirestore = async (visitor: any) =>
  (await import('./services/visitorService')).saveVisitorToFirestore(visitor);
const getVisitorFromFirestore = async (email: string) =>
  (await import('./services/visitorService')).getVisitorFromFirestore(email);
const updateVisitorDownloadCount = async (email: string, count: number) =>
  (await import('./services/visitorService')).updateVisitorDownloadCount(email, count);
const updateVisitorProfile = async (email: string, profile: any) =>
  (await import('./services/visitorService')).updateVisitorProfile(email, profile);
const trackVisitorEvent = async (event: any) =>
  (await import('./services/analyticsService')).trackVisitorEvent(event);
const RouteFallback = () => (
  <main style={{ minHeight: '100vh', background: 'var(--wa-bg)', color: 'var(--wa-text)', padding: '6rem 1rem' }}>
    Loading...
  </main>
);
const InlineFallback = () => null;


const safeLower = (value: unknown) => (typeof value === 'string' ? value.toLowerCase().trim() : '');
const normalizeRouteToken = (value: unknown) =>
  typeof value === 'string'
    ? value.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
    : String(value ?? '').trim().toLowerCase();
const matchesPhotoRoute = (photo: Photo, token: string) => {
  const target = normalizeRouteToken(token);
  if (!target) return false;
  return [photo.slug, photo.firestoreId, photo.id].some((value) => normalizeRouteToken(value) === target);
};
const matchesStoryRoute = (story: Story, token: string) => {
  const target = normalizeRouteToken(token);
  if (!target) return false;
  return [story.slug, story.firestoreId, story.id].some((value) => normalizeRouteToken(value) === target);
};
const matchesVideoRoute = (video: Video, token: string) => {
  const target = normalizeRouteToken(token);
  if (!target) return false;
  return [video.firestoreId, video.id].some((value) => normalizeRouteToken(value) === target);
};



const FILTER_TABS: FilterTab[] = [
  { key: 'all', label: 'All' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'birds', label: 'Birds' },
  { key: 'macro', label: 'Macro' },
  { key: 'domestic', label: 'Domestic Animals' },
  { key: 'landscape', label: 'Landscapes' },
  { key: 'nature', label: 'Nature' },
  { key: 'street', label: 'Street' },
  { key: 'other', label: 'Portraits' },
];

const HOME_PHOTO_LIMIT = 10;
const HOME_STORY_LIMIT = 3;
const HOME_VIDEO_LIMIT = 4;
const HOME_GALLERY_LIMIT = 12;
const LIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const readLiveCache = <T,>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null') as {
      savedAt?: number;
      items?: T[];
    } | null;
    if (!cached?.savedAt || !Array.isArray(cached.items)) return [];
    if (Date.now() - cached.savedAt > LIVE_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return [];
    }
    return cached.items;
  } catch {
    return [];
  }
};

const writeLiveCache = <T,>(key: string, items: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), items }));
  } catch {
    // Browsers may disable storage; live Firestore data remains the source of truth.
  }
};

// ── App ─────────────────────────────────────────────────────────────────────
type AppView = 'home' | 'admin-dashboard' | 'story-detail' | 'video-detail' | 'terms' | 'privacy-policy' | 'data-deletion' | 'marketplace' | 'community' | 'ngo' | 'about' | 'contact' | 'photos' | 'photo-grid' | 'story-grid' | 'video-grid';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/story/')) return 'story-detail';
      if (path.startsWith('/video/')) return 'video-detail';
      if (path === '/terms') return 'terms';
      if (path === '/privacy-policy') return 'privacy-policy';
      if (path === '/data-deletion') return 'data-deletion';
      if (path === '/marketplace') return 'marketplace';
      if (path === '/community') return 'community';
      if (path === '/ngo') return 'ngo';
      if (path === '/about') return 'about';
      if (path === '/contact') return 'contact';
      if (path === '/photos' || path === '/photo-grid') return 'photo-grid';
      if (path === '/story-grid') return 'story-grid';
      if (path === '/video-grid') return 'video-grid';
      if (path.startsWith('/category/')) return 'photo-grid';
      if (path === '/admin' && localStorage.getItem('wa_admin_session') === 'true') return 'admin-dashboard';
    }
    return 'home';
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('wa_admin_session') === 'true';
    return false;
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/category\/([^/]+)$/);
      if (match) return decodeURIComponent(match[1]);
    }
    return 'all';
  });
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(() => readLiveCache<Photo>('wa_live_photo_preview'));
  const [stories, setStories] = useState<Story[]>(() => readLiveCache<Story>('wa_live_story_preview'));
  const [videos, setVideos] = useState<Video[]>(() => readLiveCache<Video>('wa_live_video_preview'));
  const [photosLoading, setPhotosLoading] = useState(true);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [deferNonCritical, setDeferNonCritical] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loadHomeGallery, setLoadHomeGallery] = useState(false);
  const [galleryIsFull, setGalleryIsFull] = useState(false);
  const [galleryLoadingAll, setGalleryLoadingAll] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const galleryRef = useRef<HTMLElement | null>(null);
  const homeGalleryLoadRef = useRef<HTMLDivElement | null>(null);
  const viewedTargetsRef = useRef<Set<string>>(new Set());
  const savedScrollRef = useRef<number>(0);
  const photoReturnPathRef = useRef<string>('/');
  const storyReturnPathRef = useRef<string>('/');
  const videoReturnPathRef = useRef<string>('/');

  // New state
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchPhotos, setSearchPhotos] = useState<Photo[] | null>(null);
  const [showVisitorLogin, setShowVisitorLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [photoComments, setPhotoComments] = useState<Record<string, Comment[]>>({});
  const [storyComments, setStoryComments] = useState<Record<string, Comment[]>>({});
  const [videoComments, setVideoComments] = useState<Record<string, Comment[]>>({});
  const [downloadCount, setDownloadCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [onlineVisitorCount, setOnlineVisitorCount] = useState(0);
  const [totalCommentCount, setTotalCommentCount] = useState(0);
  const [allFirestoreComments, setAllFirestoreComments] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ heroImages: [] });
  const [showMap, setShowMap] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try { const s = localStorage.getItem('wa_notifications'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  
  // Derived notification count for Header/CommunityPage
  const notificationCount = notifications.length;
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const isPullingRef = useRef(false);
  const FREE_DOWNLOADS = Infinity; // Unlimited free downloads for all users
  const onlineCleanupRef = useRef<(() => void) | null>(null);
  const getGuestIdentity = useCallback(() => {
    const sid = sessionStorage.getItem('wa_session_id') || `guest_${Date.now()}`;
    return { displayName: `Guest ${sid.slice(-4).toUpperCase()}`, avatarColor: '#3f7b4a', avatarUrl: '' };
  }, []);

  // ── Notification Helpers ──────────────────────────────────────────────────
  const saveNotifications = useCallback((notifs: AppNotification[]) => {
    setNotifications(notifs);
    try { localStorage.setItem('wa_notifications', JSON.stringify(notifs)); } catch {}
  }, []);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = { ...notif, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, timestamp: Date.now(), read: false };
    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50); // Keep max 50
      try { localStorage.setItem('wa_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      try { localStorage.setItem('wa_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try { localStorage.setItem('wa_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const handleDeleteNotif = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      try { localStorage.setItem('wa_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const handleClearAllNotifs = useCallback(() => {
    setNotifications([]);
    try { localStorage.setItem('wa_notifications', JSON.stringify([])); } catch {}
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // ── Firebase Auth Session Persistence ──────────────────────────────────
  const visitorRef = useRef<Visitor | null>(null);
  useEffect(() => { visitorRef.current = visitor; }, [visitor]);

  const getTrackingVisitor = useCallback(() => {
    const current = visitorRef.current;
    if (!current) return null;
    return {
      email: current.email || '',
      displayName: current.displayName,
      avatarUrl: current.avatarUrl || '',
      loginMethod: current.loginMethod || 'visitor',
    };
  }, []);

  const trackSiteEvent = useCallback((event: any) => {
    trackVisitorEvent({ ...event, visitor: getTrackingVisitor() }).catch((err) => {
      console.warn('Analytics event failed:', err);
    });
  }, [getTrackingVisitor]);

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.requestIdleCallback) {
      const idleHandle = win.requestIdleCallback(() => setDeferNonCritical(true), { timeout: 6000 });
      return () => win.cancelIdleCallback?.(idleHandle);
    }
    const timer = window.setTimeout(() => setDeferNonCritical(true), 5500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (view !== 'home' || loadHomeGallery) return;
    const target = homeGalleryLoadRef.current;
    if (!target || !('IntersectionObserver' in window)) {
      const timer = window.setTimeout(() => setLoadHomeGallery(true), 5000);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLoadHomeGallery(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadHomeGallery, view]);

  const loadFullGallery = useCallback(async () => {
    if (galleryIsFull || galleryLoadingAll) return;
    setGalleryLoadingAll(true);
    try {
      const service = await import('./services/galleryService');
      const items = await service.getGalleryPhotosFromFirestore();
      setGalleryPhotos(items);
      setGalleryIsFull(true);
    } catch (error) {
      console.warn('Full gallery fetch failed:', error);
    } finally {
      setGalleryLoadingAll(false);
    }
  }, [galleryIsFull, galleryLoadingAll]);

  useEffect(() => {
    const event = {
      type: 'page_view',
      page: window.location.pathname || '/',
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    };
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (win.requestIdleCallback) {
      const idleHandle = win.requestIdleCallback(() => trackSiteEvent(event), { timeout: 5000 });
      return () => win.cancelIdleCallback?.(idleHandle);
    }
    const timer = window.setTimeout(() => trackSiteEvent(event), 3000);
    return () => window.clearTimeout(timer);
  }, [trackSiteEvent, view, selectedCategory, selectedPhoto?.firestoreId, selectedStory?.firestoreId, selectedVideo?.firestoreId]);

  const restoreAuthImmediately = view === 'admin-dashboard';

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let idleHandle: number | undefined;
    let fallbackTimer: number | undefined;

    const restoreAuth = () => {
      import('./firebaseAuth').then(({ observeAuthState }) => {
        if (disposed) return;
        unsubscribe = observeAuthState(async (firebaseUser) => {
          if (firebaseUser && firebaseUser.email) {
            // Only auto-restore if visitor not already set (page reload scenario)
            if (!visitorRef.current) {
              try {
                const saved = await getVisitorFromFirestore(firebaseUser.email);
                if (saved) {
                  setVisitor({
                    displayName: saved.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
                    email: firebaseUser.email,
                    avatarColor: saved.avatarColor || '#c9a84c',
                    avatarUrl: saved.avatarUrl || firebaseUser.photoURL || undefined,
                    avatarAnimal: saved.avatarAnimal || undefined,
                    loginMethod: (saved.loginMethod || 'email') as any,
                  });
                  setDownloadCount(saved.downloadCount || 0);
                  // Auto-detect admin by email
                  if (firebaseUser.email.toLowerCase() === ADMIN_EMAIL) {
                    setIsAdmin(true);
                    localStorage.setItem('wa_admin_session', 'true');
                  }
                } else {
                  setVisitor({
                    displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
                    email: firebaseUser.email,
                    avatarColor: '#9fcb8f',
                    avatarUrl: firebaseUser.photoURL || undefined,
                    loginMethod: 'email',
                  });
                  // Auto-detect admin by email
                  if (firebaseUser.email.toLowerCase() === ADMIN_EMAIL) {
                    setIsAdmin(true);
                    localStorage.setItem('wa_admin_session', 'true');
                  }
                }
                // Load user's likes
                try {
                  const likes = await getUserLikes(firebaseUser.email);
                  const likeSet = new Set(likes.map(l => `${l.targetType}_${l.targetId}`));
                  setUserLikes(likeSet);
                } catch {}
              } catch (err) {
                console.warn('Session restore failed:', err);
              }
            }
          } else {
            if (visitorRef.current) {
              setVisitor(null);
              setDownloadCount(0);
              setUserLikes(new Set());
            }
          }
        });
      }).catch((err) => console.warn('Auth restore failed:', err));
    };

    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (restoreAuthImmediately) {
      restoreAuth();
    } else if (win.requestIdleCallback) {
      idleHandle = win.requestIdleCallback(restoreAuth, { timeout: 5000 });
    } else {
      fallbackTimer = window.setTimeout(restoreAuth, 3000);
    }

    return () => {
      disposed = true;
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      unsubscribe?.();
    };
  }, [restoreAuthImmediately]);

  // ── Deep Link State ──────────────────────────────────────────────────────
  const [pendingPhotoSlug, setPendingPhotoSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    // Check /photo/:id path OR ?photo= query param (from OG redirect)
    const m = window.location.pathname.match(/^\/photo\/(.+)$/);
    if (m) return decodeURIComponent(m[1]);
    const params = new URLSearchParams(window.location.search);
    const photoParam = params.get('photo');
    if (photoParam) return decodeURIComponent(photoParam);
    return null;
  });
  const [pendingStorySlug, setPendingStorySlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.pathname.match(/^\/story\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  });
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.pathname.match(/^\/video\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  const subscriptionPriority: 'photos' | 'stories' | 'videos' | 'admin' | 'home' | 'other' =
    view === 'admin-dashboard'
      ? 'admin'
      : pendingStorySlug || view === 'story-grid' || view === 'story-detail'
        ? 'stories'
        : pendingVideoId || view === 'video-grid' || view === 'video-detail'
          ? 'videos'
          : pendingPhotoSlug || selectedPhoto !== null || view === 'photo-grid'
            ? 'photos'
            : view === 'home'
              ? 'home'
              : 'other';

  // ── Real-time Data Subscriptions (LIVE updates across all browsers) ────────
  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    const startSubscriptions = async () => {
      let isFirstPhotoSnap = true;
      let isFirstStorySnap = true;
      let isFirstVideoSnap = true;
      const [
        photoService,
        storyService,
        videoService,
        commentService,
        visitorService,
        siteSettingsService,
      ] = await Promise.all([
        import('./services/photoService'),
        import('./services/storyService'),
        import('./services/videoService'),
        import('./services/commentService'),
        import('./services/visitorService'),
        import('./services/siteSettingsService'),
      ]);
      if (disposed) return;

      const priority = subscriptionPriority;

      const photoLimit = priority === 'photos' || priority === 'admin' ? undefined : HOME_PHOTO_LIMIT;
      const storyLimit = priority === 'stories' || priority === 'admin' ? undefined : HOME_STORY_LIMIT;
      const videoLimit = priority === 'videos' || priority === 'admin' ? undefined : HOME_VIDEO_LIMIT;

    // ── Real-time PHOTOS subscription ──────────────────────────────────
    const startPhotos = () => photoService.subscribeToPhotos((firestorePhotos) => {
      setPhotosLoading(false);
      const mapped = firestorePhotos.map((fp, idx) => ({
        id: Date.now() + idx,
        firestoreId: fp.id,
        slug: fp.slug || '',
        title: fp.title,
        category: fp.category as any,
        imageUrl: fp.imageUrl,
        thumbnailUrl: fp.thumbnailUrl || undefined,
        location: fp.location || '',
        caption: fp.caption || '',
        type: (fp.type || 'photo') as 'photo' | 'video',
        cameraModel: fp.cameraModel || '',
        lens: fp.lens || '',
        aperture: fp.aperture || '',
        shutterSpeed: fp.shutterSpeed || '',
        iso: fp.iso || '',
        focalLength: fp.focalLength || '',
        tags: fp.tags || [],
        animalName: fp.animalName || '',
        photographer: fp.photographer || '',
        latitude: fp.latitude || undefined,
        longitude: fp.longitude || undefined,
        published: fp.published !== false,
        likeCount: fp.likeCount || 0,
        viewCount: fp.viewCount || 0,
        liked: false,
        createdAt: fp.createdAt || null,  // ← FIX: preserve Firestore Timestamp for date display
      }));

      setPhotos(prev => {
        // Build map of existing Firestore photos to preserve local state (liked, id)
        const existingMap = new Map(prev.filter(p => p.firestoreId).map(p => [p.firestoreId, p]));
        const updatedFirestore = mapped.map(m => {
          const existing = existingMap.get(m.firestoreId);
          if (existing) {
            return { ...m, liked: existing.liked, id: existing.id, viewCount: Math.max(m.viewCount || 0, existing.viewCount || 0) };
          }
          return m;
        });
        const allPhotos = updatedFirestore;

        // Deep link: auto-open photo if pending (only on first snapshot)
        if (isFirstPhotoSnap && pendingPhotoSlug) {
          const matchedPhoto = allPhotos.find(p => matchesPhotoRoute(p, pendingPhotoSlug));
          if (matchedPhoto) {
            setTimeout(() => {
              setSelectedPhoto({ ...matchedPhoto, viewCount: (matchedPhoto.viewCount || 0) + 1 });
              setPhotos(current => current.map(p => p.id === matchedPhoto.id ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p));
              setPendingPhotoSlug(null);
            }, 100);
          } else {
            setTimeout(() => {
              photoReturnPathRef.current = '/';
              window.history.replaceState({}, '', '/');
              setPendingPhotoSlug(null);
            }, 0);
          }
        }
        isFirstPhotoSnap = false;
        writeLiveCache(
          'wa_live_photo_preview',
          allPhotos.slice(0, HOME_PHOTO_LIMIT).map((photo) => ({
            ...photo,
            createdAt: photo.createdAt?.toDate?.()?.toISOString?.() || photo.createdAt || null,
          })),
        );
        return allPhotos;
      });
    }, (err) => {
      console.warn('Photo subscription error:', err);
      setPhotosLoading(false);
    }, photoLimit);

    // ── Real-time STORIES subscription ─────────────────────────────────
    const startStories = () => storyService.subscribeToStories((firestoreStories) => {
      setStoriesLoading(false);
      const mapped: Story[] = firestoreStories.map((fs, idx) => ({
        id: Date.now() + idx + 5000,
        firestoreId: fs.id,
        title: typeof fs.title === 'string' ? fs.title : 'Untitled Story',
        slug: typeof fs.slug === 'string' ? fs.slug : `story-${Date.now()}-${idx}`,
        excerpt: typeof fs.excerpt === 'string' ? fs.excerpt : '',
        content: typeof fs.content === 'string' ? fs.content : '',
        coverImageUrl: fs.coverImageUrl,
        tags: fs.tags || [],
        createdAt: fs.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
        viewCount: fs.viewCount || 0,
        likeCount: fs.likeCount || 0,
        liked: false,
        photographer: fs.photographer || '',
      }));

      setStories(prev => {
        const existingMap = new Map(prev.filter(s => s.firestoreId).map(s => [s.firestoreId, s]));
        const updatedFirestore = mapped.map(m => {
          const existing = existingMap.get(m.firestoreId);
          if (existing) {
            return { ...m, liked: existing.liked, id: existing.id, viewCount: Math.max(m.viewCount || 0, existing.viewCount || 0) };
          }
          return m;
        });
        const allStories = updatedFirestore;

        // Deep link: auto-open story if pending (only on first snapshot)
        if (isFirstStorySnap && pendingStorySlug) {
          const matchedStory = allStories.find(s => matchesStoryRoute(s, pendingStorySlug));
          if (matchedStory) {
            setTimeout(() => {
              setSelectedStory({ ...matchedStory, viewCount: matchedStory.viewCount + 1 });
              setView('story-detail');
              setPendingStorySlug(null);
            }, 100);
          } else {
            setTimeout(() => {
              setView('home');
              window.history.replaceState({}, '', '/');
              setPendingStorySlug(null);
            }, 0);
          }
        }
        isFirstStorySnap = false;
        writeLiveCache('wa_live_story_preview', allStories.slice(0, HOME_STORY_LIMIT));
        return allStories;
      });
    }, (err) => {
      console.warn('Story subscription error:', err);
      setStoriesLoading(false);
    }, storyLimit);

    // ── Real-time VIDEOS subscription ──────────────────────────────────
    const startVideos = () => videoService.subscribeToVideos((firestoreVideos) => {
      setVideosLoading(false);
      const mapped: Video[] = firestoreVideos.map((fv, idx) => ({
        id: Date.now() + idx + 9000,
        firestoreId: fv.id,
        title: fv.title,
        description: fv.description || '',
        videoUrl: fv.videoUrl,
        thumbnailUrl: fv.thumbnailUrl || '',
        tags: fv.tags || [],
        location: fv.location || '',
        duration: fv.duration || '',
        createdAt: fv.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
        viewCount: fv.viewCount || 0,
        likeCount: fv.likeCount || 0,
        liked: false,
        photographer: fv.photographer || '',
        aspectRatio: fv.aspectRatio || undefined,
        videoWidth: fv.videoWidth || undefined,
        videoHeight: fv.videoHeight || undefined,
        originalSize: fv.originalSize || undefined,
        compressedSize: fv.compressedSize || undefined,
      }));

      setVideos(prev => {
        const existingMap = new Map(prev.filter(v => v.firestoreId).map(v => [v.firestoreId, v]));
        const allVideos = mapped.map(m => {
          const existing = existingMap.get(m.firestoreId);
          if (existing) {
            return { ...m, liked: existing.liked, id: existing.id, viewCount: Math.max(m.viewCount || 0, existing.viewCount || 0) };
          }
          return m;
        });
        if (isFirstVideoSnap && pendingVideoId) {
          const matchedVideo = allVideos.find((video) => matchesVideoRoute(video, pendingVideoId));
          if (matchedVideo) {
            setTimeout(() => {
              setSelectedVideo({ ...matchedVideo, viewCount: (matchedVideo.viewCount || 0) + 1 });
              setVideos(current => current.map(v => v.id === matchedVideo.id ? { ...v, viewCount: (v.viewCount || 0) + 1 } : v));
              setView('video-detail');
              setPendingVideoId(null);
            }, 100);
          } else {
            setTimeout(() => {
              setView('home');
              window.history.replaceState({}, '', '/');
              setPendingVideoId(null);
            }, 0);
          }
        }
        isFirstVideoSnap = false;
        writeLiveCache('wa_live_video_preview', allVideos.slice(0, HOME_VIDEO_LIMIT));
        return allVideos;
      });
    }, (err) => {
      console.warn('Video subscription error:', err);
      setVideosLoading(false);
    }, videoLimit);

    // ── Real-time COMMENTS subscription (already live!) ────────────────
    const startComments = () => commentService.subscribeToAllComments((allComments) => {
      const photoMap: Record<string, Comment[]> = {};
      const storyMap: Record<string, Comment[]> = {};
      const videoMap: Record<string, Comment[]> = {};
      allComments.forEach((c: any) => {
        const comment: Comment = {
          id: Date.now() + Math.random(),
          firestoreId: c.id,
          displayName: c.displayName,
          avatarColor: c.avatarColor || '',
          avatarUrl: c.avatarUrl || '',
          content: c.content,
          createdAt: c.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
        };
        // Use targetId (firestoreId string) as the map key
        const key = String(c.targetId);
        if (c.targetType === 'photo') {
          if (!photoMap[key]) photoMap[key] = [];
          photoMap[key].push(comment);
        } else if (c.targetType === 'video') {
          if (!videoMap[key]) videoMap[key] = [];
          videoMap[key].push(comment);
        } else {
          if (!storyMap[key]) storyMap[key] = [];
          storyMap[key].push(comment);
        }
      });
      setPhotoComments(photoMap);
      setStoryComments(storyMap);
      setVideoComments(videoMap);
      setTotalCommentCount(allComments.length);
      // Save raw comments for admin panel
      setAllFirestoreComments(allComments.map((c: any) => ({
        id: c.id,
        targetType: c.targetType,
        targetId: c.targetId,
        displayName: c.displayName,
        avatarColor: c.avatarColor || '',
        avatarUrl: c.avatarUrl || '',
        content: c.content,
        createdAt: c.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      })));
    });

    const startOnline = () => {
      // ── Online Visitor Tracking (real-time presence) ─────────────────
      let sessionId = sessionStorage.getItem('wa_session_id');
      if (!sessionId) {
        sessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('wa_session_id', sessionId);
      }
      const displayName = visitorRef.current?.displayName || 'Guest';
      const avatarUrl = visitorRef.current?.avatarUrl || '';
      const cleanupOnline = visitorService.trackOnlineVisitor(sessionId, displayName, avatarUrl);
      onlineCleanupRef.current = cleanupOnline;

      const unsubOnline = visitorService.subscribeToOnlineVisitors((count) => {
        setOnlineVisitorCount(count);
      });

      return () => {
        unsubOnline();
        cleanupOnline();
        if (onlineCleanupRef.current === cleanupOnline) onlineCleanupRef.current = null;
      };
    };

    const startSettings = () => siteSettingsService.onSiteSettingsChange((settings) => {
      setSiteSettings(settings);
    });

      type SubscriptionKey = 'photos' | 'stories' | 'videos' | 'comments' | 'online' | 'settings';
      const starters: Record<SubscriptionKey, () => () => void> = {
        photos: startPhotos,
        stories: startStories,
        videos: startVideos,
        comments: startComments,
        online: startOnline,
        settings: startSettings,
      };
      const started = new Set<SubscriptionKey>();
      const start = (key: SubscriptionKey) => {
        if (disposed || started.has(key)) return;
        started.add(key);
        cleanups.push(starters[key]());
      };
      const delay = (key: SubscriptionKey, ms: number) => {
        const timer = window.setTimeout(() => start(key), ms);
        cleanups.push(() => window.clearTimeout(timer));
      };

      if (priority === 'admin') {
        setPhotosLoading(true);
        setStoriesLoading(true);
        setVideosLoading(true);
        start('photos');
        start('stories');
        start('videos');
        start('comments');
        start('online');
      } else if (priority === 'stories') {
        setStoriesLoading(true);
        start('stories');
      } else if (priority === 'videos') {
        setVideosLoading(true);
        start('videos');
      } else if (priority === 'photos') {
        setPhotosLoading(true);
        start('photos');
      } else if (priority === 'home') {
        setPhotosLoading(true);
        setStoriesLoading(true);
        setVideosLoading(true);
        start('settings');
        start('photos');
        delay('stories', 250);
        delay('videos', 450);
        if (isAdmin) delay('online', 1200);
      } else {
        setPhotosLoading(false);
        setStoriesLoading(false);
        setVideosLoading(false);
      }
    };

    startSubscriptions().catch((err) => {
      console.warn('Realtime subscriptions failed:', err);
      setPhotosLoading(false);
      setStoriesLoading(false);
      setVideosLoading(false);
    });

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      onlineCleanupRef.current = null;
    };
  }, [isAdmin, subscriptionPriority]);


  // Apply user likes to photos/stories/videos when userLikes changes (keyed by firestoreId)
  useEffect(() => {
    if (userLikes.size > 0) {
      setPhotos(prev => prev.map(p => ({ ...p, liked: userLikes.has(`photo_${p.firestoreId || p.id}`) })));
      setStories(prev => prev.map(s => ({ ...s, liked: userLikes.has(`story_${s.firestoreId || s.id}`) })));
      setVideos(prev => prev.map(v => ({ ...v, liked: userLikes.has(`video_${v.firestoreId || v.id}`) })));
    }
  }, [userLikes]);

  const recordView = useCallback((type: 'photo' | 'story' | 'video', firestoreId?: string) => {
    if (!firestoreId) return;
    const key = `${type}_${firestoreId}`;
    if (viewedTargetsRef.current.has(key)) return;
    viewedTargetsRef.current.add(key);
    if (type === 'photo') incrementPhotoCounter(firestoreId, 'viewCount', 1).catch(err => console.warn('Photo view save failed:', err));
    if (type === 'story') incrementStoryCounter(firestoreId, 'viewCount', 1).catch(err => console.warn('Story view save failed:', err));
    if (type === 'video') incrementVideoCounter(firestoreId, 'viewCount', 1).catch(err => console.warn('Video view save failed:', err));
  }, []);

  useEffect(() => {
    recordView('photo', selectedPhoto?.firestoreId);
    recordView('story', selectedStory?.firestoreId);
    recordView('video', selectedVideo?.firestoreId);
  }, [recordView, selectedPhoto?.firestoreId, selectedStory?.firestoreId, selectedVideo?.firestoreId]);

  // ── Popstate Listener (Browser Back/Forward) ─────────────────────────────
  useEffect(() => {
    const getStorySlugFromPath = (path: string) => {
      if (!path.startsWith('/story/')) return null;
      const rawSlug = path.slice('/story/'.length);
      const normalized = rawSlug.replace(/^\/+|\/+$/g, '');
      return normalized ? decodeURIComponent(normalized) : null;
    };

    const onPopState = () => {
      const path = window.location.pathname;
      setSelectedPhoto(null);
      if (path === '/' || path === '') {
        setSelectedStory(null);
        setSelectedVideo(null);
        setView('home');
      } else if (path.startsWith('/photo/')) {
        const photoSlug = decodeURIComponent(path.replace('/photo/', ''));
        const matchedPhoto = photos.find(p => matchesPhotoRoute(p, photoSlug));
        if (matchedPhoto) {
          setSelectedPhoto({ ...matchedPhoto, viewCount: (matchedPhoto.viewCount || 0) + 1 });
          setPhotos(prev => prev.map(p => p.id === matchedPhoto.id ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p));
        } else {
          setPendingPhotoSlug(photoSlug);
        }
      } else if (path === '/photos' || path === '/photo-grid') {
        setSelectedCategory('all');
        setView('photo-grid');
      } else if (path.startsWith('/category/')) {
        const category = decodeURIComponent(path.replace('/category/', ''));
        setSelectedCategory(category || 'all');
        setView('photo-grid');
      } else if (path === '/story-grid') {
        setSelectedStory(null);
        setView('story-grid');
      } else if (path === '/video-grid') {
        setSelectedVideo(null);
        setView('video-grid');
      } else if (path === '/terms') {
        setView('terms');
      } else if (path === '/privacy-policy') {
        setView('privacy-policy');
      } else if (path === '/data-deletion') {
        setView('data-deletion');
      } else if (path === '/marketplace') {
        setView('marketplace');
      } else if (path === '/community') {
        setView('community');
      } else if (path === '/ngo') {
        setView('ngo');
      } else if (path === '/about') {
        setView('about');
      } else if (path === '/contact') {
        setView('contact');
      } else if (path === '/admin') {
        setView(localStorage.getItem('wa_admin_session') === 'true' ? 'admin-dashboard' : 'home');
      } else if (path.startsWith('/video/')) {
        const videoId = decodeURIComponent(path.replace('/video/', ''));
        const matchedVideo = videos.find((video) => matchesVideoRoute(video, videoId));
        if (matchedVideo) {
          setSelectedVideo({ ...matchedVideo, viewCount: (matchedVideo.viewCount || 0) + 1 });
          setVideos(prev => prev.map(v => v.id === matchedVideo.id ? { ...v, viewCount: (v.viewCount || 0) + 1 } : v));
          setView('video-detail');
        } else {
          setPendingVideoId(videoId);
        }
      } else if (path.startsWith('/story/')) {
        const slug = getStorySlugFromPath(path);
        if (!slug) {
          setView('home');
          return;
        }

        const matchedStory = stories.find(s => matchesStoryRoute(s, slug));
        if (matchedStory) {
          setSelectedStory({ ...matchedStory, viewCount: (matchedStory.viewCount || 0) + 1 });
          setStories(prev => prev.map(s => s.id === matchedStory.id ? { ...s, viewCount: (s.viewCount || 0) + 1 } : s));
          setView('story-detail');
        } else {
          setPendingStorySlug(slug);
        }
      }
    };

    const currentStorySlug = getStorySlugFromPath(window.location.pathname);
    if (currentStorySlug && !selectedStory) {
      const matchedStory = stories.find(s => matchesStoryRoute(s, currentStorySlug));
      if (matchedStory) {
        setSelectedStory({ ...matchedStory, viewCount: (matchedStory.viewCount || 0) + 1 });
        setStories(prev => prev.map(s => s.id === matchedStory.id ? { ...s, viewCount: (s.viewCount || 0) + 1 } : s));
        setView('story-detail');
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [photos, recordView, stories, videos]);

  // ── Scroll to top on every view/page change ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    const maxPull = 140;
    const triggerPull = 120;
    const visualPull = 60;

    const onTouchStart = (e: TouchEvent) => {
      if (isPullRefreshing || view !== 'home') return;
      if (window.scrollY > 0) return;
      pullStartYRef.current = e.touches[0]?.clientY ?? null;
      isPullingRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || pullStartYRef.current === null || isPullRefreshing || view !== 'home') return;
      const currentY = e.touches[0]?.clientY ?? 0;
      const delta = Math.max(0, currentY - pullStartYRef.current);
      const damped = Math.min(maxPull, delta * 0.6);
      pullDistanceRef.current = damped;
      setPullDistance(damped);
      if (window.scrollY === 0 && damped > visualPull) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!isPullingRef.current) return;
      const shouldRefresh = pullDistanceRef.current >= triggerPull && view === 'home';
      isPullingRef.current = false;
      pullStartYRef.current = null;
      pullDistanceRef.current = 0;

      if (shouldRefresh) {
        setIsPullRefreshing(true);
        setPullDistance(triggerPull);
        window.setTimeout(() => window.location.reload(), 450);
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isPullRefreshing, view]);

  const scrollToGallery = useCallback(() => {
    if (view !== 'home') {
      setView('photo-grid');
      window.history.pushState({}, '', '/photos');
      window.scrollTo(0, 0);
      return;
    }
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [view]);

  const handleCategoryClick = useCallback((key: string) => {
    setSelectedCategory(key);
    trackSiteEvent({ type: 'category_view', page: `/category/${key}`, category: key });
    setView('photo-grid');
    window.history.pushState({}, '', `/category/${encodeURIComponent(key)}`);
    window.scrollTo(0, 0);
  }, [trackSiteEvent]);

  const handleGalleryCategoryChange = useCallback((key: string) => {
    setSelectedCategory(key);
    if (key !== 'all') {
      trackSiteEvent({ type: 'category_view', page: `/category/${key}`, category: key });
      if (view === 'home') {
        setView('photo-grid');
        window.history.pushState({}, '', `/category/${encodeURIComponent(key)}`);
        window.scrollTo(0, 0);
      }
    }
  }, [trackSiteEvent, view]);

  const handleLike = useCallback((id: number) => {
    setPhotos((prev) => {
      const photo = prev.find(p => p.id === id);
      if (!photo) return prev;
      const newLiked = !photo.liked;
      const newLikeCount = newLiked ? photo.likeCount + 1 : photo.likeCount - 1;
      if (photo.firestoreId) {
        incrementPhotoCounter(photo.firestoreId, 'likeCount', newLiked ? 1 : -1).catch(err => console.warn('Like update failed:', err));
      }
      // Save per-user like to Firestore (keyed by firestoreId)
      const likeKey = photo?.firestoreId || String(id);
      if (newLiked) {
        trackSiteEvent({
          type: 'like',
          page: window.location.pathname,
          category: photo.category,
          targetId: likeKey,
          targetTitle: photo.title,
        });
      }
      if (visitor?.email) {
        if (newLiked) addUserLike(visitor.email, 'photo', likeKey).catch(console.warn);
        else removeUserLike(visitor.email, 'photo', likeKey).catch(console.warn);
      }
      setUserLikes(prev => {
        const next = new Set(prev);
        if (newLiked) next.add(`photo_${likeKey}`);
        else next.delete(`photo_${likeKey}`);
        return next;
      });
      return prev.map((p) =>
        p.id === id ? { ...p, liked: newLiked, likeCount: newLikeCount } : p
      );
    });
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto((prev) =>
        prev ? { ...prev, liked: !prev.liked, likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1 } : null
      );
    }
  }, [selectedPhoto, visitor, trackSiteEvent]);

  const handleShare = useCallback(async (photo: Photo) => {
    const photoId = photo.slug || photo.firestoreId || String(photo.id);
    const shareUrl = `${window.location.origin}/photo/${encodeURIComponent(photoId)}`;
    const shareText = `Check out "${photo.title}" on WILDS AURA Photography! 🐯📸`;
    
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${photo.title} - WILDS AURA`,
          text: shareText,
          url: shareUrl,
        });
        trackSiteEvent({
          type: 'share',
          page: window.location.pathname,
          category: photo.category,
          targetId: photo.firestoreId || String(photo.id),
          targetTitle: photo.title,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
      }
    }
    
    // Fallback: copy to clipboard with feedback
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      trackSiteEvent({
        type: 'share',
        page: window.location.pathname,
        category: photo.category,
        targetId: photo.firestoreId || String(photo.id),
        targetTitle: photo.title,
      });
      // Show toast
      const toast = document.createElement('div');
      toast.textContent = '✅ Link copied to clipboard!';
      toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);padding:0.75rem 1.5rem;background:#1a1a1a;color:#d4a853;border:1px solid rgba(201,168,76,0.4);border-radius:8px;font-size:0.85rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.5);animation:fadeIn 0.3s ease';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => document.body.removeChild(toast), 500); }, 2500);
    } catch {
      // Last resort: prompt with URL
      window.prompt('Copy this link to share:', shareUrl);
    }
  }, [trackSiteEvent]);

  const handleLogin = useCallback(() => {
    setIsAdmin(true);
    setView('home');
    localStorage.setItem('wa_admin_session', 'true');
  }, []);

  const handleLogout = useCallback(() => {
    setIsAdmin(false);
    setView('home');
    localStorage.removeItem('wa_admin_session');
    window.history.pushState({}, '', '/');
  }, []);

  // Admin login removed — admin detected by email (madan123050@gmail.com)

  const handleAddPhoto = useCallback((photo: Photo) => {
    setPhotos((prev) => {
      // Prevent duplicate by checking imageUrl AND title
      const isDuplicate = prev.some(p => 
        p.imageUrl === photo.imageUrl || 
        (p.title === photo.title && p.imageUrl && photo.imageUrl && 
         p.imageUrl.replace(/[?#].*$/, '') === photo.imageUrl.replace(/[?#].*$/, ''))
      );
      if (isDuplicate) return prev;
      const updated = [photo, ...prev];
      return updated;
    });
  }, []);

  const handleDeletePhoto = useCallback((id: number | string) => {
    const photo = photos.find(p => p.id === id);
    if (photo?.firestoreId) {
      deletePhotoFromFirestore(photo.firestoreId).catch(err => console.warn('Firestore delete failed:', err));
    }
    setPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      return updated;
    });
  }, [photos]);

  const handleUpdatePhoto = useCallback((updated: Photo) => { setPhotos((prev) => prev.map((p) => p.id === updated.id ? updated : p)); }, []);

  // Story handlers
  const handleAddStory = useCallback(async (story: Story) => {
    // Save to Firestore
    try {
      let finalCoverUrl = story.coverImageUrl;
      if (story.coverImageUrl && story.coverImageUrl.startsWith('data:')) {
        try {
          finalCoverUrl = await uploadStoryCoverToStorage(story.coverImageUrl, `cover_${Date.now()}.jpg`);
        } catch (err) {
          console.warn('Firebase Storage upload for story cover failed:', err);
        }
      }
      const firestoreId = await addStoryToFirestore({
        title: story.title,
        slug: story.slug,
        excerpt: story.excerpt,
        content: story.content,
        coverImageUrl: finalCoverUrl,
        tags: story.tags,
        viewCount: story.viewCount || 0,
        likeCount: story.likeCount || 0,
        photographer: story.photographer || '',
      });
      story = { ...story, firestoreId, coverImageUrl: finalCoverUrl };
    } catch (err) {
      console.warn('Firestore story save failed:', err);
    }
    setStories((prev) => [story, ...prev]);
  }, []);

  const handleDeleteStory = useCallback((id: number) => {
    const story = stories.find(s => s.id === id);
    if (story?.firestoreId) {
      deleteStoryFromFirestore(story.firestoreId).catch(err => console.warn('Firestore story delete failed:', err));
    }
    setStories((prev) => prev.filter((s) => s.id !== id));
  }, [stories]);

  const handleUpdateStory = useCallback(async (updated: Story) => {
    // If cover image was changed to a data URL during edit, upload it first
    let finalCoverUrl = updated.coverImageUrl;
    if (updated.coverImageUrl && updated.coverImageUrl.startsWith('data:')) {
      try {
        finalCoverUrl = await uploadStoryCoverToStorage(updated.coverImageUrl, `cover_${Date.now()}.jpg`);
      } catch (err) {
        console.warn('Firebase Storage upload for story cover failed:', err);
      }
    }
    const finalUpdated = { ...updated, coverImageUrl: finalCoverUrl };

    if (finalUpdated.firestoreId) {
      updateStoryInFirestore(finalUpdated.firestoreId, {
        title: finalUpdated.title,
        slug: finalUpdated.slug,
        excerpt: finalUpdated.excerpt,
        content: finalUpdated.content,
        coverImageUrl: finalUpdated.coverImageUrl,
        tags: finalUpdated.tags,
        viewCount: finalUpdated.viewCount,
        likeCount: finalUpdated.likeCount,
        photographer: finalUpdated.photographer || '',
      }).catch(err => console.warn('Firestore story update failed:', err));
    }
    setStories((prev) => prev.map((s) => s.id === finalUpdated.id ? finalUpdated : s));
  }, []);

  // Video handlers
  const handleAddVideo = useCallback(async (video: Video) => {
    try {
      let finalVideoUrl = video.videoUrl;
      let finalThumbnailUrl = video.thumbnailUrl;
      if (video.videoUrl && video.videoUrl.startsWith('data:')) {
        try {
          finalVideoUrl = await uploadVideoToStorage(video.videoUrl, `video_${Date.now()}.mp4`);
        } catch (err) {
          console.warn('Firebase Storage video upload failed:', err);
        }
      }
      if (video.thumbnailUrl && video.thumbnailUrl.startsWith('data:')) {
        try {
          finalThumbnailUrl = await uploadVideoThumbnailToStorage(video.thumbnailUrl, `thumb_${Date.now()}.jpg`);
        } catch (err) {
          console.warn('Firebase Storage thumbnail upload failed:', err);
        }
      }
      const firestoreId = await addVideoToFirestore({
        title: video.title,
        description: video.description,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        tags: video.tags,
        location: video.location || '',
        duration: video.duration || '',
        viewCount: video.viewCount || 0,
        likeCount: video.likeCount || 0,
        photographer: video.photographer || '',
        ...(video.aspectRatio ? { aspectRatio: video.aspectRatio } : {}),
        ...(video.videoWidth ? { videoWidth: video.videoWidth } : {}),
        ...(video.videoHeight ? { videoHeight: video.videoHeight } : {}),
        ...(video.originalSize ? { originalSize: video.originalSize } : {}),
        ...(video.compressedSize ? { compressedSize: video.compressedSize } : {}),
      });
      video = { ...video, firestoreId, videoUrl: finalVideoUrl, thumbnailUrl: finalThumbnailUrl };
    } catch (err) {
      console.warn('Firestore video save failed:', err);
    }
    setVideos((prev) => [video, ...prev]);
  }, []);

  const handleDeleteVideo = useCallback((id: number) => {
    const video = videos.find(v => v.id === id);
    if (video?.firestoreId) {
      deleteVideoFromFirestore(video.firestoreId).catch(err => console.warn('Firestore video delete failed:', err));
    }
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, [videos]);

  const handleUpdateVideo = useCallback(async (updated: Video) => {
    // If video/thumbnail was changed to a data URL during edit, upload it first
    let finalVideoUrl = updated.videoUrl;
    let finalThumbnailUrl = updated.thumbnailUrl;
    if (updated.videoUrl && updated.videoUrl.startsWith('data:')) {
      try {
        finalVideoUrl = await uploadVideoToStorage(updated.videoUrl, `video_${Date.now()}.mp4`);
      } catch (err) {
        console.warn('Firebase Storage video upload failed:', err);
      }
    }
    if (updated.thumbnailUrl && updated.thumbnailUrl.startsWith('data:')) {
      try {
        finalThumbnailUrl = await uploadVideoThumbnailToStorage(updated.thumbnailUrl, `thumb_${Date.now()}.jpg`);
      } catch (err) {
        console.warn('Firebase Storage thumbnail upload failed:', err);
      }
    }
    const finalUpdated = { ...updated, videoUrl: finalVideoUrl, thumbnailUrl: finalThumbnailUrl };

    if (finalUpdated.firestoreId) {
      updateVideoInFirestore(finalUpdated.firestoreId, {
        title: finalUpdated.title,
        description: finalUpdated.description,
        videoUrl: finalUpdated.videoUrl,
        thumbnailUrl: finalUpdated.thumbnailUrl,
        tags: finalUpdated.tags,
        location: finalUpdated.location || '',
        duration: finalUpdated.duration || '',
        viewCount: finalUpdated.viewCount,
        likeCount: finalUpdated.likeCount,
        photographer: finalUpdated.photographer || '',
        ...(finalUpdated.aspectRatio ? { aspectRatio: finalUpdated.aspectRatio } : {}),
        ...(finalUpdated.videoWidth ? { videoWidth: finalUpdated.videoWidth } : {}),
        ...(finalUpdated.videoHeight ? { videoHeight: finalUpdated.videoHeight } : {}),
        ...(finalUpdated.originalSize ? { originalSize: finalUpdated.originalSize } : {}),
        ...(finalUpdated.compressedSize ? { compressedSize: finalUpdated.compressedSize } : {}),
      }).catch(err => console.warn('Firestore video update failed:', err));
    }
    setVideos((prev) => prev.map((v) => v.id === finalUpdated.id ? finalUpdated : v));
  }, []);

  const handleStoryClick = useCallback((story: Story) => {
    savedScrollRef.current = window.scrollY;
    storyReturnPathRef.current = window.location.pathname.startsWith('/story/') ? '/' : window.location.pathname;
    setSelectedStory({ ...story, viewCount: story.viewCount + 1 });
    setStories((prev) => prev.map((s) => s.id === story.id ? { ...s, viewCount: s.viewCount + 1 } : s));
    recordView('story', story.firestoreId);
    trackSiteEvent({
      type: 'story_view',
      page: `/story/${story.slug || story.firestoreId || story.id}`,
      targetId: story.firestoreId || String(story.id),
      targetTitle: story.title,
    });
    setView('story-detail');
    const storyToken = story.slug || story.firestoreId || String(story.id);
    window.history.pushState({}, '', '/story/' + encodeURIComponent(storyToken));
    window.scrollTo(0, 0);
  }, [recordView, trackSiteEvent]);

  const getViewIncrement = useCallback((type: string, id?: string): number => {
    if (!id) return 0;
    const key = `${type}:${id}`;
    if (viewedTargetsRef.current.has(key)) return 0;
    return 1;
  }, []);

  const handleVideoClick = useCallback((video: Video) => {
    savedScrollRef.current = window.scrollY;
    videoReturnPathRef.current = window.location.pathname.startsWith('/video/') ? '/' : window.location.pathname;
    const viewIncrement = getViewIncrement('video', video.firestoreId);
    const updated = { ...video, viewCount: (video.viewCount || 0) + viewIncrement };
    setSelectedVideo(updated);
    setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, viewCount: (v.viewCount || 0) + 1 } : v));
    recordView('video', video.firestoreId);
    trackSiteEvent({
      type: 'video_view',
      page: `/video/${video.firestoreId || video.id}`,
      targetId: video.firestoreId || String(video.id),
      targetTitle: video.title,
    });
    setView('video-detail');
    const videoToken = video.firestoreId || String(video.id);
    window.history.pushState({}, '', '/video/' + encodeURIComponent(videoToken));
    window.scrollTo(0, 0);
  }, [recordView, trackSiteEvent]);

  const handleStoryLike = useCallback(() => {
    if (!selectedStory) return;
    const updated = {
      ...selectedStory,
      liked: !selectedStory.liked,
      likeCount: selectedStory.liked ? selectedStory.likeCount - 1 : selectedStory.likeCount + 1,
    };
    setSelectedStory(updated);
    setStories((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    if (selectedStory.firestoreId) {
      incrementStoryCounter(selectedStory.firestoreId, 'likeCount', updated.liked ? 1 : -1).catch(err => console.warn('Story like update failed:', err));
    }
    // Save per-user like to Firestore
    const sLikeKey = selectedStory.firestoreId || String(selectedStory.id);
    if (updated.liked) {
      trackSiteEvent({
        type: 'like',
        page: window.location.pathname,
        targetId: sLikeKey,
        targetTitle: selectedStory.title,
      });
    }
    if (visitor?.email) {
      if (updated.liked) addUserLike(visitor.email, 'story', sLikeKey).catch(console.warn);
      else removeUserLike(visitor.email, 'story', sLikeKey).catch(console.warn);
    }
    setUserLikes(prev => {
      const next = new Set(prev);
      if (updated.liked) next.add(`story_${sLikeKey}`);
      else next.delete(`story_${sLikeKey}`);
      return next;
    });
  }, [selectedStory, visitor, trackSiteEvent]);

  // Visitor handlers
  const handleVisitorLogin = useCallback(async (v: Visitor) => {
    const userKey = v.email || '';
    let merged = v;
    let savedDownloadCount = 0;
    // Check Firestore for saved profile
    if (userKey) {
      try {
        const savedVisitor = await getVisitorFromFirestore(userKey);
        if (savedVisitor) {
          merged = { ...v, displayName: savedVisitor.displayName || v.displayName, avatarColor: savedVisitor.avatarColor || v.avatarColor, avatarUrl: savedVisitor.avatarUrl || v.avatarUrl };
          savedDownloadCount = savedVisitor.downloadCount || 0;
          setDownloadCount(savedDownloadCount);
        }
      } catch {}
    }
    setVisitor(merged);
    setShowVisitorLogin(false);
    // Auto-detect admin by email — go to home, not admin dashboard
    if (merged.email && merged.email.toLowerCase() === ADMIN_EMAIL) {
      setIsAdmin(true);
      setView('home');
      localStorage.setItem('wa_admin_session', 'true');
    }
    // Welcome notification for first-time visitors
    const welcomeKey = `wa_welcomed_${userKey || merged.displayName}`;
    if (!localStorage.getItem(welcomeKey)) {
      localStorage.setItem(welcomeKey, '1');
      addNotification({
        title: `Namaste 🙏 ${merged.displayName}!`,
        message: `Welcome to WildSaura! 🌿\nExplore our wildlife gallery, share your love for nature, and discover the wild beauty of India.\n\nEnjoy unlimited free high-quality downloads! 📸`,
        type: 'welcome',
        icon: '🙏',
      });
    }
    // Save/update profile in Firestore (merge: true preserves existing fields)
    if (userKey) {
      saveVisitorToFirestore({
        email: merged.email,
        displayName: merged.displayName,
        avatarColor: merged.avatarColor,
        avatarUrl: merged.avatarUrl || '',
        avatarAnimal: merged.avatarAnimal || '',
        loginMethod: merged.loginMethod,
        downloadCount: savedDownloadCount,
      }).catch(err => console.warn('Visitor save failed:', err));
      // Load user's likes
      try {
        const likes = await getUserLikes(userKey);
        const likeSet = new Set(likes.map(l => `${l.targetType}_${l.targetId}`));
        setUserLikes(likeSet);
      } catch {}
    }
  }, []);

  const handleVisitorLogout = useCallback(() => {
    import('./firebaseAuth')
      .then(({ signOutCurrentUser }) => signOutCurrentUser())
      .catch(console.warn);
    setVisitor(null);
    setIsAdmin(false);
    localStorage.removeItem('wa_admin_session');
    setDownloadCount(0);
    setUserLikes(new Set());
    // Reset liked state on all items
    setPhotos(prev => prev.map(p => ({ ...p, liked: false })));
    setStories(prev => prev.map(s => ({ ...s, liked: false })));
    setVideos(prev => prev.map(v => ({ ...v, liked: false })));
  }, []);

  const handleVisitorUpdate = useCallback((v: Visitor) => {
    setVisitor(v);
    const userKey = v.email || '';
    if (userKey) {
      updateVisitorProfile(userKey, {
        displayName: v.displayName,
        avatarColor: v.avatarColor,
        avatarUrl: v.avatarUrl || '',
        avatarAnimal: v.avatarAnimal || '',
      }).catch(err => console.warn('Visitor update failed:', err));
    }
  }, []);

  // Comment handlers
  const handleAddPhotoComment = useCallback((firestoreId: string, content: string) => {
    const actor = visitor || getGuestIdentity();
    const newComment: Comment = {
      id: Date.now(),
      displayName: actor.displayName,
      avatarColor: actor.avatarColor,
      avatarUrl: actor.avatarUrl || '',
      content,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPhotoComments((prev) => ({
      ...prev,
      [firestoreId]: [...(prev[firestoreId] || []), newComment],
    }));
    addCommentToFirestore({
      targetType: 'photo',
      targetId: firestoreId,
      displayName: actor.displayName,
      avatarColor: actor.avatarColor || '',
      avatarUrl: actor.avatarUrl || '',
      content,
    }).catch(err => console.warn('Comment save failed:', err));
    const photo = photos.find((p) => p.firestoreId === firestoreId);
    trackSiteEvent({
      type: 'comment',
      page: window.location.pathname,
      category: photo?.category,
      targetId: firestoreId,
      targetTitle: photo?.title,
    });
  }, [visitor, getGuestIdentity, photos, trackSiteEvent]);

  const handleAddStoryComment = useCallback((firestoreId: string, content: string) => {
    const actor = visitor || getGuestIdentity();
    const newComment: Comment = {
      id: Date.now(),
      displayName: actor.displayName,
      avatarColor: actor.avatarColor,
      avatarUrl: actor.avatarUrl || '',
      content,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setStoryComments((prev) => ({
      ...prev,
      [firestoreId]: [...(prev[firestoreId] || []), newComment],
    }));
    addCommentToFirestore({
      targetType: 'story',
      targetId: firestoreId,
      displayName: actor.displayName,
      avatarColor: actor.avatarColor || '',
      avatarUrl: actor.avatarUrl || '',
      content,
    }).catch(err => console.warn('Comment save failed:', err));
    const story = stories.find((s) => s.firestoreId === firestoreId);
    trackSiteEvent({
      type: 'comment',
      page: window.location.pathname,
      targetId: firestoreId,
      targetTitle: story?.title,
    });
  }, [visitor, getGuestIdentity, stories, trackSiteEvent]);

  const handleAddVideoComment = useCallback((firestoreId: string, content: string) => {
    const actor = visitor || getGuestIdentity();
    const newComment: Comment = {
      id: Date.now(),
      displayName: actor.displayName,
      avatarColor: actor.avatarColor,
      avatarUrl: actor.avatarUrl || '',
      content,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setVideoComments((prev) => ({
      ...prev,
      [firestoreId]: [...(prev[firestoreId] || []), newComment],
    }));
    addCommentToFirestore({
      targetType: 'video',
      targetId: firestoreId,
      displayName: actor.displayName,
      avatarColor: actor.avatarColor || '',
      avatarUrl: actor.avatarUrl || '',
      content,
    }).catch(err => console.warn('Video comment save failed:', err));
    const video = videos.find((v) => v.firestoreId === firestoreId);
    trackSiteEvent({
      type: 'comment',
      page: window.location.pathname,
      targetId: firestoreId,
      targetTitle: video?.title,
    });
  }, [visitor, getGuestIdentity, videos, trackSiteEvent]);

  const handleDeleteComment = useCallback((commentFirestoreId: string) => {
    if (!confirm('Delete this comment?')) return;
    deleteCommentFromFirestore(commentFirestoreId).catch(err => console.warn('Delete comment failed:', err));
    // Real-time subscription will auto-update the UI
  }, []);

  const handleVideoLike = useCallback((id: number) => {
    setVideos((prev) => {
      const video = prev.find(v => v.id === id);
      if (!video) return prev;
      const newLiked = !video.liked;
      const newLikeCount = newLiked ? video.likeCount + 1 : video.likeCount - 1;
      if (video.firestoreId) {
        incrementVideoCounter(video.firestoreId, 'likeCount', newLiked ? 1 : -1).catch(err => console.warn('Video like update failed:', err));
      }
      // Save per-user like to Firestore
      const vLikeKey = video?.firestoreId || String(id);
      if (newLiked) {
        trackSiteEvent({
          type: 'like',
          page: window.location.pathname,
          targetId: vLikeKey,
          targetTitle: video.title,
        });
      }
      if (visitor?.email) {
        if (newLiked) addUserLike(visitor.email, 'video', vLikeKey).catch(console.warn);
        else removeUserLike(visitor.email, 'video', vLikeKey).catch(console.warn);
      }
      setUserLikes(prev => {
        const next = new Set(prev);
        if (newLiked) next.add(`video_${vLikeKey}`);
        else next.delete(`video_${vLikeKey}`);
        return next;
      });
      return prev.map((v) =>
        v.id === id ? { ...v, liked: newLiked, likeCount: newLikeCount } : v
      );
    });
  }, [visitor, trackSiteEvent]);

  const handleDownload = useCallback(async (photo: Photo) => {
    if (!visitor) { setShowVisitorLogin(true); return; }
    setIsDownloading(true);
    try {
      const applyWatermark = false; // All downloads are free without watermark
      await downloadPhoto(photo.imageUrl, photo.title, applyWatermark);
      const newCount = downloadCount + 1;
      setDownloadCount(newCount);
      trackSiteEvent({
        type: 'download',
        page: window.location.pathname,
        category: photo.category,
        targetId: photo.firestoreId || String(photo.id),
        targetTitle: photo.title,
      });
      // Persist download count to Firestore
      const userKey = visitor.email || '';
      if (userKey) {
        updateVisitorDownloadCount(userKey, newCount).catch(err => console.warn('Download count save failed:', err));
      }
    } catch (err) {
      console.warn('Download failed:', err instanceof Error ? err.message : 'unknown');
    } finally {
      setIsDownloading(false);
    }
  }, [visitor, downloadCount, trackSiteEvent]);

  const handleGenerateStory = useCallback(async (photo: Photo) => {
    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoTitle: photo.title,
          animalName: photo.animalName || '',
          location: photo.location || '',
          caption: photo.caption || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      let newStory: Story = {
        id: Date.now(),
        title: data.title,
        slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        excerpt: data.excerpt,
        content: data.content,
        coverImageUrl: photo.imageUrl,
        tags: data.tags || [],
        createdAt: new Date().toISOString().split('T')[0],
        viewCount: 0,
        likeCount: 0,
        liked: false,
      };
      
      // Save to Firestore
      try {
        const firestoreId = await addStoryToFirestore({
          title: newStory.title,
          slug: newStory.slug,
          excerpt: newStory.excerpt,
          content: newStory.content,
          coverImageUrl: newStory.coverImageUrl,
          tags: newStory.tags,
          viewCount: 0,
          likeCount: 0,
        });
        newStory = { ...newStory, firestoreId };
      } catch (err) {
        console.warn('Firestore save for generated story failed:', err);
      }

      setStories(prev => [newStory, ...prev]);
      
      // Show success toast
      const toast = document.createElement('div');
      toast.textContent = '✅ AI Story generated! Check Stories section.';
      toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);padding:0.75rem 1.5rem;background:#1a1a1a;color:#d4a853;border:1px solid rgba(201,168,76,0.4);border-radius:8px;font-size:0.85rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => document.body.removeChild(toast), 500); }, 3000);
      
      return newStory;
    } catch (err) {
      console.error('Story generation failed:', err);
      alert('Failed to generate story. Please try again.');
      return null;
    }
  }, []);

  const handleTermsClick = useCallback(() => {
    setView('terms');
    window.history.pushState({}, '', '/terms');
    window.scrollTo(0, 0);
  }, []);

  const handlePrivacyPolicyClick = useCallback(() => {
    setView('privacy-policy');
    window.history.pushState({}, '', '/privacy-policy');
    window.scrollTo(0, 0);
  }, []);

  const handleDataDeletionClick = useCallback(() => {
    setView('data-deletion');
    window.history.pushState({}, '', '/data-deletion');
    window.scrollTo(0, 0);
  }, []);

  const footerNavProps = {
    logoUrl,
    onTermsClick: handleTermsClick,
    onPrivacyPolicyClick: handlePrivacyPolicyClick,
    onDataDeletionClick: handleDataDeletionClick,
  };

  const handleStoriesNavClick = useCallback(() => {
    setView('story-grid');
    window.history.pushState({}, '', '/story-grid');
    window.scrollTo(0, 0);
  }, []);

  const handleProfileClick = useCallback(() => {
    setShowProfile(true);
  }, []);

  const handleCommunityClick = useCallback(() => {
    setView('community');
    window.history.pushState({}, '', '/community');
    window.scrollTo(0, 0);
  }, []);

  const handleLogoClick = useCallback(() => {
    setView('home');
    window.history.pushState({}, '', '/');
    window.scrollTo(0, 0);
  }, []);

  // ── Helper: Open/Close Photo with URL ────────────────────────────────────
  const openPhoto = useCallback((photo: Photo | null) => {
    const viewIncrement = photo ? getViewIncrement('photo', photo.firestoreId) : 0;
    const updatedPhoto = photo ? { ...photo, viewCount: (photo.viewCount || 0) + viewIncrement } : null;
    if (photo) {
      savedScrollRef.current = window.scrollY;
      const isModalNavigation = window.location.pathname.startsWith('/photo/');
      if (!isModalNavigation) photoReturnPathRef.current = window.location.pathname;
      setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p));
      recordView('photo', photo.firestoreId);
      const photoId = photo.slug || photo.firestoreId || String(photo.id);
      const nextPhotoPath = '/photo/' + encodeURIComponent(photoId);
      if (isModalNavigation) window.history.replaceState({}, '', nextPhotoPath);
      else window.history.pushState({}, '', nextPhotoPath);
      trackSiteEvent({
        type: 'photo_view',
        page: '/photo/' + encodeURIComponent(photoId),
        category: photo.category,
        targetId: photo.firestoreId || String(photo.id),
        targetTitle: photo.title,
      });
    } else {
      window.history.replaceState({}, '', photoReturnPathRef.current || '/');
    }
    setSelectedPhoto(updatedPhoto);
  }, [recordView, trackSiteEvent]);

  // ── Helper: Close Photo Modal ────────────────────────────────────────────
  const closePhoto = useCallback(() => {
    setSelectedPhoto(null);
    window.history.replaceState({}, '', photoReturnPathRef.current || '/');
    requestAnimationFrame(() => { window.scrollTo(0, savedScrollRef.current); });
  }, []);

  useEffect(() => {
    if (view !== 'home' || !loadHomeGallery) return;
    let disposed = false;
    import('./services/galleryService')
      .then((service) => service.getGalleryPhotosFromFirestore(HOME_GALLERY_LIMIT))
      .then((items) => {
        if (!disposed) setGalleryPhotos(items);
      })
      .catch((error) => console.warn('Deferred gallery fetch failed:', error));
    return () => { disposed = true; };
  }, [loadHomeGallery, view]);

  useEffect(() => {
    if (!showSearch || searchPhotos) return;
    let disposed = false;
    import('./services/photoService')
      .then((service) => service.getPhotosFromFirestore())
      .then((items) => {
        if (disposed) return;
        const mapped: Photo[] = items.map((photo, index) => ({
          id: Date.now() + index,
          firestoreId: photo.id,
          slug: photo.slug || '',
          title: photo.title,
          category: photo.category as any,
          imageUrl: photo.imageUrl,
          thumbnailUrl: photo.thumbnailUrl || undefined,
          location: photo.location || '',
          caption: photo.caption || '',
          type: (photo.type || 'photo') as 'photo' | 'video',
          cameraModel: photo.cameraModel || '',
          lens: photo.lens || '',
          aperture: photo.aperture || '',
          shutterSpeed: photo.shutterSpeed || '',
          iso: photo.iso || '',
          focalLength: photo.focalLength || '',
          tags: photo.tags || [],
          animalName: photo.animalName || '',
          photographer: photo.photographer || '',
          latitude: photo.latitude || undefined,
          longitude: photo.longitude || undefined,
          published: photo.published !== false,
          likeCount: photo.likeCount || 0,
          viewCount: photo.viewCount || 0,
          liked: userLikes.has(`photo_${photo.id}`),
          createdAt: photo.createdAt || null,
        }));
        setSearchPhotos(mapped);
      })
      .catch((error) => console.warn('Search photo fetch failed:', error));
    return () => { disposed = true; };
  }, [searchPhotos, showSearch]);

  useEffect(() => {
    const targets: Array<{ type: 'photo' | 'story' | 'video'; id: string }> = [];
    if (selectedPhoto?.firestoreId) targets.push({ type: 'photo', id: selectedPhoto.firestoreId });
    if (selectedStory?.firestoreId) targets.push({ type: 'story', id: selectedStory.firestoreId });
    if (selectedVideo?.firestoreId) targets.push({ type: 'video', id: selectedVideo.firestoreId });

    const shouldLoadVisibleVideoComments = view === 'home' || view === 'video-grid';
    if (shouldLoadVisibleVideoComments) {
      videos
        .slice(0, view === 'home' ? HOME_VIDEO_LIMIT : videos.length)
        .forEach((video) => {
          if (video.firestoreId) targets.push({ type: 'video', id: video.firestoreId });
        });
    }

    if (targets.length === 0) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    import('./services/commentService').then((service) => {
      if (disposed) return;
      targets.forEach(({ type, id }) => {
        const unsubscribe = service.subscribeToCommentsForTarget(type, id, (items) => {
          const mapped: Comment[] = items.map((comment, index) => ({
            id: Date.now() + index,
            firestoreId: comment.id,
            displayName: comment.displayName,
            avatarColor: comment.avatarColor || '',
            avatarUrl: comment.avatarUrl || '',
            content: comment.content,
            createdAt: comment.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
          }));
          const setter = type === 'photo' ? setPhotoComments : type === 'story' ? setStoryComments : setVideoComments;
          setter((previous) => ({ ...previous, [id]: mapped }));
        });
        cleanups.push(unsubscribe);
      });
    }).catch((error) => console.warn('Target comment subscription failed:', error));

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [selectedPhoto?.firestoreId, selectedStory?.firestoreId, selectedVideo?.firestoreId, videos, view]);

  const renderSharedOverlays = () => (
    <Suspense fallback={<InlineFallback />}>
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={closePhoto}
          onLike={() => handleLike(selectedPhoto.id)}
          onShare={() => handleShare(selectedPhoto)}
          onDownload={() => handleDownload(selectedPhoto)}
          onGenerateStory={() => handleGenerateStory(selectedPhoto)}
          isGeneratingStory={false}
          isAdmin={isAdmin}
          visitor={visitor}
          comments={photoComments[selectedPhoto.firestoreId || `preview-${selectedPhoto.slug || selectedPhoto.id}`] || []}
          onAddComment={(content) => handleAddPhotoComment(selectedPhoto.firestoreId || `preview-${selectedPhoto.slug || selectedPhoto.id}`, content)}
          onDeleteComment={handleDeleteComment}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          freeDownloadsLeft={Math.max(0, FREE_DOWNLOADS - downloadCount)}
          isDownloading={isDownloading}
          photos={(searchPhotos || photos).filter((photo) => photo.published !== false)}
          onNavigate={openPhoto}
        />
      )}
      {showSearch && (
        <SearchBar
          isOpen={showSearch}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          photos={searchPhotos || photos}
          onPhotoClick={openPhoto}
        />
      )}
      {showVisitorLogin && (
        <VisitorLogin
          isOpen={showVisitorLogin}
          onClose={() => setShowVisitorLogin(false)}
          onLogin={handleVisitorLogin}
        />
      )}
      {showProfile && (
        <ProfileModal
          isOpen={showProfile}
          visitor={visitor}
          onClose={() => setShowProfile(false)}
          onVisitorUpdate={handleVisitorUpdate}
          onLogout={handleVisitorLogout}
          downloadCount={downloadCount}
        />
      )}
      {showNotifPanel && (
        <NotificationPanel
          isOpen={showNotifPanel}
          onClose={() => setShowNotifPanel(false)}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onDelete={handleDeleteNotif}
          onClearAll={handleClearAllNotifs}
        />
      )}
    </Suspense>
  );

  // ── Helper: Go back from story to home ───────────────────────────────────
  const handleStoryBack = useCallback(() => {
    const returnPath = storyReturnPathRef.current || '/';
    setView(returnPath === '/story-grid' ? 'story-grid' : 'home');
    setSelectedStory(null);
    window.history.replaceState({}, '', returnPath);
    requestAnimationFrame(() => { window.scrollTo(0, savedScrollRef.current); });
  }, []);

  const handleVideoBack = useCallback(() => {
    const returnPath = videoReturnPathRef.current || '/';
    setView(returnPath === '/video-grid' ? 'video-grid' : 'home');
    setSelectedVideo(null);
    window.history.replaceState({}, '', returnPath);
    requestAnimationFrame(() => { window.scrollTo(0, savedScrollRef.current); });
  }, []);

  // Admin login removed — admin auto-detected by email

  // ── Photo Grid View ──
  if (view === 'photo-grid') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)' }}>
        <Suspense fallback={<RouteFallback />}>
          <PhotoGridPage
            photos={photos}
            filterTabs={FILTER_TABS}
            isLoading={photosLoading}
            initialCategory={selectedCategory}
            onCategoryChange={handleGalleryCategoryChange}
            onBack={() => { setView('home'); setSelectedCategory('all'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }}
            onPhotoClick={openPhoto}
            onLike={handleLike}
            onShare={handleShare}
            onDownload={handleDownload}
            isLoggedIn={!!visitor}
            onLoginRequired={() => setShowVisitorLogin(true)}
          />
          {renderSharedOverlays()}
        </Suspense>
      </div>
    );
  }

  // ── Story Grid View ──
  if (view === 'story-grid') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)' }}>
        <Suspense fallback={<RouteFallback />}>
          <StoryGridPage
            stories={stories}
            isLoading={storiesLoading}
            onBack={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }}
            onStoryClick={handleStoryClick}
          />
          {renderSharedOverlays()}
        </Suspense>
      </div>
    );
  }

  // ── Video Grid View ──
  if (view === 'video-grid') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)' }}>
        <Suspense fallback={<RouteFallback />}>
          <VideoGridPage
            videos={videos}
            isLoading={videosLoading}
            onVideoClick={handleVideoClick}
            onBack={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }}
            visitor={visitor}
            videoComments={videoComments}
            onAddVideoComment={handleAddVideoComment}
            onVideoLike={handleVideoLike}
            onVisitorLoginClick={() => setShowVisitorLogin(true)}
            isAdmin={isAdmin}
            onDeleteComment={handleDeleteComment}
          />
          {renderSharedOverlays()}
        </Suspense>
      </div>
    );
  }

  // ── Admin Dashboard View ──
  if (view === 'admin-dashboard') {
    return (
      <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--wa-bg)', color: 'var(--wa-text)', padding: '6rem 1rem' }}>Loading dashboard...</main>}>
        <AdminDashboard
          logoUrl={logoUrl}
          photos={photos}
          onLogout={handleLogout}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
          onUpdatePhoto={handleUpdatePhoto}
          onViewSite={() => { setView('home'); window.history.pushState({}, '', '/'); }}
          stories={stories}
          onAddStory={handleAddStory}
          onDeleteStory={handleDeleteStory}
          onUpdateStory={handleUpdateStory}
          videos={videos}
          onAddVideo={handleAddVideo}
          allComments={allFirestoreComments}
          onDeleteComment={handleDeleteComment}
          onDeleteVideo={handleDeleteVideo}
          onUpdateVideo={handleUpdateVideo}
        />
      </Suspense>
    );
  }

  // ── Terms & Conditions View ──
  if (view === 'terms') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column' }}>
        <Header
          onScrollToGallery={scrollToGallery}
          logoUrl={logoUrl}
          onLogoClick={handleLogoClick}
          onSearchClick={() => setShowSearch(true)}
          visitor={visitor}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          onVisitorLogout={handleVisitorLogout}
          onVisitorUpdate={handleVisitorUpdate}
          onStoriesClick={handleStoriesNavClick}
          notificationCount={unreadNotifCount}
          onNotificationClick={() => setShowNotifPanel(p => !p)}
          isAdmin={isAdmin}
          onAdminClick={() => { setView('admin-dashboard'); window.history.pushState({}, '', '/admin'); }}
        />
        <div style={{ flex: 1 }}>
          <Suspense fallback={<RouteFallback />}>
            <TermsConditions onBack={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }} />
          </Suspense>
        </div>
        <Footer {...footerNavProps} />
        {renderSharedOverlays()}
      </div>
    );
  }

  // ── Meta Eligibility Legal Pages ──
  if (view === 'privacy-policy' || view === 'data-deletion') {
    const LegalPage = view === 'privacy-policy' ? PrivacyPolicyPage : DataDeletionPage;
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column' }}>
        <Header
          onScrollToGallery={scrollToGallery}
          logoUrl={logoUrl}
          onLogoClick={handleLogoClick}
          onSearchClick={() => setShowSearch(true)}
          visitor={visitor}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          onVisitorLogout={handleVisitorLogout}
          onVisitorUpdate={handleVisitorUpdate}
          onStoriesClick={handleStoriesNavClick}
          notificationCount={unreadNotifCount}
          onNotificationClick={() => setShowNotifPanel(p => !p)}
          isAdmin={isAdmin}
          onAdminClick={() => { setView('admin-dashboard'); window.history.pushState({}, '', '/admin'); }}
        />
        <div style={{ flex: 1 }}>
          <Suspense fallback={<RouteFallback />}>
            <LegalPage onBack={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }} />
          </Suspense>
        </div>
        <Footer {...footerNavProps} />
        {renderSharedOverlays()}
      </div>
    );
  }

  // ── Story Detail View ──
  if (view === 'story-detail' && selectedStory) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column' }}>
        <Header
          onScrollToGallery={scrollToGallery}
          logoUrl={logoUrl}
          onLogoClick={handleLogoClick}
          onSearchClick={() => setShowSearch(true)}
          visitor={visitor}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          onVisitorLogout={handleVisitorLogout}
          onVisitorUpdate={handleVisitorUpdate}
          onStoriesClick={handleStoriesNavClick}
          notificationCount={unreadNotifCount}
          onNotificationClick={() => setShowNotifPanel(p => !p)}
          isAdmin={isAdmin}
          onAdminClick={() => { setView('admin-dashboard'); window.history.pushState({}, '', '/admin'); }}
        />
        <div style={{ flex: 1 }}>
          <Suspense fallback={<RouteFallback />}>
            <StoryDetail
              story={selectedStory}
              onBack={handleStoryBack}
              onLike={handleStoryLike}
              visitor={visitor}
              comments={storyComments[selectedStory.firestoreId || ''] || []}
              onAddComment={(content) => handleAddStoryComment(selectedStory.firestoreId || '', content)}
              onVisitorLoginClick={() => setShowVisitorLogin(true)}
              isAdmin={isAdmin}
              onDeleteComment={handleDeleteComment}
            />
          </Suspense>
        </div>
        <Footer {...footerNavProps} />
        {renderSharedOverlays()}
      </div>
    );
  }

  if (view === 'video-detail' && selectedVideo) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column' }}>
        <Header
          onScrollToGallery={scrollToGallery}
          logoUrl={logoUrl}
          onLogoClick={handleLogoClick}
          onSearchClick={() => setShowSearch(true)}
          visitor={visitor}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          onVisitorLogout={handleVisitorLogout}
          onVisitorUpdate={handleVisitorUpdate}
          onStoriesClick={handleStoriesNavClick}
          notificationCount={unreadNotifCount}
          onNotificationClick={() => setShowNotifPanel(p => !p)}
          isAdmin={isAdmin}
          onAdminClick={() => { setView('admin-dashboard'); window.history.pushState({}, '', '/admin'); }}
        />
        <div style={{ flex: 1 }}>
          <Suspense fallback={<RouteFallback />}>
            <VideoDetail
              video={selectedVideo}
              onBack={handleVideoBack}
              onLike={() => {
                handleVideoLike(selectedVideo.id);
                setSelectedVideo((current) => current ? {
                  ...current,
                  liked: !current.liked,
                  likeCount: current.liked ? current.likeCount - 1 : current.likeCount + 1,
                } : current);
              }}
            />
          </Suspense>
        </div>
        <Footer {...footerNavProps} />
        {renderSharedOverlays()}
      </div>
    );
  }

  const StaticPage = ({ title, text, cta, image, imageSrcSet, imageSizes }: { title: string; text: string; cta?: string; image?: string; imageSrcSet?: string; imageSizes?: string }) => (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column' }}>
      <Header
        onScrollToGallery={scrollToGallery}
        logoUrl={logoUrl}
        onLogoClick={handleLogoClick}
        onSearchClick={() => setShowSearch(true)}
        visitor={visitor}
        onVisitorLoginClick={() => setShowVisitorLogin(true)}
        onVisitorLogout={handleVisitorLogout}
        onVisitorUpdate={handleVisitorUpdate}
        onStoriesClick={handleStoriesNavClick}
        notificationCount={unreadNotifCount}
        onNotificationClick={() => setShowNotifPanel(p => !p)}
        isAdmin={isAdmin}
        onAdminClick={() => { setView('admin-dashboard'); window.history.pushState({}, '', '/admin'); }}
      />
      <main className="editorial-static-page">
        <div className="wa-container editorial-static-page__grid">
          <div className="editorial-static-page__content">
            <button
              type="button"
              className="text-arrow-link"
              onClick={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }}
            >
              ← Back to home
            </button>
            <p className="section-kicker"><span>WA</span> Wilds Aura</p>
            <h1>{title}</h1>
            <p className="editorial-static-page__lead">{text}</p>
            {cta && <p className="editorial-static-page__cta">{cta}</p>}
          </div>
          {image && (
            <div className="editorial-static-page__image">
              <img src={image} srcSet={imageSrcSet} sizes={imageSizes} alt="" width={1200} height={900} />
            </div>
          )}
        </div>
      </main>
      <Footer {...footerNavProps} />
      {renderSharedOverlays()}
    </div>
  );
  if (view === 'marketplace') return <StaticPage title="Authentic photography, collected with purpose." text="Support local photographers by licensing high-quality images for personal and commercial work through the WildSaura Market." cta="A share of every purchase supports animal rescue in Nepal." image="/photos/photo-wildlife.jpeg" />;
  if (view === 'community') return (
    <Suspense fallback={<RouteFallback />}>
      <CommunityPage
          onBack={() => { setView('home'); window.history.pushState({}, '', '/'); }}
          logoUrl={logoUrl}
          onScrollToGallery={scrollToGallery}
          onSearchClick={() => setShowSearch(true)}
          visitor={visitor}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          onVisitorLogout={handleVisitorLogout}
          onVisitorUpdate={handleVisitorUpdate}
          onStoriesClick={handleStoriesNavClick}
          notificationCount={notificationCount}
          onNotificationClick={() => setShowNotifPanel(true)}
          isAdmin={isAdmin}
          onAdminClick={() => { setView('admin-dashboard'); window.history.pushState({}, '', '/admin'); }}
          onTermsClick={handleTermsClick}
          onPrivacyPolicyClick={handlePrivacyPolicyClick}
          onDataDeletionClick={handleDataDeletionClick}
          onProfileClick={handleProfileClick}
        />
        {renderSharedOverlays()}
    </Suspense>
  );
  if (view === 'ngo') return <StaticPage title="A visual story can become practical care." text="We are building a transparent system to support injured and abandoned animals across Nepal through rescue, treatment, feeding, and trusted local partners." cta="The long-term plan includes verified rescue partners and clear monthly reporting." image="/photos/tiger-hero.jpg" />;
  if (view === 'about') return <StaticPage title="A field journal made between two homes." text="Wilds Aura connects photographers, nature lovers, and a mission to protect animals through patient visual storytelling from Nepal and Japan." image="/images/optimized/madan-about-png-1024.webp" imageSrcSet="/images/optimized/madan-about-png-560.webp 560w, /images/optimized/madan-about-png-800.webp 800w, /images/optimized/madan-about-png-1024.webp 1024w" imageSizes="(max-width: 760px) calc(100vw - 2rem), 50vw" />;
  if (view === 'contact') return <StaticPage title="Let’s start a thoughtful collaboration." text="For assignments, print licensing, conservation partnerships, volunteering, or media enquiries, use the contact form on the homepage or email hello@wildsaura.com." image="/photos/photo-landscape.jpeg" />;

  // ── Smart Category Thumbnails ────────────────────────────────────────────
  // Priority:
  //   1. Admin manual override via Site Settings (dashboard upload)
  //   2. Best photo from Firestore for that exact category (sorted by most liked = most engaging)
  //      Uses thumbnailUrl if available for fast loading
  //   3. Gallery photos (rotates daily)
  const todayDayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

  const getAutoCategoryThumbnail = (
    settingsKey: keyof NonNullable<SiteSettings['categoryImages']>,
    galleryCategories: string[],
    photoCategory: string
  ): string => {
    // 1. Admin manual override takes priority
    const manual = siteSettings.categoryImages?.[settingsKey];
    if (manual) return manual;

    // 2. Best photo from Firestore for this category — match by category field OR tags
    const fromPhotos = photos
      .filter(
        p => (
          p.category === (photoCategory as any) ||
          p.tags?.some(t => t.toLowerCase() === photoCategory.toLowerCase())
        ) &&
             p.published !== false &&
             p.imageUrl
      )
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    if (fromPhotos.length > 0) {
      const best = fromPhotos[0];
      // Use thumbnailUrl if available for faster loading
      return best.thumbnailUrl || best.imageUrl;
    }

    // 3. Gallery photos (rotates daily)
    const fromGallery = galleryPhotos.filter(p => galleryCategories.includes(p.category) && p.imageUrl);
    if (fromGallery.length > 0) {
      return fromGallery[todayDayIndex % fromGallery.length].imageUrl;
    }

    return '';
  };

  const dynamicCategories: Category[] = [
    { key: 'wildlife',  label: 'Wildlife',        imageUrl: getAutoCategoryThumbnail('wildlife',  ['wildlife'],   'wildlife') },
    { key: 'birds',     label: 'Birds',            imageUrl: getAutoCategoryThumbnail('birds',     ['birds'],      'birds') },
    { key: 'macro',     label: 'Macro',            imageUrl: getAutoCategoryThumbnail('macro',     ['others'],     'macro') },
    { key: 'domestic',  label: 'Domestic Animals', imageUrl: getAutoCategoryThumbnail('domestic',  ['others'],     'domestic') },
    { key: 'landscape', label: 'Landscapes',       imageUrl: getAutoCategoryThumbnail('landscape', ['landscapes'], 'landscape') },
    { key: 'nature',    label: 'Nature',           imageUrl: getAutoCategoryThumbnail('nature',    ['others'],     'nature') },
    { key: 'street',    label: 'Street',           imageUrl: photos.find(p => p.category === 'street' && p.published !== false)?.thumbnailUrl || photos.find(p => p.category === 'street' && p.published !== false)?.imageUrl || '' },
    { key: 'other',     label: 'Portraits',        imageUrl: getAutoCategoryThumbnail('portraits', ['portraits'],  'other') },
  ];

  const searchablePhotos: Photo[] = [
    ...(searchPhotos || photos),
    ...galleryPhotos.map((photo, index) => ({
      id: 1000000 + index,
      title: photo.title,
      category: photo.category as any,
      imageUrl: photo.imageUrl,
      caption: `Photo Gallery · ${photo.category}`,
      type: 'photo' as const,
      tags: [photo.category, 'gallery'],
      likeCount: 0,
      liked: false,
      published: true,
    })),
  ];

// ── Home View ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)' }}>
      {(pullDistance > 0 || isPullRefreshing) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 120,
            height: `${Math.max(64, pullDistance)}px`,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(12,30,22,0.9), rgba(12,30,22,0))',
          }}
        >
          <div style={{ marginBottom: '10px', fontSize: '2rem', animation: 'spin 0.9s linear infinite' }}>🦁</div>
        </div>
      )}
      <Header
        onScrollToGallery={scrollToGallery}
        logoUrl={logoUrl}
        onLogoClick={handleLogoClick}
        onSearchClick={() => setShowSearch(true)}
        visitor={visitor}
        onVisitorLoginClick={() => setShowVisitorLogin(true)}
        onVisitorLogout={handleVisitorLogout}
        onVisitorUpdate={handleVisitorUpdate}
        onStoriesClick={handleStoriesNavClick}
        notificationCount={unreadNotifCount}
        onNotificationClick={() => setShowNotifPanel(p => !p)}
        isAdmin={isAdmin}
        onAdminClick={() => { setView('admin-dashboard'); window.history.pushState({}, '', '/admin'); }}
        onProfileClick={handleProfileClick}
        onCommunityClick={handleCommunityClick}
      />
      <Hero onExplore={scrollToGallery} logoUrl={logoUrl} heroImages={siteSettings.heroImages} onCommunityClick={handleCommunityClick} />
      <CategorySection categories={dynamicCategories} onCategoryClick={handleCategoryClick} loading={photosLoading && photos.length === 0} />
      <Gallery
        photos={photos}
        filterTabs={FILTER_TABS}
        selectedCategory={selectedCategory}
        onCategoryChange={handleGalleryCategoryChange}
        onPhotoClick={openPhoto}
        onLike={handleLike}
        onShare={handleShare}
        onDownload={handleDownload}
        galleryRef={galleryRef}
        isLoggedIn={!!visitor}
        onLoginRequired={() => setShowVisitorLogin(true)}
        onViewAll={() => { setView('photo-grid'); window.history.pushState({}, '', '/photos'); window.scrollTo(0, 0); }}
        isLoading={photosLoading}
      />
      <div ref={homeGalleryLoadRef} aria-hidden="true" style={{ height: 1 }} />
      {galleryPhotos.length > 0 && (
        <Suspense fallback={<InlineFallback />}>
          <PhotoGallery
            photos={galleryPhotos}
            searchQuery={searchQuery}
            hasMore={!galleryIsFull && galleryPhotos.length >= HOME_GALLERY_LIMIT}
            isLoadingMore={galleryLoadingAll}
            onLoadAll={loadFullGallery}
          />
        </Suspense>
      )}
      <StoriesSection stories={stories} isLoading={storiesLoading} onStoryClick={handleStoryClick} onViewAll={() => { setView('story-grid'); window.history.pushState({}, '', '/story-grid'); window.scrollTo(0, 0); }} />
      <Suspense fallback={<InlineFallback />}>
        <VideoSection
          videos={videos}
          isLoading={videosLoading}
          onVideoClick={handleVideoClick}
          visitor={visitor}
          videoComments={videoComments}
          onAddVideoComment={handleAddVideoComment}
          onVideoLike={handleVideoLike}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          isAdmin={isAdmin}
          onDeleteComment={handleDeleteComment}
          onViewAll={() => { setView('video-grid'); window.history.pushState({}, '', '/video-grid'); window.scrollTo(0, 0); }}
        />
      </Suspense>
      <AboutSection onMapClick={() => setShowMap(true)} />
      <OurAppsSection />
      <Footer {...footerNavProps} />

      {/* Live Stats Floating Widget - Admin Only */}
      {isAdmin && (
        <LiveStats
          onlineCount={onlineVisitorCount}
          totalLikes={photos.reduce((s, p) => s + (p.likeCount || 0), 0) + stories.reduce((s, st) => s + (st.likeCount || 0), 0) + videos.reduce((s, v) => s + (v.likeCount || 0), 0)}
          totalComments={totalCommentCount}
          totalViews={stories.reduce((s, st) => s + (st.viewCount || 0), 0) + videos.reduce((s, v) => s + (v.viewCount || 0), 0)}
        />
      )}

      {selectedPhoto && (
        <Suspense fallback={<InlineFallback />}>
          <PhotoModal
            photo={selectedPhoto}
            onClose={closePhoto}
            onLike={() => handleLike(selectedPhoto.id)}
            onShare={() => handleShare(selectedPhoto)}
            onDownload={() => handleDownload(selectedPhoto)}
            onGenerateStory={() => handleGenerateStory(selectedPhoto)}
            isGeneratingStory={false}
            isAdmin={isAdmin}
            visitor={visitor}
            comments={photoComments[selectedPhoto.firestoreId || `preview-${selectedPhoto.slug || selectedPhoto.id}`] || []}
            onAddComment={(content) => handleAddPhotoComment(selectedPhoto.firestoreId || `preview-${selectedPhoto.slug || selectedPhoto.id}`, content)}
            onDeleteComment={handleDeleteComment}
            onVisitorLoginClick={() => setShowVisitorLogin(true)}
            freeDownloadsLeft={Math.max(0, FREE_DOWNLOADS - downloadCount)}
            isDownloading={isDownloading}
            photos={photos.filter(p => p.published !== false)}
            onNavigate={(photo) => openPhoto(photo)}
          />
        </Suspense>
      )}

      <Suspense fallback={<InlineFallback />}>
        {showMap && <PhotoMap
          photos={photos}
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          onPhotoClick={(photo) => { setShowMap(false); openPhoto(photo); }}
        />}

        {deferNonCritical && <AIChatbot photos={photos} onPhotoClick={openPhoto} />}

        {showSearch && <SearchBar
          isOpen={showSearch}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          photos={searchablePhotos}
          onPhotoClick={openPhoto}
        />}

        {showVisitorLogin && <VisitorLogin
          isOpen={showVisitorLogin}
          onClose={() => setShowVisitorLogin(false)}
          onLogin={handleVisitorLogin}
        />}

        {showProfile && <ProfileModal
          isOpen={showProfile}
          visitor={visitor}
          onClose={() => setShowProfile(false)}
          onVisitorUpdate={handleVisitorUpdate}
          onLogout={handleVisitorLogout}
          downloadCount={downloadCount}
        />}

        {deferNonCritical && <SelfAdPopup />}

        {showNotifPanel && <NotificationPanel
          isOpen={showNotifPanel}
          onClose={() => setShowNotifPanel(false)}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onDelete={handleDeleteNotif}
          onClearAll={handleClearAllNotifs}
        />}
      </Suspense>
    </div>
  );
};

export default App;
