import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Photo, Category, FilterTab, Visitor, Story, Comment, Video } from './types';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategorySection } from './components/CategorySection';
import { Gallery } from './components/Gallery';
import { PhotoModal } from './components/PhotoModal';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { SearchBar } from './components/SearchBar';
import { AIChatbot } from './components/AIChatbot';
import { VisitorLogin } from './components/VisitorLogin';
import { StoriesSection } from './components/StoriesSection';
import { VideoSection } from './components/VideoSection';
import { TermsConditions } from './components/TermsConditions';
import { StoryDetail } from './components/StoryDetail';
import { downloadPhoto } from './utils/downloadPhoto';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { addUserLike, removeUserLike, getUserLikes } from './services/userLikesService';
import { getPhotosFromFirestore, deletePhotoFromFirestore, updatePhotoInFirestore } from './services/photoService';
import { getStoriesFromFirestore, addStoryToFirestore, deleteStoryFromFirestore, updateStoryInFirestore, uploadStoryCoverToStorage } from './services/storyService';
import { getVideosFromFirestore, addVideoToFirestore, deleteVideoFromFirestore, updateVideoInFirestore, uploadVideoThumbnailToStorage, uploadVideoToStorage } from './services/videoService';
import { addCommentToFirestore, getCommentsForTarget, getAllComments } from './services/commentService';
import { saveVisitorToFirestore, getVisitorFromFirestore, updateVisitorDownloadCount, updateVisitorProfile } from './services/visitorService';

const logoUrl = '/photos/logo.png';

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
  { key: 'landscape', label: 'Landscapes', imageUrl: '/photos/photo-landscape.jpeg' },
  { key: 'other', label: 'Portraits', imageUrl: '/photos/photo-portrait.jpeg' },
];

const FILTER_TABS: FilterTab[] = [
  { key: 'all', label: 'All' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'landscape', label: 'Landscapes' },
  { key: 'street', label: 'Street' },
  { key: 'other', label: 'Portraits' },
];

