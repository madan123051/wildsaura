import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Photo, Category, FilterTab, Visitor, Story, Comment, Video, GalleryPhoto } from './types';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategorySection } from './components/CategorySection';
import { Gallery } from './components/Gallery';
import { PhotoGallery } from './components/PhotoGallery';
import { PhotoModal } from './components/PhotoModal';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/AdminDashboard';
import { SearchBar } from './components/SearchBar';
import { AIChatbot } from './components/AIChatbot';
import { VisitorLogin } from './components/VisitorLogin';
import { StoriesSection } from './components/StoriesSection';
import { VideoSection } from './components/VideoSection';
import { TermsConditions } from './components/TermsConditions';
import { OurAppsSection } from './components/OurAppsSection';
import { StoryDetail } from './components/StoryDetail';
import { downloadPhoto } from './utils/downloadPhoto';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { addUserLike, removeUserLike, getUserLikes } from './services/userLikesService';
import { getPhotosFromFirestore, deletePhotoFromFirestore, updatePhotoInFirestore, subscribeToPhotos } from './services/photoService';
import { subscribeToGalleryPhotos } from './services/galleryService';
import { getStoriesFromFirestore, addStoryToFirestore, deleteStoryFromFirestore, updateStoryInFirestore, uploadStoryCoverToStorage, subscribeToStories } from './services/storyService';
import { getVideosFromFirestore, addVideoToFirestore, deleteVideoFromFirestore, updateVideoInFirestore, uploadVideoThumbnailToStorage, uploadVideoToStorage, subscribeToVideos } from './services/videoService';
import { addCommentToFirestore, deleteCommentFromFirestore, getCommentsForTarget, getAllComments, subscribeToAllComments } from './services/commentService';
import { saveVisitorToFirestore, getVisitorFromFirestore, updateVisitorDownloadCount, updateVisitorProfile, trackOnlineVisitor, subscribeToOnlineVisitors } from './services/visitorService';
import { LiveStats } from './components/LiveStats';
import { PhotoMap } from './components/PhotoMap';
import { onSiteSettingsChange, SiteSettings } from './services/siteSettingsService';
import { NotificationPanel, AppNotification } from './components/NotificationPanel';
import { updatePhotoMeta, updateStoryMeta, resetMeta } from './utils/seo';

const logoUrl = '/photos/logo.png';
const ADMIN_EMAIL = 'madan123050@gmail.com';


const safeLower = (value: unknown) => (typeof value === 'string' ? value.toLowerCase().trim() : '');

// ── Sample Photo Data ───────────────────────────────────────────────────────
const SAMPLE_PHOTOS: Photo[] = [
  {
    id: 1, title: 'Japanese Macaque', category: 'wildlife',
    imageUrl: '/photos/photo-wildlife.jpeg',
    location: 'Japan', caption: 'A curious Japanese macaque bathing in a hot spring, captured in intimate detail.',
    type: 'photo',
    tags: ['macaque', 'monkey', 'hot spring', 'japan', 'wildlife', 'primate'],
    animalName: 'Japanese Macaque',
    likeCount: 142, liked: false, published: true,
  },
  {
    id: 2, title: 'Coastal Majesty', category: 'landscape',
    imageUrl: '/photos/photo-landscape.jpeg',
    location: 'Pacific Coast', caption: 'Dramatic rocky coastline meeting the vast ocean with mountain silhouettes in the distance.',
    type: 'photo',
    tags: ['coast', 'ocean', 'rocks', 'landscape', 'pacific', 'seascape'],
    likeCount: 98, liked: false, published: true,
  },
  {
    id: 3, title: 'Beach Portrait', category: 'other',
    imageUrl: '/photos/photo-portrait.jpeg',
    location: 'Seaside', caption: 'A serene portrait on the sandy shores, capturing natural beauty and calm.',
    type: 'photo',
    tags: ['portrait', 'beach', 'golden hour', 'seaside'],
    likeCount: 89, liked: false, published: true,
  },
  {
    id: 4, title: 'City Lights at Dusk', category: 'street',
    imageUrl: '/photos/photo-street.jpeg',
    location: 'Tokyo, Japan', caption: 'A moody cityscape framed by silhouetted trees under a dramatic twilight sky.',
    type: 'photo',
    tags: ['tokyo', 'city', 'dusk', 'urban', 'night', 'skyline'],
    likeCount: 76, liked: false, published: true,
  },
];

