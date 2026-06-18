import React, { lazy, Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Photo, Category, FilterTab, Visitor, Story, Comment, Video, GalleryPhoto } from './types';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategorySection } from './components/CategorySection';
import { Gallery } from './components/Gallery';
import { PhotoGallery } from './components/PhotoGallery';
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
const AdSenseHead = lazy(() => import('./components/AdSenseHead'));
const SelfAdPopup = lazy(() => import('./components/SelfAdPopup'));

const logoUrl = '/photos/logo-header.webp';
const ADMIN_EMAIL = 'madan123050@gmail.com';
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



const CATEGORIES: Category[] = [
  { key: 'wildlife', label: 'Wildlife', imageUrl: '/photos/photo-wildlife.jpeg' },
  { key: 'birds', label: 'Birds', imageUrl: '/photos/photo-wildlife.jpeg' },
  { key: 'macro', label: 'Macro', imageUrl: '/photos/photo-nature.jpeg' },
  { key: 'domestic', label: 'Domestic Animals', imageUrl: '/photos/photo-nature.jpeg' },
  { key: 'landscape', label: 'Landscapes', imageUrl: '/photos/photo-landscape.jpeg' },
  { key: 'nature', label: 'Nature', imageUrl: '/photos/photo-nature.jpeg' },
  { key: 'other', label: 'Portraits', imageUrl: '/photos/photo-portrait.jpeg' },
];

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