// ── App ─────────────────────────────────────────────────────────────────────
type AppView = 'home' | 'admin-login' | 'admin-dashboard' | 'story-detail' | 'terms';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/story/')) return 'story-detail';
      if (path === '/terms') return 'terms';
      if (localStorage.getItem('wa_admin_session')) return 'admin-dashboard';
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
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const galleryRef = useRef<HTMLElement | null>(null);

  // New state
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showVisitorLogin, setShowVisitorLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [photoComments, setPhotoComments] = useState<Record<number, Comment[]>>({});
  const [storyComments, setStoryComments] = useState<Record<number, Comment[]>>({});
  const [videoComments, setVideoComments] = useState<Record<number, Comment[]>>({});
  const [downloadCount, setDownloadCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const FREE_DOWNLOADS = 2;

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
            } else {
              setVisitor({
                displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
                email: firebaseUser.email,
                avatarColor: '#c9a84c',
                avatarUrl: firebaseUser.photoURL || undefined,
                loginMethod: 'email',
              });
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
    const m = window.location.pathname.match(/^\/photo\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  });
  const [pendingStorySlug, setPendingStorySlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.pathname.match(/^\/story\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const firestorePhotos = await getPhotosFromFirestore();
        if (firestorePhotos.length > 0) {
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
            likeCount: fp.likeCount || 0,
            liked: false,
          }));
          setPhotos(prev => {
            const allPhotos = [...mapped, ...prev];
            // Deep link: auto-open photo if pending
            if (pendingPhotoId) {
              const matchedPhoto = allPhotos.find(p => p.firestoreId === pendingPhotoId);
              if (matchedPhoto) {
                setTimeout(() => {
                  setSelectedPhoto(matchedPhoto);
                  setPendingPhotoId(null);
                }, 100);
              }
            }
            return allPhotos;
          });
        } else {
          // Even if no Firestore photos, check sample photos for pending deep link
          if (pendingPhotoId) {
            const matchedPhoto = SAMPLE_PHOTOS.find(p => String(p.id) === pendingPhotoId || p.firestoreId === pendingPhotoId);
            if (matchedPhoto) {
              setTimeout(() => {
                setSelectedPhoto(matchedPhoto);
                setPendingPhotoId(null);
              }, 100);
            }
          }
        }
      } catch (err) {
        console.warn('Firestore load failed:', err);
        // Check sample photos for pending deep link on error too
        if (pendingPhotoId) {
          const matchedPhoto = SAMPLE_PHOTOS.find(p => String(p.id) === pendingPhotoId || p.firestoreId === pendingPhotoId);
          if (matchedPhoto) {
            setTimeout(() => {
              setSelectedPhoto(matchedPhoto);
              setPendingPhotoId(null);
            }, 100);
          }
        }
      }
    };
    loadPhotos();

    // Load stories from Firestore
    const loadStories = async () => {
      try {
        const firestoreStories = await getStoriesFromFirestore();
        if (firestoreStories.length > 0) {
          const mapped: Story[] = firestoreStories.map((fs, idx) => ({
            id: Date.now() + idx + 5000,
            firestoreId: fs.id,
            title: fs.title,
            slug: fs.slug,
            excerpt: fs.excerpt,
            content: fs.content,
            coverImageUrl: fs.coverImageUrl,
            tags: fs.tags || [],
            createdAt: fs.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
            viewCount: fs.viewCount || 0,
            likeCount: fs.likeCount || 0,
            liked: false,
          }));
          setStories(prev => {
            const existingTitles = new Set(prev.map(s => s.title.toLowerCase().trim()));
            const newOnes = mapped.filter(s => !existingTitles.has(s.title.toLowerCase().trim()));
            const allStories = newOnes.length === 0 ? prev : [...newOnes, ...prev];
            // Deep link: auto-open story if pending
            if (pendingStorySlug) {
              const matchedStory = allStories.find(s => s.slug === pendingStorySlug);
              if (matchedStory) {
                setTimeout(() => {
                  setSelectedStory({ ...matchedStory, viewCount: matchedStory.viewCount + 1 });
                  setView('story-detail');
                  setPendingStorySlug(null);
                }, 100);
              }
            }
            return allStories;
          });
        } else {
          // Check sample stories for pending deep link
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
        }
      } catch (err) {
        console.warn('Firestore stories load failed:', err);
        // Check sample stories for pending deep link on error too
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
      }
    };
    loadStories();


    // Load videos from Firestore
    const loadVideos = async () => {
      try {
        const firestoreVideos = await getVideosFromFirestore();
        if (firestoreVideos.length > 0) {
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
          }));
          setVideos(mapped);
        }
      } catch (err) {
        console.warn('Firestore videos load failed:', err);
      }
    };
    loadVideos();

    // Load all comments from Firestore
    const loadComments = async () => {
      try {
        const allComments = await getAllComments();
        const photoMap: Record<number, Comment[]> = {};
        const storyMap: Record<number, Comment[]> = {};
        const videoMap: Record<number, Comment[]> = {};
        allComments.forEach((c: any) => {
          const comment: Comment = {
            id: Date.now() + Math.random(),
            firestoreId: c.id,
            displayName: c.displayName,
            avatarColor: c.avatarColor || '',
            content: c.content,
            createdAt: c.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
          };
          if (c.targetType === 'photo') {
            if (!photoMap[c.targetId]) photoMap[c.targetId] = [];
            photoMap[c.targetId].push(comment);
          } else if (c.targetType === 'video') {
            if (!videoMap[c.targetId]) videoMap[c.targetId] = [];
            videoMap[c.targetId].push(comment);
          } else {
            if (!storyMap[c.targetId]) storyMap[c.targetId] = [];
            storyMap[c.targetId].push(comment);
          }
        });
        setPhotoComments(photoMap);
        setStoryComments(storyMap);
        setVideoComments(videoMap);
      } catch (err) {
        console.warn('Firestore comments load failed:', err);
      }
    };
    loadComments();
  }, []);

  // Apply user likes to photos/stories/videos when userLikes changes
  useEffect(() => {
    if (userLikes.size > 0) {
      setPhotos(prev => prev.map(p => ({ ...p, liked: userLikes.has(`photo_${p.id}`) })));
      setStories(prev => prev.map(s => ({ ...s, liked: userLikes.has(`story_${s.id}`) })));
      setVideos(prev => prev.map(v => ({ ...v, liked: userLikes.has(`video_${v.id}`) })));
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
      // Save per-user like to Firestore
      if (visitor?.email) {
        if (newLiked) addUserLike(visitor.email, 'photo', id).catch(console.warn);
        else removeUserLike(visitor.email, 'photo', id).catch(console.warn);
      }
      setUserLikes(prev => {
        const next = new Set(prev);
        if (newLiked) next.add(`photo_${id}`);
        else next.delete(`photo_${id}`);
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
    setView('admin-dashboard');
    localStorage.setItem('wa_admin_session', 'true');
    window.history.pushState({}, '', '/admin');
  }, []);

  const handleLogout = useCallback(() => {
    setIsAdmin(false);
    setView('home');
    localStorage.removeItem('wa_admin_session');
    window.history.pushState({}, '', '/');
  }, []);

  const handleAdminClick = useCallback(() => {
    if (isAdmin) {
      setView('admin-dashboard');
      window.history.pushState({}, '', '/admin');
    } else {
      setView('admin-login');
    }
  }, [isAdmin]);

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

  const handleUpdateStory = useCallback((updated: Story) => {
    if (updated.firestoreId) {
      updateStoryInFirestore(updated.firestoreId, {
        title: updated.title,
        slug: updated.slug,
        excerpt: updated.excerpt,
        content: updated.content,
        coverImageUrl: updated.coverImageUrl,
        tags: updated.tags,
        viewCount: updated.viewCount,
        likeCount: updated.likeCount,
      }).catch(err => console.warn('Firestore story update failed:', err));
    }
    setStories((prev) => prev.map((s) => s.id === updated.id ? updated : s));
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

  const handleUpdateVideo = useCallback((updated: Video) => {
    if (updated.firestoreId) {
      updateVideoInFirestore(updated.firestoreId, {
        title: updated.title,
        description: updated.description,
        videoUrl: updated.videoUrl,
        thumbnailUrl: updated.thumbnailUrl,
        tags: updated.tags,
        location: updated.location || '',
        duration: updated.duration || '',
        viewCount: updated.viewCount,
        likeCount: updated.likeCount,
      }).catch(err => console.warn('Firestore video update failed:', err));
    }
    setVideos((prev) => prev.map((v) => v.id === updated.id ? updated : v));
  }, []);

  const handleStoryClick = useCallback((story: Story) => {
    setSelectedStory({ ...story, viewCount: story.viewCount + 1 });
    setStories((prev) => prev.map((s) => s.id === story.id ? { ...s, viewCount: s.viewCount + 1 } : s));
    setView('story-detail');
    window.history.pushState({}, '', '/story/' + encodeURIComponent(story.slug));
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
    if (visitor?.email) {
      if (updated.liked) addUserLike(visitor.email, 'story', selectedStory.id).catch(console.warn);
      else removeUserLike(visitor.email, 'story', selectedStory.id).catch(console.warn);
    }
    setUserLikes(prev => {
      const next = new Set(prev);
      if (updated.liked) next.add(`story_${selectedStory.id}`);
      else next.delete(`story_${selectedStory.id}`);
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
  const handleAddPhotoComment = useCallback((photoId: number, content: string) => {
    if (!visitor) return;
    const newComment: Comment = {
      id: Date.now(),
      displayName: visitor.displayName,
      avatarColor: visitor.avatarColor,
      content,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPhotoComments((prev) => ({
      ...prev,
      [photoId]: [...(prev[photoId] || []), newComment],
    }));
    // Save to Firestore
    addCommentToFirestore({
      targetType: 'photo',
      targetId: photoId,
      displayName: visitor.displayName,
      avatarColor: visitor.avatarColor || '',
      content,
    }).catch(err => console.warn('Comment save failed:', err));
  }, [visitor]);

  const handleAddStoryComment = useCallback((storyId: number, content: string) => {
    if (!visitor) return;
    const newComment: Comment = {
      id: Date.now(),
      displayName: visitor.displayName,
      avatarColor: visitor.avatarColor,
      content,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setStoryComments((prev) => ({
      ...prev,
      [storyId]: [...(prev[storyId] || []), newComment],
    }));
    // Save to Firestore
    addCommentToFirestore({
      targetType: 'story',
      targetId: storyId,
      displayName: visitor.displayName,
      avatarColor: visitor.avatarColor || '',
      content,
    }).catch(err => console.warn('Comment save failed:', err));
  }, [visitor]);

  const handleAddVideoComment = useCallback((videoId: number, content: string) => {
    if (!visitor) return;
    const newComment: Comment = {
      id: Date.now(),
      displayName: visitor.displayName,
      avatarColor: visitor.avatarColor,
      content,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setVideoComments((prev) => ({
      ...prev,
      [videoId]: [...(prev[videoId] || []), newComment],
    }));
    // Save to Firestore
    addCommentToFirestore({
      targetType: 'video',
      targetId: videoId,
      displayName: visitor.displayName,
      avatarColor: visitor.avatarColor || '',
      content,
    }).catch(err => console.warn('Video comment save failed:', err));
  }, [visitor]);

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
      if (visitor?.email) {
        if (newLiked) addUserLike(visitor.email, 'video', id).catch(console.warn);
        else removeUserLike(visitor.email, 'video', id).catch(console.warn);
      }
      setUserLikes(prev => {
        const next = new Set(prev);
        if (newLiked) next.add(`video_${id}`);
        else next.delete(`video_${id}`);
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
    } else {
      window.history.pushState({}, '', '/');
    }
  }, []);

  // ── Helper: Close Photo Modal ────────────────────────────────────────────
  const closePhoto = useCallback(() => {
    setSelectedPhoto(null);
    window.history.pushState({}, '', '/');
  }, []);

  // ── Helper: Go back from story to home ───────────────────────────────────
  const handleStoryBack = useCallback(() => {
    setView('home');
    setSelectedStory(null);
    window.history.pushState({}, '', '/');
  }, []);

  // ── Admin Login View ──
  if (view === 'admin-login') {
    return (
      <AdminLogin logoUrl={logoUrl} onLogin={handleLogin} onBack={() => { setView('home'); window.history.pushState({}, '', '/'); }} />
    );
  }

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
        onDeleteVideo={handleDeleteVideo}
        onUpdateVideo={handleUpdateVideo}
      />
    );
  }

  // ── Terms & Conditions View ──
  if (view === 'terms') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wa-dark)' }}>
        <Header
          onScrollToGallery={scrollToGallery}
          logoUrl={logoUrl}
          onAdminClick={handleAdminClick}
          isAdmin={isAdmin}
          onSearchClick={() => setShowSearch(true)}
          visitor={visitor}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          onVisitorLogout={handleVisitorLogout}
          onVisitorUpdate={handleVisitorUpdate}
          onStoriesClick={handleStoriesNavClick}
        />
        <TermsConditions onBack={() => { setView('home'); window.history.pushState({}, '', '/'); window.scrollTo(0, 0); }} />
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
      <div style={{ minHeight: '100vh', background: 'var(--wa-dark)' }}>
        <Header
          onScrollToGallery={scrollToGallery}
          logoUrl={logoUrl}
          onAdminClick={handleAdminClick}
          isAdmin={isAdmin}
          onSearchClick={() => setShowSearch(true)}
          visitor={visitor}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          onVisitorLogout={handleVisitorLogout}
          onVisitorUpdate={handleVisitorUpdate}
          onStoriesClick={handleStoriesNavClick}
        />
        <StoryDetail
          story={selectedStory}
          onBack={handleStoryBack}
          onLike={handleStoryLike}
          visitor={visitor}
          comments={storyComments[selectedStory.id] || []}
          onAddComment={(content) => handleAddStoryComment(selectedStory.id, content)}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
        />
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

  // ── Home View ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-dark)' }}>
      <Header
        onScrollToGallery={scrollToGallery}
        logoUrl={logoUrl}
        onAdminClick={handleAdminClick}
        isAdmin={isAdmin}
        onSearchClick={() => setShowSearch(true)}
        visitor={visitor}
        onVisitorLoginClick={() => setShowVisitorLogin(true)}
        onVisitorLogout={handleVisitorLogout}
        onVisitorUpdate={handleVisitorUpdate}
        onStoriesClick={handleStoriesNavClick}
      />
      <Hero onExplore={scrollToGallery} logoUrl={logoUrl} />
      <CategorySection categories={CATEGORIES} onCategoryClick={handleCategoryClick} />
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
      <StoriesSection stories={stories} onStoryClick={handleStoryClick} />
      <VideoSection 
        videos={videos} 
        visitor={visitor}
        videoComments={videoComments}
        onAddVideoComment={handleAddVideoComment}
        onVideoLike={handleVideoLike}
        onVisitorLoginClick={() => setShowVisitorLogin(true)}
      />
      <AboutSection />
      <Footer logoUrl={logoUrl} onTermsClick={handleTermsClick} />

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
          comments={photoComments[selectedPhoto.id] || []}
          onAddComment={(content) => handleAddPhotoComment(selectedPhoto.id, content)}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
          freeDownloadsLeft={Math.max(0, FREE_DOWNLOADS - downloadCount)}
          isDownloading={isDownloading}
        />
      )}

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
};

export default App;