// ── Sample Stories ───────────────────────────────────────────────────────────
const SAMPLE_STORIES: Story[] = [
  {
    id: 1,
    title: 'Three Days with the Snow Monkeys of Nagano',
    slug: 'three-days-snow-monkeys-nagano',
    excerpt: 'A winter expedition into the mountains of Nagano, Japan, where Japanese macaques bathe in natural hot springs amidst falling snow.',
    content: `The alarm went off at 4:30 AM. Outside the ryokan window, snow fell silently onto the cedar trees lining the valley. Today was the day I had been planning for months — my first encounter with the famous snow monkeys of Jigokudani.

The trail to the monkey park winds through a dense forest blanketed in fresh powder. Every step crunched beneath my boots, and the only other sound was the distant rush of the Yokoyu River. I carried my Canon EOS R5 with the RF 100-500mm mounted and ready, my fingers already numb despite the heated gloves.

When I arrived at the hot spring, the scene was almost surreal. Steam rose from the mineral-rich water, creating an ethereal mist that caught the first light of dawn. And there they were — a troop of about thirty macaques, some soaking contentedly, others grooming each other on the rocks.

I spent three full days observing their behavior. The hierarchy within the troop became apparent: the dominant males claimed the warmest spots, while younger monkeys played at the edges, splashing and chasing each other with abandon. One juvenile became particularly curious about my camera, approaching within a meter before its mother called it back with a sharp bark.

The key to wildlife photography is patience. On the second morning, I waited four hours in -12°C temperatures for a particular shot — a mother cradling her infant, both submerged to their shoulders, snowflakes landing on their fur. When the moment came, I had exactly three seconds before she turned away. That image became the centerpiece of this portfolio.`,
    coverImageUrl: '/photos/photo-wildlife.jpeg',
    tags: ['Wildlife', 'Japan', 'Winter'],
    createdAt: '2026-02-15',
    viewCount: 1240,
    likeCount: 89,
    liked: false,
  },
  {
    id: 2,
    title: 'Chasing Light on the Pacific Coast',
    slug: 'chasing-light-pacific-coast',
    excerpt: 'A solo road trip along the rugged Pacific coastline, capturing the interplay of ocean, rock, and golden hour light.',
    content: `There is something about the Pacific Coast that draws photographers back again and again. Perhaps it is the way the light changes every fifteen minutes, painting the ancient sea stacks in hues that no filter can replicate. Perhaps it is the raw, untamed energy of waves meeting stone.

I set out on a ten-day road trip with nothing but my camera gear, a sleeping bag, and a rough map of locations I had been studying on satellite imagery for months. The goal was simple: capture the coast in ways that felt both timeless and intimate.

My first stop was a secluded beach accessible only by a steep, muddy trail. I arrived an hour before sunset and immediately understood why the hike was worth it. The beach was framed by towering basalt columns, and the retreating tide had left mirror-like pools that reflected the sky in perfect symmetry.

I shot with the RF 15-35mm at f/8 to keep everything tack-sharp from foreground to infinity. The challenge with coastal photography is timing — you need to anticipate the waves, position your tripod between surges, and protect your gear from salt spray. I lost a lens cloth to a rogue wave on day three, but the images were worth every soggy moment.

The most memorable morning came on day seven, when thick fog rolled in at dawn and I nearly packed up. But as the sun burned through, it created god rays streaming between the sea stacks — a phenomenon I had seen in paintings but never witnessed in person. I fired off two hundred frames in ten minutes. Three of those shots are now hanging in galleries.`,
    coverImageUrl: '/photos/photo-landscape.jpeg',
    tags: ['Landscape', 'Travel', 'Ocean'],
    createdAt: '2026-01-28',
    viewCount: 980,
    likeCount: 67,
    liked: false,
  },
  {
    id: 3,
    title: 'Neon Nights: Street Photography in Tokyo',
    slug: 'neon-nights-street-photography-tokyo',
    excerpt: 'Wandering through Tokyo\'s electric streets after dark, finding stories in the glow of neon signs and the rhythm of urban life.',
    content: `Tokyo at night is a photographer's fever dream. Every corner offers a new composition — the glow of a ramen shop spilling warm light onto rain-slicked pavement, the silhouette of a salaryman framed by a thousand LED screens, the quiet beauty of a shrine tucked between skyscrapers.

I spent two weeks exploring every neighborhood, from the sensory overload of Shibuya to the old-world charm of Yanaka. My approach was simple: no flash, no tripod, just the RF 35mm f/1.4L wide open and a willingness to walk until my feet ached.

Street photography in Japan requires a certain sensitivity. The culture values privacy, and I was careful to capture the energy of the streets without intruding on individuals. The best shots came from moments of serendipity — a group of friends laughing under an umbrella, a cat perched on a vending machine, the geometric patterns of light and shadow in a subway station.

One evening in Shinjuku, I found myself in a narrow alley I had never seen on any map. Paper lanterns hung overhead, their warm glow competing with the blue neon of a jazz bar. A musician was playing saxophone in the doorway, and a couple had stopped to listen, their reflections shimmering in a puddle at their feet. I raised my camera and captured the scene in a single frame — no cropping needed.

The technical challenge of night street photography is real. At ISO 3200 and 1/60th of a second, every shot is a negotiation between sharpness and grain. But the imperfections are part of the story. The slight motion blur, the high-contrast shadows — they give the images a feeling of being alive, of existing in a specific moment that will never repeat.`,
    coverImageUrl: '/photos/photo-street.jpeg',
    tags: ['Street', 'Tokyo', 'Night'],
    createdAt: '2026-03-01',
    viewCount: 1560,
    likeCount: 112,
    liked: false,
  },
];