// ── App ─────────────────────────────────────────────────────────────────────
type AppView = 'home' | 'admin-login' | 'admin-dashboard' | 'story-detail' | 'video-detail' | 'terms' | 'marketplace' | 'community' | 'ngo' | 'about' | 'contact' | 'photos' | 'photo-grid' | 'story-grid' | 'video-grid';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/story/')) return 'story-detail';
      if (path.startsWith('/video/')) return 'video-detail';
      if (path === '/terms') return 'terms';
      if (path === '/marketplace') return 'marketplace';
      if (path === '/community') return 'community';
      if (path === '/ngo') return 'ngo';
      if (path === '/about') return 'about';
      if (path === '/contact') return 'contact';
      if (path === '/photos' || path === '/photo-grid') return 'photo-grid';
      if (path === '/story-grid') return 'story-grid';
      if (path === '/video-grid') return 'video-grid';
      if (path.startsWith('/category/')) return 'photo-grid';
      // Admin session exists but start from home, not admin dashboard
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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [deferNonCritical, setDeferNonCritical] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const galleryRef = useRef<HTMLElement | null>(null);
  const viewedTargetsRef = useRef<Set<string>>(new Set());
  const savedScrollRef = useRef<number>(0);

  // New state
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [showSearch, setShowSearch] = useState(false);
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
    const timer = window.setTimeout(() => setDeferNonCritical(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    trackSiteEvent({
      type: 'page_view',
      page: window.location.pathname || '/',
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    });
  }, [trackSiteEvent, view, selectedCategory, selectedPhoto?.firestoreId, selectedStory?.firestoreId, selectedVideo?.firestoreId]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    Promise.all([import('firebase/auth'), import('./firebase')]).then(([authModule, firebaseModule]) => {
      if (disposed) return;
      unsubscribe = authModule.onAuthStateChanged(firebaseModule.auth, async (firebaseUser) => {
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

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

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
        galleryService,
        videoService,
        commentService,
        visitorService,
        siteSettingsService,
      ] = await Promise.all([
        import('./services/photoService'),
        import('./services/storyService'),
        import('./services/galleryService'),
        import('./services/videoService'),
        import('./services/commentService'),
        import('./services/visitorService'),
        import('./services/siteSettingsService'),
      ]);
      if (disposed) return;

    // ── Real-time PHOTOS subscription ──────────────────────────────────
    const unsubPhotos = photoService.subscribeToPhotos((firestorePhotos) => {
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
        // Keep sample photos (those without firestoreId)
        const samples = prev.filter(p => !p.firestoreId);
        // Build map of existing Firestore photos to preserve local state (liked, id)
        const existingMap = new Map(prev.filter(p => p.firestoreId).map(p => [p.firestoreId, p]));
        const updatedFirestore = mapped.map(m => {
          const existing = existingMap.get(m.firestoreId);
          if (existing) {
            return { ...m, liked: existing.liked, id: existing.id, viewCount: Math.max(m.viewCount || 0, existing.viewCount || 0) };
          }
          return m;
        });
        const allPhotos = [...updatedFirestore, ...samples];

        // Deep link: auto-open photo if pending (only on first snapshot)
        if (isFirstPhotoSnap && pendingPhotoSlug) {
          const matchedPhoto = allPhotos.find(p => matchesPhotoRoute(p, pendingPhotoSlug));
          if (matchedPhoto) {
            setTimeout(() => {
              setSelectedPhoto({ ...matchedPhoto, viewCount: (matchedPhoto.viewCount || 0) + 1 });
              setPhotos(current => current.map(p => p.id === matchedPhoto.id ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p));
              setPendingPhotoSlug(null);
            }, 100);
          }
        }
        isFirstPhotoSnap = false;
        return allPhotos;
      });
    }, (err) => {
      console.warn('Photo subscription error:', err);
      setPhotosLoading(false);
    });

    // ── Real-time STORIES subscription ─────────────────────────────────
    const unsubStories = storyService.subscribeToStories((firestoreStories) => {
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
        const samples = prev.filter(s => !s.firestoreId);
        const existingMap = new Map(prev.filter(s => s.firestoreId).map(s => [s.firestoreId, s]));
        const updatedFirestore = mapped.map(m => {
          const existing = existingMap.get(m.firestoreId);
          if (existing) {
            return { ...m, liked: existing.liked, id: existing.id, viewCount: Math.max(m.viewCount || 0, existing.viewCount || 0) };
          }
          return m;
        });
        const existingTitles = new Set(samples.map(s => safeLower(s.title)).filter(Boolean));
        const nonDuplicate = updatedFirestore.filter(s => {
          const normalizedTitle = safeLower(s.title);
          return !normalizedTitle || !existingTitles.has(normalizedTitle);
        });
        const allStories = [...nonDuplicate, ...samples];

        // Deep link: auto-open story if pending (only on first snapshot)
        if (isFirstStorySnap && pendingStorySlug) {
          const matchedStory = allStories.find(s => matchesStoryRoute(s, pendingStorySlug));
          if (matchedStory) {
            setTimeout(() => {
              setSelectedStory({ ...matchedStory, viewCount: matchedStory.viewCount + 1 });
              setView('story-detail');
              setPendingStorySlug(null);
            }, 100);
          }
        }
        isFirstStorySnap = false;
        return allStories;
      });
    }, (err) => {
      console.warn('Story subscription error:', err);
      setStoriesLoading(false);
    });

    // ── Real-time GALLERY subscription ─────────────────────────────────
    const unsubGallery = galleryService.subscribeToGalleryPhotos((photos) => {
      setGalleryPhotos(photos);
    }, (err) => {
      console.warn('Gallery subscription error:', err);
    });

    // ── Real-time VIDEOS subscription ──────────────────────────────────
    const unsubVideos = videoService.subscribeToVideos((firestoreVideos) => {
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
          }
        }
        isFirstVideoSnap = false;
        return allVideos;
      });
    }, (err) => {
      console.warn('Video subscription error:', err);
      setVideosLoading(false);
    });

    // ── Real-time COMMENTS subscription (already live!) ────────────────
    const unsubComments = commentService.subscribeToAllComments((allComments) => {
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

    // ── Online Visitor Tracking (real-time presence) ───────────────────
    let sessionId = sessionStorage.getItem('wa_session_id');
    if (!sessionId) {
      sessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('wa_session_id', sessionId);
    }
    const displayName = visitorRef.current?.displayName || 'Guest';
    const avatarUrl = visitorRef.current?.avatarUrl || '';
    const cleanupOnline = visitorService.trackOnlineVisitor(sessionId, displayName, avatarUrl);
    onlineCleanupRef.current = cleanupOnline;

    // Subscribe to live online visitor count
    const unsubOnline = visitorService.subscribeToOnlineVisitors((count) => {
      setOnlineVisitorCount(count);
    });

    // Subscribe to site settings (hero images etc.)
    const unsubSettings = siteSettingsService.onSiteSettingsChange((settings) => {
      setSiteSettings(settings);
    });

      cleanups.push(
        unsubPhotos,
        unsubStories,
        unsubGallery,
        unsubVideos,
        unsubComments,
        unsubOnline,
        unsubSettings,
        cleanupOnline,
      );
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
  }, []);


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
      if (path === '/' || path === '') {
        setSelectedPhoto(null);
        setSelectedStory(null);
        setSelectedVideo(null);
        setView('home');
      } else if (path.startsWith('/photo/')) {
        const photoSlug = decodeURIComponent(path.replace('/photo/', ''));
        const matchedPhoto = photos.find(p => matchesPhotoRoute(p, photoSlug));
        if (matchedPhoto) {
          setSelectedPhoto({ ...matchedPhoto, viewCount: (matchedPhoto.viewCount || 0) + 1 });
          setPhotos(prev => prev.map(p => p.id === matchedPhoto.id ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p));
        }
      } else if (path === '/terms') {
        setView('terms');
      } else if (path.startsWith('/video/')) {
        const videoId = decodeURIComponent(path.replace('/video/', ''));
        const matchedVideo = videos.find((video) => matchesVideoRoute(video, videoId));
        if (matchedVideo) {
          setSelectedVideo({ ...matchedVideo, viewCount: (matchedVideo.viewCount || 0) + 1 });
          setVideos(prev => prev.map(v => v.id === matchedVideo.id ? { ...v, viewCount: (v.viewCount || 0) + 1 } : v));
          setView('video-detail');
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
    setTimeout(() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [trackSiteEvent]);

  const handleGalleryCategoryChange = useCallback((key: string) => {
    setSelectedCategory(key);
    if (key !== 'all') {
      trackSiteEvent({ type: 'category_view', page: `/category/${key}`, category: key });
    }
  }, [trackSiteEvent]);

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
    Promise.all([import('firebase/auth'), import('./firebase')])
      .then(([authModule, firebaseModule]) => authModule.signOut(firebaseModule.auth))
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
      setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p));
      recordView('photo', photo.firestoreId);
      const photoId = photo.slug || photo.firestoreId || String(photo.id);
      window.history.pushState({}, '', '/photo/' + encodeURIComponent(photoId));
      trackSiteEvent({
        type: 'photo_view',
        page: '/photo/' + encodeURIComponent(photoId),
        category: photo.category,
        targetId: photo.firestoreId || String(photo.id),
        targetTitle: photo.title,
      });
    } else {
      window.history.pushState({}, '', '/');
    }
    setSelectedPhoto(updatedPhoto);
  }, [recordView, trackSiteEvent]);

  // ── Helper: Close Photo Modal ────────────────────────────────────────────
  const closePhoto = useCallback(() => {
    setSelectedPhoto(null);
    window.history.pushState({}, '', '/');
    requestAnimationFrame(() => { window.scrollTo(0, savedScrollRef.current); });
  }, []);

  // ── Helper: Go back from story to home ───────────────────────────────────
  const handleStoryBack = useCallback(() => {
    setView('home');
    setSelectedStory(null);
    window.history.pushState({}, '', '/');
    requestAnimationFrame(() => { window.scrollTo(0, savedScrollRef.current); });
  }, []);

  const handleVideoBack = useCallback(() => {
    setView('home');
    setSelectedVideo(null);
    window.history.pushState({}, '', '/');
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
              comments={photoComments[selectedPhoto.firestoreId || ''] || []}
              onAddComment={(content) => handleAddPhotoComment(selectedPhoto.firestoreId || '', content)}
              onDeleteComment={handleDeleteComment}
              onVisitorLoginClick={() => setShowVisitorLogin(true)}
              freeDownloadsLeft={Math.max(0, FREE_DOWNLOADS - downloadCount)}
              isDownloading={isDownloading}
              photos={photos.filter(p => p.published !== false)}
              onNavigate={(photo) => openPhoto(photo)}
            />
          )}
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
            onBack={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }}
            onStoryClick={handleStoryClick}
          />
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
        <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />
        <Suspense fallback={<InlineFallback />}>
          {deferNonCritical && <AIChatbot photos={photos} onPhotoClick={openPhoto} />}
          {showSearch && <SearchBar
            isOpen={showSearch}
            onClose={() => { setShowSearch(false); setSearchQuery(''); }}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            photos={photos}
            onPhotoClick={openPhoto}
          />}
          {showVisitorLogin && <VisitorLogin
            isOpen={showVisitorLogin}
            onClose={() => setShowVisitorLogin(false)}
            onLogin={handleVisitorLogin}
          />}
        </Suspense>
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
        <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />
        <Suspense fallback={<InlineFallback />}>
          {deferNonCritical && <AIChatbot photos={photos} onPhotoClick={openPhoto} />}
          {showSearch && <SearchBar
            isOpen={showSearch}
            onClose={() => { setShowSearch(false); setSearchQuery(''); }}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            photos={photos}
            onPhotoClick={(p) => { openPhoto(p); setView('home'); }}
          />}
          {showVisitorLogin && <VisitorLogin
            isOpen={showVisitorLogin}
            onClose={() => setShowVisitorLogin(false)}
            onLogin={handleVisitorLogin}
          />}
        </Suspense>
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
        <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />
      </div>
    );
  }

  const StaticPage = ({ title, text, cta }: { title: string; text: string; cta?: string }) => (
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
      <div className="wa-container" style={{ paddingTop: '1.5rem', paddingBottom: '5rem', maxWidth: 900 }}>
        <button
          onClick={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }}
          style={{
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.35)',
            color: 'var(--wa-gold)',
            borderRadius: 8,
            padding: '0.55rem 0.85rem',
            marginBottom: '1rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ← Back to Home
        </button>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--wa-text)', marginBottom: '1rem' }}>{title}</h1>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--wa-muted)' }}>{text}</p>
        {cta && <p style={{ marginTop: '1.5rem', fontWeight: 700, color: 'var(--wa-accent)' }}>{cta}</p>}
      </div>
      </div>
      <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />
    </div>
  );
  if (view === 'marketplace') return <StaticPage title="Buy & Sell Authentic Nepal Photography" text="Support local photographers by purchasing high-quality images. Use them for personal or commercial projects. Option A: Buy Now via Google Form/DM and payment by eSewa or bank. Option B: Stripe or Gumroad links." cta="20% of every purchase supports animal rescue in Nepal." />;
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
          onProfileClick={handleProfileClick}
        />
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
    </Suspense>
  );
  if (view === 'ngo') return <StaticPage title="Save Animal Nepal" text="We are building a system to support injured and abandoned animals across Nepal. Through photography and community support, we aim to create real impact. Mission: rescue, treatment, and feeding. Future plan: transparent monthly reporting and verified rescue partners." />;
  if (view === 'about') return <StaticPage title="About WildSaura" text="WildSaura connects photographers, nature lovers, and a mission to protect animals in Nepal. Start small, grow fast, and use visual storytelling for impact." />;
  if (view === 'contact') return <StaticPage title="Contact" text="For partnerships, volunteering, and media inquiries, message us through the contact form on the homepage." />;

  // ── Smart Category Thumbnails ────────────────────────────────────────────
  // Priority:
  //   1. Admin manual override via Site Settings (dashboard upload)
  //   2. Best photo from Firestore for that exact category (sorted by most liked = most engaging)
  //      Uses thumbnailUrl if available for fast loading
  //   3. Gallery photos as fallback (rotates daily)
  //   4. Static default image
  const todayDayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

  const getAutoCategoryThumbnail = (
    settingsKey: keyof NonNullable<SiteSettings['categoryImages']>,
    galleryCategories: string[],
    photoCategory: string,
    fallback: string
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
             p.imageUrl &&
             !p.imageUrl.startsWith('/photos/')
      )
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    if (fromPhotos.length > 0) {
      const best = fromPhotos[0];
      // Use thumbnailUrl if available for faster loading
      return best.thumbnailUrl || best.imageUrl;
    }

    // 3. Fallback to gallery photos (rotates daily)
    const fromGallery = galleryPhotos.filter(p => galleryCategories.includes(p.category) && p.imageUrl);
    if (fromGallery.length > 0) {
      return fromGallery[todayDayIndex % fromGallery.length].imageUrl;
    }

    // 4. Static default fallback
    return fallback;
  };

  const dynamicCategories: Category[] = [
    { key: 'wildlife',  label: 'Wildlife',        imageUrl: getAutoCategoryThumbnail('wildlife',  ['wildlife'],   'wildlife',  '/photos/photo-wildlife.jpeg') },
    { key: 'birds',     label: 'Birds',            imageUrl: getAutoCategoryThumbnail('birds',     ['birds'],      'birds',     '/photos/photo-wildlife.jpeg') },
    { key: 'macro',     label: 'Macro',            imageUrl: getAutoCategoryThumbnail('macro',     ['others'],     'macro',     '/photos/photo-nature.jpeg') },
    { key: 'domestic',  label: 'Domestic Animals', imageUrl: getAutoCategoryThumbnail('domestic',  ['others'],     'domestic',  '/photos/photo-nature.jpeg') },
    { key: 'landscape', label: 'Landscapes',       imageUrl: getAutoCategoryThumbnail('landscape', ['landscapes'], 'landscape', '/photos/photo-landscape.jpeg') },
    { key: 'nature',    label: 'Nature',           imageUrl: getAutoCategoryThumbnail('nature',    ['others'],     'nature',    '/photos/photo-nature.jpeg') },
    { key: 'other',     label: 'Portraits',        imageUrl: getAutoCategoryThumbnail('portraits', ['portraits'],  'other',     '/photos/photo-portrait.jpeg') },
  ];

  const searchablePhotos: Photo[] = [
    ...photos,
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
      {deferNonCritical && <Suspense fallback={<InlineFallback />}>
        <AdSenseHead />
      </Suspense>}
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
      <CategorySection categories={dynamicCategories} onCategoryClick={handleCategoryClick} loading={photosLoading} />
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
        onViewAll={() => { setView('photo-grid'); window.scrollTo(0, 0); }}
      />
      <PhotoGallery photos={galleryPhotos} searchQuery={searchQuery} />
      <StoriesSection stories={stories} isLoading={storiesLoading} onStoryClick={handleStoryClick} onViewAll={() => { setView('story-grid'); window.scrollTo(0, 0); }} />
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
          onViewAll={() => { setView('video-grid'); window.scrollTo(0, 0); }}
        />
      </Suspense>
      <AboutSection onMapClick={() => setShowMap(true)} />
      <OurAppsSection />
      <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />

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
            comments={photoComments[selectedPhoto.firestoreId || ''] || []}
            onAddComment={(content) => handleAddPhotoComment(selectedPhoto.firestoreId || '', content)}
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
