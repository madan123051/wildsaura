import React, { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, orderBy, query,
  doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Header } from './Header';
import { Footer } from './Footer';
import { Visitor } from '../types';

interface Post {
  id: string;
  userId: string;
  username: string;
  text: string;
  imageUrl: string | null;
  timestamp: any;
  likes: string[];
  comments: CommentItem[];
}

interface CommentItem {
  userId: string;
  username: string;
  text: string;
  timestamp: string;
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
  const [postText, setPostText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track Firebase auth state for uid
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  // Load posts — no login required
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
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const resetModal = () => {
    setPostText('');
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowModal(false);
  };

  const handleSubmitPost = async () => {
    if (!postText.trim() && !imageFile) return;
    if (!visitor || !authUid) { onVisitorLoginClick(); return; }
    setSubmitting(true);
    try {
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const sRef = storageRef(storage, `community_posts/${authUid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(sRef, imageFile);
        uploadedImageUrl = await getDownloadURL(snapshot.ref);
      }
      await addDoc(collection(db, 'community_posts'), {
        userId: authUid,
        username: visitor.displayName,
        text: postText.trim(),
        imageUrl: uploadedImageUrl,
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
      });
      resetModal();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
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

  const formatTime = (ts: any): string => {
    if (!ts) return 'Just now';
    try { return new Date(ts.toDate()).toLocaleString(); }
    catch { return 'Just now'; }
  };

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'var(--wa-bg, #0b0c0e)', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif" },
    feed: { flex: 1, maxWidth: 700, margin: '0 auto', width: '100%', padding: '8rem 1rem 3rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' },
    topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' },
    backBtn: { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#d4a373', borderRadius: 8, padding: '0.55rem 0.85rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
    title: { fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg, #d4a373, #e9c46a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    newPostBtn: { background: '#d4a373', color: '#0b0c0e', border: 'none', padding: '0.6rem 1.4rem', borderRadius: 30, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' },
    // Guest Banner
    guestBanner: { background: 'rgba(212,163,115,0.1)', border: '1px solid rgba(212,163,115,0.3)', borderRadius: 14, padding: '0.85rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' as const },
    guestText: { color: '#b0b5c0', fontSize: '0.9rem' },
    loginLink: { color: '#d4a373', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem', background: 'none', border: 'none' },
    card: { background: '#16181c', borderRadius: 18, padding: '1.2rem', border: '1px solid #262a31' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' },
    avatar: { width: 42, height: 42, borderRadius: '50%', background: '#2a2d35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1.1rem', color: '#d4a373', flexShrink: 0 },
    username: { fontWeight: 600, fontSize: '1rem', color: '#e4e4e7' },
    timestamp: { fontSize: '0.75rem', color: '#8a8f98' },
    postText: { margin: '0.8rem 0 1rem', fontSize: '1rem', lineHeight: 1.6, color: '#d1d5db', whiteSpace: 'pre-wrap' },
    postImage: { width: '100%', borderRadius: 14, marginBottom: '1rem', maxHeight: 500, objectFit: 'cover' as const },
    actions: { display: 'flex', alignItems: 'center', gap: '1.8rem', paddingTop: '0.8rem', borderTop: '1px solid #252830' },
    actionBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#a1a5b0', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 },
    commentSection: { marginTop: '1rem' },
    commentList: { listStyle: 'none', padding: 0, maxHeight: 200, overflowY: 'auto' as const, marginBottom: '0.8rem' },
    commentItem: { padding: '0.5rem 0', borderBottom: '1px solid #23262e', fontSize: '0.9rem', color: '#d1d5db' },
    commentUser: { fontWeight: 600, color: '#d4a373', marginRight: 6 },
    commentInputArea: { display: 'flex', gap: 8 },
    commentInput: { flex: 1, background: '#1f2126', border: '1px solid #2e323a', borderRadius: 20, padding: '0.6rem 1rem', color: '#e4e4e7', outline: 'none', fontSize: '0.9rem' },
    commentSubmitBtn: { background: '#d4a373', color: '#0b0c0e', border: 'none', borderRadius: 20, padding: '0.5rem 1.2rem', fontWeight: 700, cursor: 'pointer' },
    emptyState: { textAlign: 'center', padding: '3rem 1rem', color: '#6b7280', fontSize: '1rem' },
    overlay: { position: 'fixed' as const, top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
    modal: { background: '#16181c', width: '90%', maxWidth: 520, borderRadius: 24, padding: '2rem', border: '1px solid #2e323a' },
    modalTitle: { marginBottom: '1.5rem', fontWeight: 700, color: '#d4a373', fontSize: '1.3rem' },
    label: { display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: '#b0b5c0', fontSize: '0.9rem' },
    textarea: { width: '100%', background: '#1f2126', border: '1px solid #2e323a', borderRadius: 14, padding: '0.8rem', color: '#e4e4e7', resize: 'vertical' as const, fontFamily: 'inherit', fontSize: '1rem', marginBottom: '1.2rem', outline: 'none', boxSizing: 'border-box' as const },
    fileUploadBtn: { display: 'flex', alignItems: 'center', gap: 8, background: '#1f2126', border: '1px dashed #3a3f4a', borderRadius: 14, padding: '0.8rem 1.2rem', color: '#a1a5b0', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.2rem', width: '100%', justifyContent: 'center' },
    imagePreviewBox: { position: 'relative' as const, marginBottom: '1.2rem' },
    previewImg: { width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover' as const },
    removeImgBtn: { position: 'absolute' as const, top: 8, right: 8, background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalActions: { display: 'flex', gap: '1rem', justifyContent: 'flex-end' },
    cancelBtn: { background: '#1f2126', border: 'none', color: '#e4e4e7', padding: '0.6rem 1.4rem', borderRadius: 30, fontWeight: 600, cursor: 'pointer' },
    submitBtn: { background: '#d4a373', color: '#0b0c0e', border: 'none', padding: '0.6rem 1.6rem', borderRadius: 30, fontWeight: 700, cursor: 'pointer' },
  };

  return (
    <div style={s.page}>
      <Header
        onScrollToGallery={onScrollToGallery}
        logoUrl={logoUrl}
        onSearchClick={onSearchClick}
        visitor={visitor}
        onVisitorLoginClick={onVisitorLoginClick}
        onVisitorLogout={onVisitorLogout}
        onVisitorUpdate={onVisitorUpdate}
        onStoriesClick={onStoriesClick}
        notificationCount={notificationCount}
        onNotificationClick={onNotificationClick}
        isAdmin={isAdmin}
        onAdminClick={onAdminClick}
        onProfileClick={onProfileClick}
      />

      <div style={s.feed}>
        {/* Top bar */}
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={onBack}>← Back</button>
          <span style={s.title}>🌿 WildSaura Community</span>
          <button
            style={s.newPostBtn}
            onClick={() => requireLogin(() => setShowModal(true))}
          >
            + New Post
          </button>
        </div>

        {/* Guest banner — visible only when not logged in */}
        {!visitor && (
          <div style={s.guestBanner}>
            <span style={s.guestText}>👀 You're browsing as a guest — posts are public!</span>
            <button style={s.loginLink} onClick={onVisitorLoginClick}>
              Login to post, like &amp; comment →
            </button>
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
            // Show current displayName for own posts so it stays in sync with the profile
            const displayUsername = (authUid && post.userId === authUid && visitor)
              ? visitor.displayName
              : (post.username || 'Anonymous');

            return (
              <div key={post.id} style={s.card}>
                <div style={s.cardHeader}>
                  <div style={s.avatar}>
                    {(displayUsername).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={s.username}>{displayUsername}</div>
                    <div style={s.timestamp}>{formatTime(post.timestamp)}</div>
                  </div>
                </div>

                {post.text && <div style={s.postText}>{post.text}</div>}
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    style={s.postImage}
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
                      {(post.comments || []).map((c, i) => (
                        <li key={i} style={s.commentItem}>
                          <span style={s.commentUser}>{c.username || 'Anonymous'}</span>
                          {c.text}
                        </li>
                      ))}
                      {(post.comments || []).length === 0 && (
                        <li style={{ ...s.commentItem, color: '#555', border: 'none' }}>No comments yet.</li>
                      )}
                    </ul>
                    {visitor ? (
                      <div style={s.commentInputArea}>
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

      {/* New Post Modal */}
      {showModal && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) resetModal(); }}>
          <div style={s.modal}>
            <div style={s.modalTitle}>🌿 Create Post</div>

            <label style={s.label}>Caption / Text</label>
            <textarea
              rows={3}
              placeholder="Write something about wildlife..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              style={s.textarea}
            />

            <label style={s.label}>Photo (optional)</label>
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
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={resetModal}>Cancel</button>
              <button
                style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleSubmitPost}
                disabled={submitting}
              >
                {submitting ? 'Posting...' : 'Post 🌿'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