const CATEGORIES: Category[] = [
  { key: 'wildlife', label: 'Wildlife', imageUrl: '/photos/photo-wildlife.jpeg' },
  { key: 'birds', label: 'Birds', imageUrl: '/photos/photo-wildlife.jpeg' },
  { key: 'landscape', label: 'Landscapes', imageUrl: '/photos/photo-landscape.jpeg' },
  { key: 'nature', label: 'Nature', imageUrl: '/photos/photo-nature.jpeg' },
  { key: 'other', label: 'Portraits', imageUrl: '/photos/photo-portrait.jpeg' },
];

const FILTER_TABS: FilterTab[] = [
  { key: 'all', label: 'All' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'birds', label: 'Birds' },
  { key: 'landscape', label: 'Landscapes' },
  { key: 'nature', label: 'Nature' },
  { key: 'street', label: 'Street' },
  { key: 'other', label: 'Portraits' },
];

// ── App ─────────────────────────────────────────────────────────────────────
type AppView = 'home' | 'admin-login' | 'admin-dashboard' | 'story-detail' | 'terms' | 'marketplace' | 'community' | 'ngo' | 'about' | 'contact' | 'photos';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/story/')) return 'story-detail';
      if (path === '/terms') return 'terms';
      if (path === '/marketplace') return 'marketplace';
      if (path === '/community') return 'community';
      if (path === '/ngo') return 'ngo';
      if (path === '/about') return 'about';
      if (path === '/contact') return 'contact';
      if (path === '/photos') return 'photos';
      // Admin session exists but start from home, not admin dashboard
    }
    return 'home';
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('wa_admin_session') === 'true';
    return false;
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(SAMPLE_PHOTOS);
  const [stories, setStories] = useState<Story[]>(SAMPLE_STORIES);
  const [videos, setVideos] = useState<Video[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const galleryRef = useRef<HTMLElement | null>(null);

  // New state
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showVisitorLogin, setShowVisitorLogin] = useState(false);
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
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const isPullingRef = useRef(false);
  const FREE_DOWNLOADS = 2;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
    return () => unsubscribe();
  }, []);

  // ── Deep Link State ──────────────────────────────────────────────────────
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(() => {
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

  // ── Real-time Data Subscriptions (LIVE updates across all browsers) ────────
  useEffect(() => {
    let isFirstPhotoSnap = true;
    let isFirstStorySnap = true;

    // ── Real-time PHOTOS subscription ──────────────────────────────────
    const unsubPhotos = subscribeToPhotos((firestorePhotos) => {
      const mapped = firestorePhotos.map((fp, idx) => ({
        id: Date.now() + idx,
        firestoreId: fp.id,
        title: fp.title,
        category: fp.category as any,
        imageUrl: fp.imageUrl,
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
            return { ...m, liked: existing.liked, id: existing.id };
          }
          return m;
        });
        const allPhotos = [...updatedFirestore, ...samples];

        // Deep link: auto-open photo if pending (only on first snapshot)
        if (isFirstPhotoSnap && pendingPhotoId) {
          const matchedPhoto = allPhotos.find(p => p.firestoreId === pendingPhotoId || String(p.id) === pendingPhotoId);
          if (matchedPhoto) {
            setTimeout(() => { setSelectedPhoto(matchedPhoto); setPendingPhotoId(null); }, 100);
          }
        }
        isFirstPhotoSnap = false;
        return allPhotos;
      });
    }, (err) => {
      console.warn('Photo subscription error, falling back to samples:', err);
      if (pendingPhotoId) {
        const matchedPhoto = SAMPLE_PHOTOS.find(p => String(p.id) === pendingPhotoId || p.firestoreId === pendingPhotoId);
        if (matchedPhoto) {
          setTimeout(() => { setSelectedPhoto(matchedPhoto); setPendingPhotoId(null); }, 100);
        }
      }
    });

    // ── Real-time STORIES subscription ─────────────────────────────────
    const unsubStories = subscribeToStories((firestoreStories) => {
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
      }));

      setStories(prev => {
        const samples = prev.filter(s => !s.firestoreId);
        const existingMap = new Map(prev.filter(s => s.firestoreId).map(s => [s.firestoreId, s]));
        const updatedFirestore = mapped.map(m => {
          const existing = existingMap.get(m.firestoreId);
          if (existing) {
            return { ...m, liked: existing.liked, id: existing.id };
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
          const matchedStory = allStories.find(s => s.slug === pendingStorySlug);
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
      if (pendingStorySlug) {
        const matchedStory = SAMPLE_STORIES.find(s => s.slug === pendingStorySlug);
        if (matchedStory) {
          setTimeout(() => {
            setSelectedStory({ ...matchedStory, viewCount: matchedStory.viewCount + 1 });
            setView('story-detail');
            setPendingStorySlug(null);
          }, 100);
        }
      }
    });

    // ── Real-time GALLERY subscription ─────────────────────────────────
    const unsubGallery = subscribeToGalleryPhotos((photos) => {
      setGalleryPhotos(photos);
    }, (err) => {
      console.warn('Gallery subscription error:', err);
    });

    // ── Real-time VIDEOS subscription ──────────────────────────────────
    const unsubVideos = subscribeToVideos((firestoreVideos) => {
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
        aspectRatio: fv.aspectRatio || undefined,
        videoWidth: fv.videoWidth || undefined,
        videoHeight: fv.videoHeight || undefined,
        originalSize: fv.originalSize || undefined,
      }));

      setVideos(prev => {
        const existingMap = new Map(prev.filter(v => v.firestoreId).map(v => [v.firestoreId, v]));
        return mapped.map(m => {
          const existing = existingMap.get(m.firestoreId);
          if (existing) {
            return { ...m, liked: existing.liked, id: existing.id };
          }
          return m;
        });
      });
    }, (err) => {
      console.warn('Video subscription error:', err);
    });

    // ── Real-time COMMENTS subscription (already live!) ────────────────
    const unsubComments = subscribeToAllComments((allComments) => {
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
    const cleanupOnline = trackOnlineVisitor(sessionId, displayName, avatarUrl);
    onlineCleanupRef.current = cleanupOnline;

    // Subscribe to live online visitor count
    const unsubOnline = subscribeToOnlineVisitors((count) => {
      setOnlineVisitorCount(count);
    });

    // Subscribe to site settings (hero images etc.)
    const unsubSettings = onSiteSettingsChange((settings) => {
      setSiteSettings(settings);
    });

    return () => {
      unsubPhotos();
      unsubStories();
      unsubGallery();
      unsubVideos();
      unsubComments();
      unsubOnline();
      unsubSettings();
      if (onlineCleanupRef.current) onlineCleanupRef.current();
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

  // ── Popstate Listener (Browser Back/Forward) ─────────────────────────────
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setSelectedPhoto(null);
        setSelectedStory(null);
        setView('home');
      } else if (path.startsWith('/photo/')) {
        const photoId = decodeURIComponent(path.replace('/photo/', ''));
        const matchedPhoto = photos.find(p => p.firestoreId === photoId || String(p.id) === photoId);
        if (matchedPhoto) {
          setSelectedPhoto(matchedPhoto);
        }
      } else if (path === '/terms') {
        setView('terms');
      } else if (path.startsWith('/story/')) {
        const slug = decodeURIComponent(path.replace('/story/', ''));
        const matchedStory = stories.find(s => s.slug === slug);
        if (matchedStory) {
          setSelectedStory({ ...matchedStory, viewCount: matchedStory.viewCount + 1 });
          setView('story-detail');
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [photos, stories]);

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
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleCategoryClick = useCallback((key: string) => {
    setSelectedCategory(key);
    setTimeout(() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const handleLike = useCallback((id: number) => {
    setPhotos((prev) => {
      const photo = prev.find(p => p.id === id);
      if (!photo) return prev;
      const newLiked = !photo.liked;
      const newLikeCount = newLiked ? photo.likeCount + 1 : photo.likeCount - 1;
      if (photo.firestoreId) {
        updatePhotoInFirestore(photo.firestoreId, { likeCount: newLikeCount }).catch(err => console.warn('Like update failed:', err));
      }
      // Save per-user like to Firestore (keyed by firestoreId)
      const likeKey = photo?.firestoreId || String(id);
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
  }, [selectedPhoto, visitor]);

  const handleShare = useCallback(async (photo: Photo) => {
    const photoId = photo.firestoreId || String(photo.id);
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
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
      }
    }
    
    // Fallback: copy to clipboard with feedback
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
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
  }, []);

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
        ...(video.aspectRatio ? { aspectRatio: video.aspectRatio } : {}),
        ...(video.videoWidth ? { videoWidth: video.videoWidth } : {}),
        ...(video.videoHeight ? { videoHeight: video.videoHeight } : {}),
        ...(video.originalSize ? { originalSize: video.originalSize } : {}),
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
        ...(finalUpdated.aspectRatio ? { aspectRatio: finalUpdated.aspectRatio } : {}),
        ...(finalUpdated.videoWidth ? { videoWidth: finalUpdated.videoWidth } : {}),
        ...(finalUpdated.videoHeight ? { videoHeight: finalUpdated.videoHeight } : {}),
      }).catch(err => console.warn('Firestore video update failed:', err));
    }
    setVideos((prev) => prev.map((v) => v.id === finalUpdated.id ? finalUpdated : v));
  }, []);

  const handleStoryClick = useCallback((story: Story) => {
    setSelectedStory({ ...story, viewCount: story.viewCount + 1 });
    setStories((prev) => prev.map((s) => s.id === story.id ? { ...s, viewCount: s.viewCount + 1 } : s));
    setView('story-detail');
    window.history.pushState({}, '', '/story/' + encodeURIComponent(story.slug));
    updateStoryMeta({
      title: story.title,
      excerpt: story.excerpt,
      content: story.content,
      coverImageUrl: story.coverImageUrl,
      tags: story.tags,
      photographer: story.photographer,
      slug: story.slug,
      createdAt: story.createdAt,
    });
    window.scrollTo(0, 0);
  }, []);

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
      updateStoryInFirestore(selectedStory.firestoreId, { likeCount: updated.likeCount }).catch(err => console.warn('Story like update failed:', err));
    }
    // Save per-user like to Firestore
    const sLikeKey = selectedStory.firestoreId || String(selectedStory.id);
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
  }, [selectedStory, visitor]);

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
        message: `Welcome to WildSaura! 🌿\nExplore our wildlife gallery, share your love for nature, and discover the wild beauty of India.\n\nEnjoy ${FREE_DOWNLOADS} free high-quality downloads! 📸`,
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
    signOut(auth).catch(console.warn);
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
  }, [visitor, getGuestIdentity]);

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
  }, [visitor, getGuestIdentity]);

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
  }, [visitor, getGuestIdentity]);

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
        updateVideoInFirestore(video.firestoreId, { likeCount: newLikeCount }).catch(err => console.warn('Video like update failed:', err));
      }
      // Save per-user like to Firestore
      const vLikeKey = video?.firestoreId || String(id);
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
  }, [visitor]);

  const handleDownload = useCallback(async (photo: Photo) => {
    if (!visitor) { setShowVisitorLogin(true); return; }
    setIsDownloading(true);
    try {
      const applyWatermark = downloadCount >= FREE_DOWNLOADS;
      await downloadPhoto(photo.imageUrl, photo.title, applyWatermark);
      const newCount = downloadCount + 1;
      setDownloadCount(newCount);
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
  }, [visitor, downloadCount]);

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
    if (view !== 'home') setView('home');
    setTimeout(() => {
      document.getElementById('stories')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [view]);

  // ── Helper: Open/Close Photo with URL ────────────────────────────────────
  const openPhoto = useCallback((photo: Photo | null) => {
    setSelectedPhoto(photo);
    if (photo) {
      const photoId = photo.firestoreId || String(photo.id);
      window.history.pushState({}, '', '/photo/' + encodeURIComponent(photoId));
      updatePhotoMeta({
        title: photo.title,
        caption: photo.caption,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        category: photo.category,
        photographer: photo.photographer,
        location: photo.location,
        tags: photo.tags,
        animalName: photo.animalName,
        firestoreId: photo.firestoreId,
        id: photo.id,
      });
    } else {
      window.history.pushState({}, '', '/');
      resetMeta();
    }
  }, []);

  // ── Helper: Close Photo Modal ────────────────────────────────────────────
  const closePhoto = useCallback(() => {
    setSelectedPhoto(null);
    window.history.pushState({}, '', '/');
    resetMeta();
  }, []);

  // ── Helper: Go back from story to home ───────────────────────────────────
  const handleStoryBack = useCallback(() => {
    setView('home');
    setSelectedStory(null);
    window.history.pushState({}, '', '/');
    resetMeta();
  }, []);

  // Admin login removed — admin auto-detected by email

  // ── Admin Dashboard View ──
  if (view === 'admin-dashboard') {
    return (
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
    );
  }

  // ── Terms & Conditions View ──
  if (view === 'terms') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column' }}>
        <Header
          onScrollToGallery={scrollToGallery}
          logoUrl={logoUrl}
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
          <TermsConditions onBack={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }} />
        </div>
        <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />
        <AIChatbot photos={photos} onPhotoClick={openPhoto} />
        <SearchBar
          isOpen={showSearch}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          photos={photos}
          onPhotoClick={openPhoto}
        />
        <VisitorLogin
          isOpen={showVisitorLogin}
          onClose={() => setShowVisitorLogin(false)}
          onLogin={handleVisitorLogin}
        />
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
        </div>
        <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />
        <AIChatbot photos={photos} onPhotoClick={openPhoto} />
        <SearchBar
          isOpen={showSearch}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          photos={photos}
          onPhotoClick={(p) => { openPhoto(p); setView('home'); }}
        />
        <VisitorLogin
          isOpen={showVisitorLogin}
          onClose={() => setShowVisitorLogin(false)}
          onLogin={handleVisitorLogin}
        />
      </div>
    );
  }

  const StaticPage = ({ title, text, cta }: { title: string; text: string; cta?: string }) => (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column' }}>
      <Header
        onScrollToGallery={scrollToGallery}
        logoUrl={logoUrl}
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
      <div className="wa-container" style={{ paddingTop: '8rem', paddingBottom: '5rem', maxWidth: 900 }}>
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
  if (view === 'community') return <StaticPage title="Join the Photography Community" text="Connect with creators, share your work, and grow your photography journey with Drishya." cta="Photography that makes an impact." />;
  if (view === 'ngo') return <StaticPage title="Save Animal Nepal" text="We are building a system to support injured and abandoned animals across Nepal. Through photography and community support, we aim to create real impact. Mission: rescue, treatment, and feeding. Future plan: transparent monthly reporting and verified rescue partners." />;
  if (view === 'about') return <StaticPage title="About WildSaura" text="WildSaura connects photographers, nature lovers, and a mission to protect animals in Nepal. Start small, grow fast, and use visual storytelling for impact." />;
  if (view === 'contact') return <StaticPage title="Contact" text="For partnerships, volunteering, and media inquiries, message us through the contact form on the homepage." />;
  // ── Dynamic Categories (uses custom images from site settings if available) ──
  const dynamicCategories: Category[] = [
    { key: 'wildlife', label: 'Wildlife', imageUrl: siteSettings.categoryImages?.wildlife || '/photos/photo-wildlife.jpeg' },
    { key: 'birds', label: 'Birds', imageUrl: siteSettings.categoryImages?.birds || '/photos/photo-wildlife.jpeg' },
    { key: 'landscape', label: 'Landscapes', imageUrl: siteSettings.categoryImages?.landscape || '/photos/photo-landscape.jpeg' },
    { key: 'nature', label: 'Nature', imageUrl: siteSettings.categoryImages?.nature || '/photos/photo-nature.jpeg' },
    { key: 'other', label: 'Portraits', imageUrl: siteSettings.categoryImages?.portraits || '/photos/photo-portrait.jpeg' },
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
      <Hero onExplore={scrollToGallery} logoUrl={logoUrl} heroImages={siteSettings.heroImages} />
      <CategorySection categories={dynamicCategories} onCategoryClick={handleCategoryClick} />
      <Gallery
        photos={photos}
        filterTabs={FILTER_TABS}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onPhotoClick={openPhoto}
        onLike={handleLike}
        onShare={handleShare}
        onDownload={handleDownload}
        galleryRef={galleryRef}
        isLoggedIn={!!visitor}
        onLoginRequired={() => setShowVisitorLogin(true)}
      />
      <PhotoGallery photos={galleryPhotos} searchQuery={searchQuery} />
      <StoriesSection stories={stories} onStoryClick={handleStoryClick} />
      <VideoSection 
        videos={videos} 
        visitor={visitor}
        videoComments={videoComments}
        onAddVideoComment={handleAddVideoComment}
        onVideoLike={handleVideoLike}
        onVisitorLoginClick={() => setShowVisitorLogin(true)}
        isAdmin={isAdmin}
        onDeleteComment={handleDeleteComment}
      />
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

      <PhotoMap
        photos={photos}
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onPhotoClick={(photo) => { setShowMap(false); openPhoto(photo); }}
      />

      <AIChatbot photos={photos} onPhotoClick={openPhoto} />

      <SearchBar
        isOpen={showSearch}
        onClose={() => { setShowSearch(false); setSearchQuery(''); }}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        photos={searchablePhotos}
        onPhotoClick={openPhoto}
      />

      <VisitorLogin
        isOpen={showVisitorLogin}
        onClose={() => setShowVisitorLogin(false)}
        onLogin={handleVisitorLogin}
      />

      <NotificationPanel
        isOpen={showNotifPanel}
        onClose={() => setShowNotifPanel(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDeleteNotif}
        onClearAll={handleClearAllNotifs}
      />
    </div>
  );
};

export default App;
