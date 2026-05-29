import React, { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, orderBy, query,
  doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc, setDoc, getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Footer } from './Footer';
import { AvatarDisplay } from './AvatarDisplay';
import { Visitor } from '../types';
import { ANIMAL_AVATARS } from '../constants/avatarConstants';

interface Post {
  id: string;
  userId: string;
  username: string;
  text: string;
  imageUrl: string | null;
  timestamp: any;
  likes: string[];
  comments: CommentItem[];
  avatarUrl?: string;
  avatarColor?: string;
  spiritAnimal?: string;
  category?: string;
  story?: string;
}

interface CommentItem {
  userId: string;
  username: string;
  text: string;
  timestamp: string;
  avatarUrl?: string;
  avatarColor?: string;
  spiritAnimal?: string;
}

interface MemberInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  avatarColor?: string;
  spiritAnimal?: string;
  joinedAt?: any;
}

interface CommunityPageProps {
  onBack: () => void;
  logoUrl: string;
  onScrollToGallery: () => void;
  onSearchClick: () => void;
  visitor: Visitor | null;
  onVisitorLoginClick: () => void;
  onVisitorLogout: () => void;
  onVisitorUpdate: (v: Visitor) => void;
  onStoriesClick: () => void;
  notificationCount: number;
  onNotificationClick: () => void;
  isAdmin: boolean;
  onAdminClick: () => void;
  onTermsClick: () => void;
  onProfileClick?: () => void;
}

const POST_CATEGORIES = [
  { value: '', label: '📋 Select Category (optional)' },
  { value: 'wildlife', label: '🐯 Wildlife' },
  { value: 'birds', label: '🦅 Birds' },
  { value: 'landscape', label: '🏔️ Landscape' },
  { value: 'macro', label: '🔍 Macro' },
  { value: 'underwater', label: '🐠 Underwater' },
  { value: 'conservation', label: '🌍 Conservation' },
  { value: 'tips', label: '📸 Photography Tips' },
  { value: 'other', label: '✨ Other' },
];
const NAV_SITES = [
  { label: 'Drishya', href: 'https://drishya.wildsaura.com', emoji: '📸' },
  { label: 'Market', href: 'https://market.wildsaura.com', emoji: '🛒' },
  { label: 'Community Hub', href: 'https://community.wildsaura.com', emoji: '🌿' },
];


