import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Photo, Category, FilterTab, Visitor, Story, Comment } from './types';
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
import { StoryDetail } from './components/StoryDetail';
import { downloadPhoto } from './utils/downloadPhoto';
import { getPhotosFromFirestore, deletePhotoFromFirestore } from './services/photoService';

const logoUrl = '/photos/logo.png';

// ── Sample Photo Data ───────────────────────────────────────────────────────
const SAMPLE_PHOTOS: Photo[] = [
  {
    id: 1, title: 'Japanese Macaque', category: 'wildlife',
    imageUrl: '/photos/photo-wildlife.jpeg',
    location: 'Japan', caption: 'A curious Japanese macaque bathing in a hot spring, captured in intimate detail.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 100-500mm f/4.5-7.1L',
    aperture: 'f/5.6', shutterSpeed: '1/500s', iso: '800', focalLength: '400mm',
    tags: ['macaque', 'monkey', 'hot spring', 'japan', 'wildlife', 'primate'],
    animalName: 'Japanese Macaque',
    likeCount: 142, liked: false,
  },
  {
    id: 2, title: 'Coastal Majesty', category: 'landscape',
    imageUrl: '/photos/photo-landscape.jpeg',
    location: 'Pacific Coast', caption: 'Dramatic rocky coastline meeting the vast ocean with mountain silhouettes in the distance.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 24-70mm f/2.8L',
    aperture: 'f/11', shutterSpeed: '1/250s', iso: '100', focalLength: '35mm',
    tags: ['coast', 'ocean', 'rocks', 'landscape', 'pacific', 'seascape'],
    likeCount: 98, liked: false,
  },
  {
    id: 3, title: 'Beach Portrait', category: 'other',
    imageUrl: '/photos/photo-portrait.jpeg',
    location: 'Seaside', caption: 'A serene portrait on the sandy shores, capturing natural beauty and calm.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 85mm f/1.2L',
    aperture: 'f/1.4', shutterSpeed: '1/320s', iso: '200', focalLength: '85mm',
    tags: ['portrait', 'beach', 'golden hour', 'seaside'],
    likeCount: 89, liked: false,
  },
  {
    id: 4, title: 'City Lights at Dusk', category: 'street',
    imageUrl: '/photos/photo-street.jpeg',
    location: 'Tokyo, Japan', caption: 'A moody cityscape framed by silhouetted trees under a dramatic twilight sky.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 24-70mm f/2.8L',
    aperture: 'f/2.8', shutterSpeed: '1/60s', iso: '1600', focalLength: '35mm',
    tags: ['tokyo', 'city', 'dusk', 'urban', 'night', 'skyline'],
    likeCount: 76, liked: false,
  },
  {
    id: 5, title: 'Snow Monkey Close-up', category: 'wildlife',
    imageUrl: '/photos/photo-wildlife.jpeg',
    location: 'Nagano, Japan', caption: 'An intimate encounter with a snow monkey in its natural habitat.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 100-500mm f/4.5-7.1L',
    aperture: 'f/6.3', shutterSpeed: '1/800s', iso: '400', focalLength: '300mm',
    tags: ['snow monkey', 'macaque', 'japan', 'nagano', 'winter', 'primate'],
    animalName: 'Snow Monkey',
    likeCount: 120, liked: false,
  },
  {
    id: 6, title: 'Rocky Shoreline', category: 'landscape',
    imageUrl: '/photos/photo-landscape.jpeg',
    location: 'Pacific Coast', caption: 'Waves crashing against ancient rocks under open skies.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 15-35mm f/2.8L',
    aperture: 'f/8', shutterSpeed: '1/125s', iso: '200', focalLength: '24mm',
    likeCount: 65, liked: false,
  },
  {
    id: 7, title: 'Seaside Serenity', category: 'other',
    imageUrl: '/photos/photo-portrait.jpeg',
    location: 'Beach', caption: 'Golden light and ocean breeze in a relaxed beach portrait.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 85mm f/1.2L',
    aperture: 'f/1.8', shutterSpeed: '1/250s', iso: '100', focalLength: '85mm',
    likeCount: 54, liked: false,
  },
  {
    id: 8, title: 'Urban Twilight', category: 'street',
    imageUrl: '/photos/photo-street.jpeg',
    location: 'Tokyo, Japan', caption: 'The city awakens under a brooding evening sky.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 35mm f/1.4L',
    aperture: 'f/2.0', shutterSpeed: '1/100s', iso: '1000', focalLength: '35mm',
    likeCount: 71, liked: false,
  },
  {
    id: 9, title: 'Macaque Bathing', category: 'wildlife',
    imageUrl: '/photos/photo-wildlife.jpeg',
    location: 'Japan', caption: 'Warm steam rises as a macaque enjoys the hot springs.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 100-500mm f/4.5-7.1L',
    aperture: 'f/5.6', shutterSpeed: '1/640s', iso: '500', focalLength: '200mm',
    likeCount: 93, liked: false,
  },
  {
    id: 10, title: 'Ocean Vista', category: 'landscape',
    imageUrl: '/photos/photo-landscape.jpeg',
    location: 'Coastline', caption: 'Endless ocean horizon framed by rugged coastal formations.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 24-70mm f/2.8L',
    aperture: 'f/8', shutterSpeed: '1/60s', iso: '100', focalLength: '45mm',
    likeCount: 47, liked: false,
  },
  {
    id: 11, title: 'Beach Walk', category: 'other',
    imageUrl: '/photos/photo-portrait.jpeg',
    location: 'Sandy Shore', caption: 'A quiet moment by the sea, footprints trailing behind.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 85mm f/1.2L',
    aperture: 'f/2.0', shutterSpeed: '1/400s', iso: '200', focalLength: '85mm',
    likeCount: 112, liked: false,
  },
  {
    id: 12, title: 'Night Cityscape', category: 'street',
    imageUrl: '/photos/photo-street.jpeg',
    location: 'Tokyo, Japan', caption: 'Towers of light pierce the moody dusk sky.',
    type: 'photo', cameraModel: 'Canon EOS R5', lens: 'RF 24-70mm f/2.8L',
    aperture: 'f/4.0', shutterSpeed: '1/30s', iso: '3200', focalLength: '28mm',
    likeCount: 38, liked: false,
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
type AppView = 'home' | 'admin-login' | 'admin-dashboard' | 'story-detail';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(SAMPLE_PHOTOS);
  const [stories, setStories] = useState<Story[]>(SAMPLE_STORIES);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const galleryRef = useRef<HTMLElement | null>(null);

  // New state
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showVisitorLogin, setShowVisitorLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [photoComments, setPhotoComments] = useState<Record<number, Comment[]>>({
    1: [
      { id: 1, displayName: 'Nature Lover', avatarColor: '#c9a84c', content: 'Stunning shot! The lighting is incredible.', createdAt: '2026-03-10' },
      { id: 2, displayName: 'PhotoFan', avatarColor: '#d4a843', content: 'Amazing composition and color grading!', createdAt: '2026-03-09' },
    ],
  });
  const [storyComments, setStoryComments] = useState<Record<number, Comment[]>>({});
  const [downloadCount, setDownloadCount] = useState(() => {
    try { return parseInt(localStorage.getItem('wa_download_count') || '0', 10); } catch { return 0; }
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const FREE_DOWNLOADS = 2;

  useEffect(() => {
    const loadPhotos = async () => {
      let loaded = false;
      
      // Try Firebase first
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
          setPhotos(prev => [...mapped, ...prev]);
          loaded = true;
        }
      } catch (err) {
        console.warn('Firestore load failed:', err);
      }
      
      // Also load from localStorage (fallback + merge)
      try {
        const stored = localStorage.getItem('wa_photos');
        if (stored) {
          const localPhotos = JSON.parse(stored) as Photo[];
          if (localPhotos.length > 0) {
            setPhotos(prev => {
              const existingUrls = new Set(prev.map(p => p.imageUrl));
              const newPhotos = localPhotos.filter(p => !existingUrls.has(p.imageUrl));
              return [...newPhotos, ...prev];
            });
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('localStorage load failed:', err);
      }
    };
    loadPhotos();

    // Load saved stories from localStorage
    const savedStories = localStorage.getItem('wa_stories');
    if (savedStories) {
      try {
        const parsed = JSON.parse(savedStories);
        if (parsed.length > 0) {
          setStories(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const newOnes = parsed.filter((s: Story) => !existingIds.has(s.id));
            return [...newOnes, ...prev];
          });
        }
      } catch {}
    }
  }, []);

  const scrollToGallery = useCallback(() => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleCategoryClick = useCallback((key: string) => {
    setSelectedCategory(key);
    setTimeout(() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const handleLike = useCallback((id: number) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 } : p
      )
    );
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto((prev) =>
        prev ? { ...prev, liked: !prev.liked, likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1 } : null
      );
    }
  }, [selectedPhoto]);

  const handleShare = useCallback(async (photo: Photo) => {
    if (!visitor) { setShowVisitorLogin(true); return; }
    const shareUrl = `https://wildsaura.com`;
    const shareText = `Check out "${photo.title}" on WILDS AURA Photography! 🐯📸`;

    const showToast = (msg: string) => {
      const toast = document.createElement('div');
      toast.textContent = msg;
      toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);padding:0.75rem 1.5rem;background:#1a1a1a;color:#d4a853;border:1px solid rgba(201,168,76,0.4);border-radius:8px;font-size:0.85rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => { try { document.body.removeChild(toast); } catch {} }, 500); }, 2500);
    };

    // Try to create a shareable image with branding
    const createShareImage = async (): Promise<File | null> => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          // Try fetch+blob for CORS
          if (!photo.imageUrl.startsWith('data:')) {
            fetch(photo.imageUrl, { mode: 'cors' })
              .then(r => r.blob())
              .then(b => { img.src = URL.createObjectURL(b); })
              .catch(() => { img.src = photo.imageUrl; });
          } else {
            img.src = photo.imageUrl;
          }
        });

        const canvas = document.createElement('canvas');
        const w = Math.min(img.naturalWidth || img.width, 1200);
        const scale = w / (img.naturalWidth || img.width);
        const h = Math.round((img.naturalHeight || img.height) * scale);
        canvas.width = w;
        canvas.height = h + 60; // extra space for branding bar
        const ctx = canvas.getContext('2d')!;
        
        // Draw photo
        ctx.drawImage(img, 0, 0, w, h);
        
        // Draw branding bar at bottom
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, h, w, 60);
        
        // Gold text branding
        ctx.fillStyle = '#d4a853';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🐯 WILDS AURA PHOTOGRAPHY', 16, h + 28);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(235,230,220,0.6)';
        ctx.fillText(photo.title, 16, h + 48);
        ctx.textAlign = 'right';
        ctx.fillText('wildsaura.com', w - 16, h + 48);

        // Small watermark on photo
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('© WILDS AURA', w - 12, h - 12);
        ctx.restore();

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (!blob) return null;
        return new File([blob], `${photo.title.replace(/[^a-zA-Z0-9]/g, '_')}_wildsaura.jpg`, { type: 'image/jpeg' });
      } catch {
        return null;
      }
    };

    // Try sharing with actual image file
    const shareFile = await createShareImage();
    
    if (navigator.share && shareFile && navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({
          title: `${photo.title} - WILDS AURA`,
          text: shareText,
          files: [shareFile],
        });
        return;
      } catch {
        // User cancelled or failed
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: `${photo.title} - WILDS AURA`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    // Desktop fallback: copy image to clipboard if possible
    if (shareFile) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/jpeg': shareFile }),
        ]);
        showToast('✅ Photo copied to clipboard! Paste in any app to share');
        return;
      } catch {}
    }

    // Final fallback: copy text
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showToast('✅ Link copied to clipboard!');
    } catch {
      window.prompt('Copy this link to share:', shareUrl);
    }
  }, [visitor]);

  const handleLogin = useCallback(() => { setIsAdmin(true); setView('admin-dashboard'); }, []);
  const handleLogout = useCallback(() => { setIsAdmin(false); setView('home'); }, []);

  const handleAdminClick = useCallback(() => {
    setView(isAdmin ? 'admin-dashboard' : 'admin-login');
  }, [isAdmin]);

  const handleAddPhoto = useCallback((photo: Photo) => {
    setPhotos((prev) => {
      const updated = [photo, ...prev];
      // Save to localStorage as backup
      try {
        const userPhotos = updated.filter(p => !SAMPLE_PHOTOS.find(s => s.id === p.id));
        localStorage.setItem('wa_photos', JSON.stringify(userPhotos));
      } catch (e) { console.warn('localStorage save failed:', e); }
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
      try {
        const userPhotos = updated.filter(p => !SAMPLE_PHOTOS.find(s => s.id === p.id));
        localStorage.setItem('wa_photos', JSON.stringify(userPhotos));
      } catch (e) { console.warn('localStorage sync failed:', e); }
      return updated;
    });
  }, [photos]);
  const handleUpdatePhoto = useCallback((updated: Photo) => { setPhotos((prev) => prev.map((p) => p.id === updated.id ? updated : p)); }, []);

  // Story handlers
  const handleAddStory = useCallback((story: Story) => { setStories((prev) => [story, ...prev]); }, []);
  const handleDeleteStory = useCallback((id: number) => { setStories((prev) => prev.filter((s) => s.id !== id)); }, []);
  const handleUpdateStory = useCallback((updated: Story) => { setStories((prev) => prev.map((s) => s.id === updated.id ? updated : s)); }, []);

  const handleStoryClick = useCallback((story: Story) => {
    setSelectedStory({ ...story, viewCount: story.viewCount + 1 });
    setStories((prev) => prev.map((s) => s.id === story.id ? { ...s, viewCount: s.viewCount + 1 } : s));
    setView('story-detail');
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
  }, [selectedStory]);

  // Visitor handlers
  const handleVisitorLogin = useCallback((v: Visitor) => {
    setVisitor(v);
    setShowVisitorLogin(false);
  }, []);

  const handleVisitorLogout = useCallback(() => { setVisitor(null); }, []);

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
  }, [visitor]);

  const handleDownload = useCallback(async (photo: Photo) => {
    if (!visitor) { setShowVisitorLogin(true); return; }
    setIsDownloading(true);
    try {
      const applyWatermark = downloadCount >= FREE_DOWNLOADS;
      await downloadPhoto(photo.imageUrl, photo.title, applyWatermark);
      const newCount = downloadCount + 1;
      setDownloadCount(newCount);
      try { localStorage.setItem('wa_download_count', String(newCount)); } catch {}
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
      
      const newStory: Story = {
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
      
      setStories(prev => [newStory, ...prev]);
      
      // Save to localStorage
      const saved = JSON.parse(localStorage.getItem('wa_stories') || '[]');
      saved.unshift(newStory);
      localStorage.setItem('wa_stories', JSON.stringify(saved));
      
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

  const handleStoriesNavClick = useCallback(() => {
    if (view !== 'home') setView('home');
    setTimeout(() => {
      document.getElementById('stories')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [view]);

  // ── Admin Login View ──
  if (view === 'admin-login') {
    return (
      <AdminLogin logoUrl={logoUrl} onLogin={handleLogin} onBack={() => setView('home')} />
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
        onViewSite={() => setView('home')}
        stories={stories}
        onAddStory={handleAddStory}
        onDeleteStory={handleDeleteStory}
        onUpdateStory={handleUpdateStory}
      />
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
          onStoriesClick={handleStoriesNavClick}
        />
        <StoryDetail
          story={selectedStory}
          onBack={() => { setView('home'); setSelectedStory(null); }}
          onLike={handleStoryLike}
          visitor={visitor}
          comments={storyComments[selectedStory.id] || []}
          onAddComment={(content) => handleAddStoryComment(selectedStory.id, content)}
          onVisitorLoginClick={() => setShowVisitorLogin(true)}
        />
        <Footer logoUrl={logoUrl} />
        <AIChatbot photos={photos} onPhotoClick={setSelectedPhoto} />
        <SearchBar
          isOpen={showSearch}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          photos={photos}
          onPhotoClick={(p) => { setSelectedPhoto(p); setView('home'); }}
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
        onStoriesClick={handleStoriesNavClick}
      />
      <Hero onExplore={scrollToGallery} logoUrl={logoUrl} />
      <CategorySection categories={CATEGORIES} onCategoryClick={handleCategoryClick} />
      <Gallery
        photos={photos}
        filterTabs={FILTER_TABS}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onPhotoClick={setSelectedPhoto}
        onLike={handleLike}
        onShare={handleShare}
        onDownload={handleDownload}
        galleryRef={galleryRef}
        isLoggedIn={!!visitor}
        onLoginRequired={() => setShowVisitorLogin(true)}
      />
      <StoriesSection stories={stories} onStoryClick={handleStoryClick} />
      <AboutSection />
      <Footer logoUrl={logoUrl} />

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
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

      <AIChatbot photos={photos} onPhotoClick={setSelectedPhoto} />

      <SearchBar
        isOpen={showSearch}
        onClose={() => { setShowSearch(false); setSearchQuery(''); }}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        photos={photos}
        onPhotoClick={setSelectedPhoto}
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