// Simple QR code component
function QRCode({ url, size = 180 }: { url: string; size?: number }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=16181c&color=d4a373&format=png`;
  return (
    <img
      src={qrUrl}
      alt="QR Code"
      width={size}
      height={size}
      style={{ borderRadius: 12, border: '2px solid #2e323a' }}
    />
  );
}

// Compress image before upload — robust for mobile/iOS
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => { try { URL.revokeObjectURL(objectUrl); } catch {} };

    // Timeout fallback — if canvas fails, use original file
    const timeout = setTimeout(() => {
      cleanup();
      console.warn('[CommunityPost] compressImage timed out, using original');
      resolve(file);
    }, 10000);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timeout);
          cleanup();
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            clearTimeout(timeout);
            cleanup();
            resolve(blob && blob.size > 0 ? blob : file);
          },
          'image/jpeg',
          quality
        );
        // Some browsers don't call toBlob callback
        setTimeout(() => {
          clearTimeout(timeout);
          cleanup();
          resolve(file);
        }, 5000);
      } catch (err) {
        clearTimeout(timeout);
        cleanup();
        console.warn('[CommunityPost] compressImage canvas error:', err);
        resolve(file);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      console.warn('[CommunityPost] compressImage image load error');
      resolve(file);
    };
    // crossOrigin needed for some mobile browsers
    img.crossOrigin = 'anonymous';
    img.src = objectUrl;
  });
}

export function CommunityPage({
  onBack,
  logoUrl,
  onScrollToGallery,
  onSearchClick,
  visitor,
  onVisitorLoginClick,
  onVisitorLogout,
  onVisitorUpdate,
  onStoriesClick,
  notificationCount,
  onNotificationClick,
  isAdmin,
  onAdminClick,
  onTermsClick,
  onProfileClick,
}: CommunityPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState('');
  const [postStory, setPostStory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const communityUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/community`
    : 'https://wildsaura.com/community';

  // Track Firebase auth state for uid
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  // Load posts — no login required (public!)
  useEffect(() => {
    const q = query(collection(db, 'community_posts'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const fetched: Post[] = [];
      snap.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Post);
      });
      setPosts(fetched);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Subscribe to community members (real-time)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'community_members'), (snap) => {
      setMemberCount(snap.size);
      const membersList: MemberInfo[] = [];
      snap.forEach((d) => {
        membersList.push({ userId: d.id, ...d.data() } as MemberInfo);
      });
      // Sort by join date (newest first)
      membersList.sort((a, b) => {
        const ta = a.joinedAt?.toDate?.()?.getTime?.() || 0;
        const tb = b.joinedAt?.toDate?.()?.getTime?.() || 0;
        return tb - ta;
      });
      setMembers(membersList);
      if (authUid) {
        setIsMember(snap.docs.some(d => d.id === authUid));
      }
    }, () => {});
    return () => unsub();
  }, [authUid]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenPostId) return;
    const handler = () => setMenuOpenPostId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpenPostId]);

  // Join Community
  const handleJoinCommunity = async () => {
    if (!visitor || !authUid) { onVisitorLoginClick(); return; }
    setJoining(true);
    try {
      await setDoc(doc(db, 'community_members', authUid), {
        userId: authUid,
        displayName: visitor.displayName,
        email: visitor.email || '',
        avatarUrl: visitor.avatarUrl || '',
        avatarColor: visitor.avatarColor || '#4ECDC4',
        spiritAnimal: visitor.avatarAnimal || '',
        joinedAt: serverTimestamp(),
      });
      setIsMember(true);
    } catch (err) {
      console.error('Join failed:', err);
    }
    setJoining(false);
  };

  // Auto-join on first post
  const ensureMember = async () => {
    if (!isMember && authUid && visitor) {
      try {
        await setDoc(doc(db, 'community_members', authUid), {
          userId: authUid,
          displayName: visitor.displayName,
          email: visitor.email || '',
          avatarUrl: visitor.avatarUrl || '',
          avatarColor: visitor.avatarColor || '#4ECDC4',
          spiritAnimal: visitor.avatarAnimal || '',
          joinedAt: serverTimestamp(),
        });
      } catch {}
    }
  };

  // Require login gate
  const requireLogin = (action: () => void) => {
    if (!visitor) {
      onVisitorLoginClick();
      return;
    }
    action();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setShareToast('❌ Image too large! Max 10MB. Try a smaller photo.');
      setTimeout(() => setShareToast(''), 3000);
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const resetModal = () => {
    setPostText('');
    setPostCategory('');
    setPostStory('');
    setImageFile(null);
    setImagePreview(null);
    setEditingPost(null);
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowModal(false);
  };

  // Upload image to Firebase Storage with retry
  const uploadImageToStorage = async (file: File, uid: string): Promise<string | null> => {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setUploadProgress(`📷 Compressing image${attempt > 1 ? ` (retry ${attempt})` : ''}...`);
        const compressed = await compressImage(file);
        setUploadProgress(`☁️ Uploading photo${attempt > 1 ? ` (retry ${attempt})` : ''}...`);
        const sRef = storageRef(storage, `community_posts/${uid}/${Date.now()}_post.jpg`);
        const snapshot = await uploadBytes(sRef, compressed);
        const url = await getDownloadURL(snapshot.ref);
        setUploadProgress('✅ Photo uploaded!');
        return url;
      } catch (err: any) {
        console.error(`[CommunityPost] Upload attempt ${attempt} failed:`, err);
        if (attempt === maxRetries) {
          // Check specific Firebase errors
          const code = err?.code || '';
          if (code.includes('unauthorized') || code.includes('permission') || code === 'storage/unauthorized') {
            setShareToast('❌ Photo upload not allowed — check Firebase Storage rules');
          } else if (code.includes('quota') || code === 'storage/quota-exceeded') {
            setShareToast('❌ Storage full — cannot upload photo');
          } else if (code.includes('canceled') || code === 'storage/canceled') {
            setShareToast('❌ Upload canceled');
          } else {
            setShareToast(`❌ Photo upload failed: ${err?.message || 'Unknown error'}`);
          }
          setTimeout(() => setShareToast(''), 5000);
          return null;
        }
        // Brief delay before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return null;
  };

  const handleSubmitPost = async () => {
    if (!postText.trim() && !imageFile && !editingPost) return;
    if (!visitor || !authUid) { onVisitorLoginClick(); return; }
    setSubmitting(true);
    try {
      // Editing existing post
      if (editingPost) {
        let uploadedImageUrl = editingPost.imageUrl;

        // If new image selected, upload it
        if (imageFile) {
          const uploaded = await uploadImageToStorage(imageFile, authUid);
          if (uploaded) {
            uploadedImageUrl = uploaded;
          } else {
            // Ask user: post without photo or cancel?
            const postAnyway = confirm('Photo upload failed. Save changes without new photo?');
            if (!postAnyway) {
              setSubmitting(false);
              setUploadProgress('');
              return;
            }
          }
        }

        setUploadProgress('💾 Saving changes...');
        await updateDoc(doc(db, 'community_posts', editingPost.id), {
          text: postText.trim(),
          imageUrl: uploadedImageUrl,
          category: postCategory || '',
          story: postStory.trim() || '',
        });
        setShareToast('✅ Post updated!');
        setTimeout(() => setShareToast(''), 2500);
        resetModal();
        setSubmitting(false);
        return;
      }

      // New post
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        uploadedImageUrl = await uploadImageToStorage(imageFile, authUid);
        if (!uploadedImageUrl) {
          // Ask user: post text-only or cancel?
          const postAnyway = confirm('Photo upload failed. Post without photo?');
          if (!postAnyway) {
            setSubmitting(false);
            setUploadProgress('');
            return;
          }
        }
      }

      setUploadProgress('📝 Creating post...');
      await addDoc(collection(db, 'community_posts'), {
        userId: authUid,
        username: visitor.displayName,
        text: postText.trim(),
        imageUrl: uploadedImageUrl,
        category: postCategory || '',
        story: postStory.trim() || '',
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
        avatarUrl: visitor.avatarUrl || '',
        avatarColor: visitor.avatarColor || '#4ECDC4',
        spiritAnimal: visitor.avatarAnimal || '',
      });
      await ensureMember();
      setShareToast(uploadedImageUrl ? '✅ Post published with photo!' : '✅ Post published!');
      setTimeout(() => setShareToast(''), 2500);
      resetModal();
    } catch (err: any) {
      console.error('[CommunityPost] Post failed:', err);
      const code = err?.code || '';
      if (code.includes('permission') || code === 'permission-denied') {
        setShareToast('❌ Permission denied — check Firestore rules');
      } else {
        setShareToast(`❌ Failed to post: ${err?.message || 'Try again'}`);
      }
      setTimeout(() => setShareToast(''), 5000);
      setUploadProgress('');
    }
    setSubmitting(false);
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'community_posts', postId));
      setShareToast('🗑️ Post deleted');
      setTimeout(() => setShareToast(''), 2500);
    } catch (err) {
      console.error('Delete failed:', err);
      setShareToast('❌ Failed to delete');
      setTimeout(() => setShareToast(''), 3000);
    }
  };

  // Edit post — open modal with prefilled data
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setPostText(post.text || '');
    setPostCategory(post.category || '');
    setPostStory(post.story || '');
    if (post.imageUrl) {
      setImagePreview(post.imageUrl);
    }
    setShowModal(true);
  };

  const handleLike = async (postId: string, likes: string[]) => {
    if (!visitor || !authUid) { onVisitorLoginClick(); return; }
    const postRef = doc(db, 'community_posts', postId);
    if (likes.includes(authUid)) {
      await updateDoc(postRef, { likes: arrayRemove(authUid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(authUid) });
    }
  };

  const handleComment = async (postId: string) => {
    if (!visitor || !authUid) { onVisitorLoginClick(); return; }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    const postRef = doc(db, 'community_posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;
    const existing: CommentItem[] = snap.data().comments || [];
    await updateDoc(postRef, {
      comments: [
        ...existing,
        {
          userId: authUid,
          username: visitor.displayName,
          text,
          timestamp: new Date().toISOString(),
          avatarUrl: visitor.avatarUrl || '',
          avatarColor: visitor.avatarColor || '#4ECDC4',
          spiritAnimal: visitor.avatarAnimal || '',
        },
      ],
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleStory = (postId: string) => {
    setExpandedStories((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const formatTime = (ts: any): string => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts.toDate());
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    } catch { return 'Just now'; }
  };

  const getCategoryLabel = (cat?: string) => {
    if (!cat) return null;
    const found = POST_CATEGORIES.find(c => c.value === cat);
    return found ? found.label : null;
  };

  // Share handlers
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(communityUrl);
      setShareToast('✅ Link copied!');
      setTimeout(() => setShareToast(''), 2500);
    } catch {
      window.prompt('Copy this link:', communityUrl);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `🌿 Join WildSaura Community! Share your love for wildlife and nature photography 📸\n${communityUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleTwitterShare = () => {
    const text = `🌿 Join WildSaura Community! Wildlife & nature photography lovers unite 📸🐯`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(communityUrl)}`, '_blank');
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(communityUrl)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WildSaura Community 🌿',
          text: 'Join WildSaura Community! Share your love for wildlife and nature photography 📸',
          url: communityUrl,
        });
      } catch {}
    }
  };

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'var(--wa-bg, #0b0c0e)', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif" },

    // ── Community Header (Glassmorphism) ──
    communityHeader: {
      position: 'sticky' as const,
      top: 0,
      zIndex: 100,
      background: 'rgba(11,12,14,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(212,163,115,0.12)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      padding: '0.7rem 1rem',
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: 700,
      margin: '0 auto',
      width: '100%',
      gap: '0.5rem',
      flexWrap: 'wrap' as const,
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      minWidth: 0,
      flex: '1 1 auto',
    },
    backArrow: {
      background: 'none',
      border: 'none',
      color: '#d4a373',
      cursor: 'pointer',
      fontSize: '1.2rem',
      padding: '0.3rem',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
    },
    headerTitle: {
      fontSize: '1.05rem',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #d4a373, #e9c46a)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    memberBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      background: 'rgba(233,196,106,0.1)',
      border: '1px solid rgba(233,196,106,0.2)',
      borderRadius: 20,
      padding: '0.2rem 0.6rem',
      fontSize: '0.78rem',
      color: '#e9c46a',
      fontWeight: 600,
      whiteSpace: 'nowrap' as const,
      flexShrink: 0,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      flexShrink: 0,
    },
    headerBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
      border: 'none',
      borderRadius: 20,
      padding: '0.35rem 0.7rem',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: 600,
      whiteSpace: 'nowrap' as const,
      transition: 'all 0.2s',
    },
    joinHeaderBtn: {
      background: 'linear-gradient(135deg, #d4a373, #e9c46a)',
      color: '#0b0c0e',
    },
    joinedHeaderBadge: {
      background: 'rgba(76,205,196,0.12)',
      border: '1px solid rgba(76,205,196,0.3)',
      color: '#4ECDC4',
    },
    newPostHeaderBtn: {
      background: 'rgba(212,163,115,0.15)',
      border: '1px solid rgba(212,163,115,0.3)',
      color: '#d4a373',
    },
    shareHeaderBtn: {
      background: 'rgba(212,163,115,0.1)',
      border: '1px solid rgba(212,163,115,0.25)',
      color: '#d4a373',
    },

    // ── Feed ──
    feed: { flex: 1, maxWidth: 700, margin: '0 auto', width: '100%', padding: '1rem 1rem 3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },

    // Guest Banner
    guestBanner: { background: 'rgba(212,163,115,0.1)', border: '1px solid rgba(212,163,115,0.3)', borderRadius: 14, padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column' as const, gap: '0.8rem', alignItems: 'center', textAlign: 'center' as const },
    guestTitle: { color: '#e9c46a', fontWeight: 700, fontSize: '1.1rem' },
    guestText: { color: '#b0b5c0', fontSize: '0.9rem', lineHeight: 1.5 },
    guestActions: { display: 'flex', gap: '0.8rem', flexWrap: 'wrap' as const, justifyContent: 'center' },
    loginBtn: { background: 'linear-gradient(135deg, #d4a373, #e9c46a)', color: '#0b0c0e', fontWeight: 700, cursor: 'pointer', border: 'none', padding: '0.6rem 1.6rem', borderRadius: 30, fontSize: '0.95rem' },
    loginLink: { color: '#d4a373', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem', background: 'none', border: 'none' },

    card: { background: '#16181c', borderRadius: 18, padding: '1.2rem', border: '1px solid #262a31', position: 'relative' as const },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' },
    username: { fontWeight: 600, fontSize: '1rem', color: '#e4e4e7' },
    timestamp: { fontSize: '0.75rem', color: '#8a8f98' },
    categoryTag: {
      display: 'inline-block',
      fontSize: '0.7rem',
      fontWeight: 600,
      background: 'rgba(212,163,115,0.15)',
      color: '#d4a373',
      padding: '0.15rem 0.5rem',
      borderRadius: 10,
      marginLeft: '0.4rem',
    },
    postText: { margin: '0.5rem 0 0.8rem', fontSize: '1rem', lineHeight: 1.6, color: '#d1d5db', whiteSpace: 'pre-wrap' },
    storySection: {
      background: 'rgba(233,196,106,0.06)',
      border: '1px solid rgba(233,196,106,0.15)',
      borderRadius: 12,
      padding: '0.7rem 1rem',
      marginBottom: '0.8rem',
    },
    storyToggle: {
      background: 'none',
      border: 'none',
      color: '#e9c46a',
      fontWeight: 600,
      fontSize: '0.85rem',
      cursor: 'pointer',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
    },
    storyText: {
      color: '#b0b5c0',
      fontSize: '0.9rem',
      lineHeight: 1.5,
      marginTop: '0.4rem',
      whiteSpace: 'pre-wrap' as const,
    },
    postImage: { width: '100%', borderRadius: 14, marginBottom: '1rem', maxHeight: 500, objectFit: 'cover' as const },
    actions: { display: 'flex', alignItems: 'center', gap: '1.8rem', paddingTop: '0.8rem', borderTop: '1px solid #252830' },
    actionBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#a1a5b0', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 },
    commentSection: { marginTop: '1rem' },
    commentList: { listStyle: 'none', padding: 0, maxHeight: 200, overflowY: 'auto' as const, marginBottom: '0.8rem' },
    commentItem: { padding: '0.5rem 0', borderBottom: '1px solid #23262e', fontSize: '0.9rem', color: '#d1d5db', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' },
    commentUser: { fontWeight: 600, color: '#d4a373', marginRight: 6 },
    commentInputArea: { display: 'flex', gap: 8, alignItems: 'center' },
    commentInput: { flex: 1, background: '#1f2126', border: '1px solid #2e323a', borderRadius: 20, padding: '0.6rem 1rem', color: '#e4e4e7', outline: 'none', fontSize: '0.9rem' },
    commentSubmitBtn: { background: '#d4a373', color: '#0b0c0e', border: 'none', borderRadius: 20, padding: '0.5rem 1.2rem', fontWeight: 700, cursor: 'pointer' },
    emptyState: { textAlign: 'center', padding: '3rem 1rem', color: '#6b7280', fontSize: '1rem' },

    // Three-dot menu
    menuBtn: {
      position: 'absolute' as const,
      top: '1rem',
      right: '1rem',
      background: 'none',
      border: 'none',
      color: '#8a8f98',
      fontSize: '1.2rem',
      cursor: 'pointer',
      padding: '0.2rem 0.4rem',
      borderRadius: 8,
      lineHeight: 1,
    },
    menuDropdown: {
      position: 'absolute' as const,
      top: '2.5rem',
      right: '1rem',
      background: '#1f2126',
      border: '1px solid #2e323a',
      borderRadius: 12,
      padding: '0.3rem 0',
      zIndex: 50,
      minWidth: 120,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    },
    menuItem: {
      display: 'block',
      width: '100%',
      background: 'none',
      border: 'none',
      color: '#e4e4e7',
      padding: '0.6rem 1rem',
      fontSize: '0.85rem',
      cursor: 'pointer',
      textAlign: 'left' as const,
    },
    menuItemDanger: {
      color: '#e76f51',
    },

    // Modals
    overlay: { position: 'fixed' as const, top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
    modal: { background: '#16181c', width: '90%', maxWidth: 520, borderRadius: 24, padding: '2rem', border: '1px solid #2e323a', maxHeight: '90vh', overflowY: 'auto' as const },
    modalTitle: { marginBottom: '1.5rem', fontWeight: 700, color: '#d4a373', fontSize: '1.3rem' },
    label: { display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: '#b0b5c0', fontSize: '0.9rem' },
    textarea: { width: '100%', background: '#1f2126', border: '1px solid #2e323a', borderRadius: 14, padding: '0.8rem', color: '#e4e4e7', resize: 'vertical' as const, fontFamily: 'inherit', fontSize: '1rem', marginBottom: '1.2rem', outline: 'none', boxSizing: 'border-box' as const },
    selectInput: {
      width: '100%',
      background: '#1f2126',
      border: '1px solid #2e323a',
      borderRadius: 14,
      padding: '0.7rem 0.8rem',
      color: '#e4e4e7',
      fontSize: '0.95rem',
      marginBottom: '1.2rem',
      outline: 'none',
      boxSizing: 'border-box' as const,
      appearance: 'none' as const,
      cursor: 'pointer',
    },
    fileUploadBtn: { display: 'flex', alignItems: 'center', gap: 8, background: '#1f2126', border: '1px dashed #3a3f4a', borderRadius: 14, padding: '0.8rem 1.2rem', color: '#a1a5b0', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.2rem', width: '100%', justifyContent: 'center' },
    imagePreviewBox: { position: 'relative' as const, marginBottom: '1.2rem' },
    previewImg: { width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover' as const },
    removeImgBtn: { position: 'absolute' as const, top: 8, right: 8, background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalActions: { display: 'flex', gap: '1rem', justifyContent: 'flex-end' },
    cancelBtn: { background: '#1f2126', border: 'none', color: '#e4e4e7', padding: '0.6rem 1.4rem', borderRadius: 30, fontWeight: 600, cursor: 'pointer' },
    submitBtn: { background: '#d4a373', color: '#0b0c0e', border: 'none', padding: '0.6rem 1.6rem', borderRadius: 30, fontWeight: 700, cursor: 'pointer' },
    progressBar: {
      background: 'rgba(76,205,196,0.12)',
      border: '1px solid rgba(76,205,196,0.3)',
      borderRadius: 10,
      padding: '0.5rem 1rem',
      color: '#4ECDC4',
      fontSize: '0.85rem',
      fontWeight: 600,
      marginBottom: '1rem',
      textAlign: 'center' as const,
    },

    // Share Modal
    shareModal: { background: '#16181c', width: '90%', maxWidth: 420, borderRadius: 24, padding: '2rem', border: '1px solid #2e323a', textAlign: 'center' as const },
    shareTitle: { marginBottom: '0.5rem', fontWeight: 700, color: '#d4a373', fontSize: '1.3rem' },
    shareSubtitle: { color: '#8a8f98', fontSize: '0.9rem', marginBottom: '1.5rem' },
    qrContainer: { display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' },
    shareGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.2rem' },
    shareOption: {
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      background: '#1f2126', border: '1px solid #2e323a', borderRadius: 14,
      padding: '0.8rem 1rem', cursor: 'pointer', color: '#e4e4e7',
      fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s',
    },
    shareOptionIcon: { fontSize: '1.3rem', width: 28, textAlign: 'center' as const },
    linkPreview: {
      background: '#1f2126', border: '1px solid #2e323a', borderRadius: 12,
      padding: '0.7rem 1rem', color: '#8a8f98', fontSize: '0.8rem',
      marginBottom: '1.2rem', wordBreak: 'break-all' as const, textAlign: 'left' as const,
    },

    // Members Modal
    membersModal: {
      background: '#16181c', width: '90%', maxWidth: 420, borderRadius: 24,
      padding: '1.5rem', border: '1px solid #2e323a', maxHeight: '80vh', display: 'flex', flexDirection: 'column' as const,
    },
    membersTitle: { fontWeight: 700, color: '#d4a373', fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'center' as const },
    membersList: {
      flex: 1, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '0.5rem',
    },
    memberItem: {
      display: 'flex', alignItems: 'center', gap: '0.7rem',
      background: '#1f2126', borderRadius: 12, padding: '0.6rem 0.8rem',
    },
    memberName: { fontWeight: 600, color: '#e4e4e7', fontSize: '0.95rem' },
    memberJoined: { color: '#8a8f98', fontSize: '0.75rem' },
    membersCount: { textAlign: 'center' as const, color: '#8a8f98', fontSize: '0.85rem', marginBottom: '1rem' },

    toast: {
      position: 'fixed' as const, bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
      background: '#1a1a1a', color: '#4ECDC4', border: '1px solid rgba(76,205,196,0.4)',
      borderRadius: 10, padding: '0.7rem 1.4rem', fontSize: '0.9rem', fontWeight: 600,
      zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    },
  };

  return (
    <div style={s.page}>
      {/* ── Top Nav Strip ── */}
      <div style={{ background: 'rgba(5,6,8,0.95)', borderBottom: '1px solid rgba(212,163,115,0.08)', padding: '0.35rem 1rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {NAV_SITES.map(site => (
              <a key={site.href} href={site.href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#8a8f98', fontSize: '0.72rem', fontWeight: 500, textDecoration: 'none', padding: '0.2rem 0.55rem', borderRadius: 20 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d4a373'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8a8f98'; }}>
                <span>{site.emoji}</span> {site.label}
              </a>
            ))}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'rgba(212,163,115,0.45)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>wildsaura.com</span>
        </div>
      </div>

      {/* ── Community Header (Glassmorphism) ── */}
      <div style={s.communityHeader}>
        <div style={s.headerRow}>
          <div style={s.headerLeft}>
            <button style={s.backArrow} onClick={onBack} title="Back to Home">←</button>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #1a1200, #2e1f00)', border: '1.5px solid rgba(212,163,115,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🌿</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, background: 'linear-gradient(135deg, #d4a373 0%, #e9c46a 50%, #d4a373 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', whiteSpace: 'nowrap' as const }}>WildSaura</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(212,163,115,0.5)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Community</div>
            </div>
            <div style={s.memberBadge} onClick={() => setShowMembersModal(true)} title="View members">
              <span>👥</span><span>{memberCount}</span>
            </div>
          </div>

          <div style={s.headerRight}>
            {visitor ? (
              isMember ? (
                <span style={{ ...s.headerBtn, ...s.joinedHeaderBadge }}>✅ Member</span>
              ) : (
                <button
                  style={{ ...s.headerBtn, ...s.joinHeaderBtn, opacity: joining ? 0.7 : 1 }}
                  onClick={handleJoinCommunity}
                  disabled={joining}
                >
                  {joining ? '...' : '🤝 Join'}
                </button>
              )
            ) : (
              <button style={{ ...s.headerBtn, ...s.joinHeaderBtn }} onClick={onVisitorLoginClick}>
                🔑 Login
              </button>
            )}
            <button
              style={{ ...s.headerBtn, ...s.newPostHeaderBtn }}
              onClick={() => requireLogin(() => setShowModal(true))}
            >
              ✏️ Post
            </button>
            <button
              style={{ ...s.headerBtn, ...s.shareHeaderBtn }}
              onClick={() => setShowShareModal(true)}
            >
              📤
            </button>
          </div>
        </div>
      </div>

      <div style={s.feed}>
        {/* Guest banner */}
        {!visitor && (
          <div style={s.guestBanner}>
            <div style={s.guestTitle}>🌍 Welcome to WildSaura Community!</div>
            <div style={s.guestText}>
              Browse posts freely — no login needed! 🎉<br />
              Join to post, like, comment, and connect with wildlife lovers.
            </div>
            <div style={s.guestActions}>
              <button style={s.loginBtn} onClick={onVisitorLoginClick}>
                🔑 Login to Join
              </button>
              <button style={{ ...s.headerBtn, ...s.shareHeaderBtn, padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => setShowShareModal(true)}>
                📤 Share with Friends
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={s.emptyState}>✨ Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={s.emptyState}>🌿 No posts yet. Be the first to share!</div>
        ) : (
          posts.map((post) => {
            const liked = authUid ? post.likes?.includes(authUid) : false;
            const likeCount = post.likes?.length || 0;
            const commentCount = post.comments?.length || 0;
            const showComments = openComments.has(post.id);
            const isOwner = authUid && post.userId === authUid;
            const displayUsername = (isOwner && visitor)
              ? visitor.displayName
              : (post.username || 'Anonymous');

            const postAvatarUrl = (isOwner && visitor)
              ? visitor.avatarUrl
              : post.avatarUrl;
            const postAvatarColor = (isOwner && visitor)
              ? visitor.avatarColor
              : (post.avatarColor || '#4ECDC4');
            const postSpiritAnimal = (isOwner && visitor)
              ? visitor.avatarAnimal
              : post.spiritAnimal;

            const catLabel = getCategoryLabel(post.category);

            return (
              <div key={post.id} style={s.card}>
                {/* Three-dot menu for own posts */}
                {isOwner && (
                  <>
                    <button
                      style={s.menuBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id);
                      }}
                    >
                      ⋮
                    </button>
                    {menuOpenPostId === post.id && (
                      <div style={s.menuDropdown} onClick={(e) => e.stopPropagation()}>
                        <button
                          style={s.menuItem}
                          onClick={() => { setMenuOpenPostId(null); handleEditPost(post); }}
                        >
                          ✏️ Edit Post
                        </button>
                        <button
                          style={{ ...s.menuItem, ...s.menuItemDanger }}
                          onClick={() => { setMenuOpenPostId(null); handleDeletePost(post.id); }}
                        >
                          🗑️ Delete Post
                        </button>
                      </div>
                    )}
                  </>
                )}

                <div style={s.cardHeader}>
                  <AvatarDisplay
                    displayName={displayUsername}
                    avatarUrl={postAvatarUrl}
                    spiritAnimal={postSpiritAnimal}
                    avatarColor={postAvatarColor}
                    size={42}
                    showBorder={true}
                  />
                  <div>
                    <div style={s.username}>
                      {displayUsername}
                      {catLabel && <span style={s.categoryTag}>{catLabel}</span>}
                    </div>
                    <div style={s.timestamp}>{formatTime(post.timestamp)}</div>
                  </div>
                </div>

                {post.text && <div style={s.postText}>{post.text}</div>}

                {/* Story behind the photo */}
                {post.story && (
                  <div style={s.storySection}>
                    <button style={s.storyToggle} onClick={() => toggleStory(post.id)}>
                      📖 Story behind this photo {expandedStories.has(post.id) ? '▲' : '▼'}
                    </button>
                    {expandedStories.has(post.id) && (
                      <div style={s.storyText}>{post.story}</div>
                    )}
                  </div>
                )}

                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    style={s.postImage}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}

                <div style={s.actions}>
                  <button
                    style={{ ...s.actionBtn, color: liked ? '#e76f51' : '#a1a5b0' }}
                    onClick={() => handleLike(post.id, post.likes || [])}
                    title={!visitor ? 'Login to like' : ''}
                  >
                    <span>{liked ? '❤️' : '🤍'}</span>
                    <span>{likeCount}</span>
                  </button>
                  <button
                    style={s.actionBtn}
                    onClick={() => toggleComments(post.id)}
                  >
                    💬 <span>{commentCount}</span>
                  </button>
                </div>

                {showComments && (
                  <div style={s.commentSection}>
                    <ul style={s.commentList}>
                      {(post.comments || []).map((c, i) => {
                        const isCommentOwner = authUid && c.userId === authUid;
                        const commentAvatarUrl = (isCommentOwner && visitor)
                          ? visitor.avatarUrl
                          : c.avatarUrl;
                        const commentAvatarColor = (isCommentOwner && visitor)
                          ? visitor.avatarColor
                          : (c.avatarColor || '#4ECDC4');
                        const commentSpiritAnimal = (isCommentOwner && visitor)
                          ? visitor.avatarAnimal
                          : c.spiritAnimal;
                        const commentDisplayName = (isCommentOwner && visitor)
                          ? visitor.displayName
                          : (c.username || 'Anonymous');

                        return (
                          <li key={i} style={s.commentItem}>
                            <AvatarDisplay
                              displayName={commentDisplayName}
                              avatarUrl={commentAvatarUrl}
                              spiritAnimal={commentSpiritAnimal}
                              avatarColor={commentAvatarColor}
                              size={28}
                              showBorder={false}
                            />
                            <div>
                              <span style={s.commentUser}>{commentDisplayName}</span>
                              {c.text}
                            </div>
                          </li>
                        );
                      })}
                      {(post.comments || []).length === 0 && (
                        <li style={{ padding: '0.5rem 0', color: '#555', fontSize: '0.9rem' }}>No comments yet.</li>
                      )}
                    </ul>
                    {visitor ? (
                      <div style={s.commentInputArea}>
                        <AvatarDisplay
                          displayName={visitor.displayName}
                          avatarUrl={visitor.avatarUrl}
                          spiritAnimal={visitor.avatarAnimal}
                          avatarColor={visitor.avatarColor}
                          size={28}
                          showBorder={false}
                        />
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => { if (e.key === 'Enter') handleComment(post.id); }}
                          style={s.commentInput}
                        />
                        <button style={s.commentSubmitBtn} onClick={() => handleComment(post.id)}>Post</button>
                      </div>
                    ) : (
                      <button style={{ ...s.loginLink, display: 'block', textAlign: 'left', padding: '0.4rem 0', background: 'none', border: 'none' }} onClick={onVisitorLoginClick}>
                        🔑 Login to comment
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Footer logoUrl={logoUrl} onTermsClick={onTermsClick} />

      {/* New/Edit Post Modal */}
      {showModal && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) resetModal(); }}>
          <div style={s.modal}>
            <div style={s.modalTitle}>
              {editingPost ? '✏️ Edit Post' : '🌿 Create Post'}
            </div>

            <label style={s.label}>Caption / Text</label>
            <textarea
              rows={3}
              placeholder="Write something about wildlife..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              style={s.textarea}
            />

            <label style={s.label}>Category</label>
            <select
              value={postCategory}
              onChange={(e) => setPostCategory(e.target.value)}
              style={s.selectInput}
            >
              {POST_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <label style={s.label}>📖 Story Behind the Photo (optional)</label>
            <textarea
              rows={3}
              placeholder="Share the story — where was this taken? What happened? Any interesting facts?"
              value={postStory}
              onChange={(e) => setPostStory(e.target.value)}
              style={s.textarea}
            />

            <label style={s.label}>Photo</label>
            {imagePreview ? (
              <div style={s.imagePreviewBox}>
                <img src={imagePreview} alt="Preview" style={s.previewImg} />
                <button
                  style={s.removeImgBtn}
                  onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >✕</button>
              </div>
            ) : (
              <button style={s.fileUploadBtn} onClick={() => fileInputRef.current?.click()}>
                📷 Choose Photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/heic,image/heif,.heic,.heif"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />

            {uploadProgress && (
              <div style={s.progressBar}>{uploadProgress}</div>
            )}

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={resetModal}>Cancel</button>
              <button
                style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleSubmitPost}
                disabled={submitting}
              >
                {submitting ? 'Posting...' : (editingPost ? 'Save ✏️' : 'Post 🌿')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowMembersModal(false); }}>
          <div style={s.membersModal}>
            <div style={s.membersTitle}>👥 Community Members</div>
            <div style={s.membersCount}>{memberCount} {memberCount === 1 ? 'member' : 'members'} joined</div>
            <div style={s.membersList}>
              {members.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
                  No members yet. Be the first to join! 🌿
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.userId} style={s.memberItem}>
                    <AvatarDisplay
                      displayName={m.displayName || 'User'}
                      avatarUrl={m.avatarUrl}
                      spiritAnimal={m.spiritAnimal}
                      avatarColor={m.avatarColor}
                      size={36}
                      showBorder={false}
                    />
                    <div>
                      <div style={s.memberName}>{m.displayName || 'User'}</div>
                      <div style={s.memberJoined}>
                        {m.joinedAt ? `Joined ${formatTime(m.joinedAt)}` : 'Member'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button style={s.cancelBtn} onClick={() => setShowMembersModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
          <div style={s.shareModal}>
            <div style={s.shareTitle}>📤 Share Community</div>
            <div style={s.shareSubtitle}>Invite friends to join WildSaura Community!</div>

            <div style={s.qrContainer}>
              <QRCode url={communityUrl} size={160} />
            </div>

            <div style={s.shareGrid}>
              <button
                style={s.shareOption}
                onClick={handleCopyLink}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#d4a373'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2e323a'; }}
              >
                <span style={s.shareOptionIcon}>🔗</span> Copy Link
              </button>
              <button
                style={s.shareOption}
                onClick={handleWhatsAppShare}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#25D366'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2e323a'; }}
              >
                <span style={s.shareOptionIcon}>💬</span> WhatsApp
              </button>
              <button
                style={s.shareOption}
                onClick={handleTwitterShare}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1DA1F2'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2e323a'; }}
              >
                <span style={s.shareOptionIcon}>🐦</span> Twitter / X
              </button>
              <button
                style={s.shareOption}
                onClick={handleFacebookShare}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#4267B2'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2e323a'; }}
              >
                <span style={s.shareOptionIcon}>📘</span> Facebook
              </button>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                style={{ ...s.shareOption, justifyContent: 'center', marginBottom: '1rem' }}
                onClick={handleNativeShare}
              >
                <span style={s.shareOptionIcon}>📱</span> More Options...
              </button>
            )}

            <div style={s.linkPreview}>
              🔗 {communityUrl}
            </div>

            <button
              style={s.cancelBtn}
              onClick={() => setShowShareModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {shareToast && <div style={s.toast}>{shareToast}</div>}
    </div>
  );
}
