import React, { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, orderBy, query,
  doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
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
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
}: CommunityPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [postText, setPostText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Anonymous sign-in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsub();
  }, []);

  // Load posts
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

  const handleSubmitPost = async () => {
    if (!postText.trim() && !imageUrl.trim()) return;
    if (!userId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'community_posts'), {
        userId,
        username: 'Explorer_' + userId.substring(0, 5),
        text: postText.trim(),
        imageUrl: imageUrl.trim() || null,
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
      });
      setPostText('');
      setImageUrl('');
      setShowModal(false);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleLike = async (postId: string, likes: string[]) => {
    if (!userId) return;
    const ref = doc(db, 'community_posts', postId);
    if (likes.includes(userId)) {
      await updateDoc(ref, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(userId) });
    }
  };

  const handleComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text || !userId) return;
    const ref = doc(db, 'community_posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const existing: CommentItem[] = snap.data().comments || [];
    await updateDoc(ref, {
      comments: [
        ...existing,
        {
          userId,
          username: 'Explorer_' + userId.substring(0, 5),
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

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      background: 'var(--wa-bg)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
    },
    feed: {
      flex: 1,
      maxWidth: 700,
      margin: '0 auto',
      width: '100%',
      padding: '8rem 1rem 3rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.8rem',
    },
    topBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1.5rem',
    },
    backBtn: {
      background: 'rgba(201,168,76,0.15)',
      border: '1px solid rgba(201,168,76,0.35)',
      color: 'var(--wa-gold)',
      borderRadius: 8,
      padding: '0.55rem 0.85rem',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '0.9rem',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #d4a373, #e9c46a)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    newPostBtn: {
      background: '#d4a373',
      color: '#0b0c0e',
      border: 'none',
      padding: '0.6rem 1.4rem',
      borderRadius: 30,
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: '0.95rem',
    },
    card: {
      background: '#16181c',
      borderRadius: 18,
      padding: '1.2rem',
      border: '1px solid #262a31',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      marginBottom: '0.8rem',
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: '50%',
      background: '#2a2d35',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: '1.1rem',
      color: '#d4a373',
      flexShrink: 0,
    },
    username: { fontWeight: 600, fontSize: '1rem', color: '#e4e4e7' },
    timestamp: { fontSize: '0.75rem', color: '#8a8f98' },
    postText: {
      margin: '0.8rem 0 1rem',
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#d1d5db',
      whiteSpace: 'pre-wrap',
    },
    postImage: {
      width: '100%',
      borderRadius: 14,
      marginBottom: '1rem',
      maxHeight: 500,
      objectFit: 'cover' as const,
    },
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: '1.8rem',
      paddingTop: '0.8rem',
      borderTop: '1px solid #252830',
    },
    actionBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: 'none',
      border: 'none',
      color: '#a1a5b0',
      cursor: 'pointer',
      fontSize: '0.95rem',
      fontWeight: 500,
    },
    commentSection: {
      marginTop: '1rem',
    },
    commentList: {
      listStyle: 'none',
      padding: 0,
      maxHeight: 200,
      overflowY: 'auto' as const,
      marginBottom: '0.8rem',
    },
    commentItem: {
      padding: '0.5rem 0',
      borderBottom: '1px solid #23262e',
      fontSize: '0.9rem',
      color: '#d1d5db',
    },
    commentUser: { fontWeight: 600, color: '#d4a373', marginRight: 6 },
    commentInputArea: { display: 'flex', gap: 8 },
    commentInput: {
      flex: 1,
      background: '#1f2126',
      border: '1px solid #2e323a',
      borderRadius: 20,
      padding: '0.6rem 1rem',
      color: '#e4e4e7',
      outline: 'none',
      fontSize: '0.9rem',
    },
    commentSubmitBtn: {
      background: '#d4a373',
      color: '#0b0c0e',
      border: 'none',
      borderRadius: 20,
      padding: '0.5rem 1.2rem',
      fontWeight: 700,
      cursor: 'pointer',
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#6b7280',
      fontSize: '1rem',
    },
    // Modal
    overlay: {
      position: 'fixed' as const,
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    },
    modal: {
      background: '#16181c',
      width: '90%',
      maxWidth: 500,
      borderRadius: 24,
      padding: '2rem',
      border: '1px solid #2e323a',
    },
    modalTitle: {
      marginBottom: '1.5rem',
      fontWeight: 700,
      color: '#d4a373',
      fontSize: '1.3rem',
    },
    label: {
      display: 'block',
      marginBottom: '0.4rem',
      fontWeight: 500,
      color: '#b0b5c0',
      fontSize: '0.9rem',
    },
    textarea: {
      width: '100%',
      background: '#1f2126',
      border: '1px solid #2e323a',
      borderRadius: 14,
      padding: '0.8rem',
      color: '#e4e4e7',
      resize: 'vertical' as const,
      fontFamily: 'inherit',
      fontSize: '1rem',
      marginBottom: '1.2rem',
      outline: 'none',
    },
    inputField: {
      width: '100%',
      background: '#1f2126',
      border: '1px solid #2e323a',
      borderRadius: 14,
      padding: '0.8rem',
      color: '#e4e4e7',
      fontFamily: 'inherit',
      fontSize: '1rem',
      marginBottom: '1.2rem',
      outline: 'none',
    },
    modalActions: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'flex-end',
    },
    cancelBtn: {
      background: '#1f2126',
      border: 'none',
      color: '#e4e4e7',
      padding: '0.6rem 1.4rem',
      borderRadius: 30,
      fontWeight: 600,
      cursor: 'pointer',
    },
    submitBtn: {
      background: '#d4a373',
      color: '#0b0c0e',
      border: 'none',
      padding: '0.6rem 1.4rem',
      borderRadius: 30,
      fontWeight: 700,
      cursor: 'pointer',
    },
  };

  const formatTime = (ts: any): string => {
    if (!ts) return 'Just now';
    try {
      return new Date(ts.toDate()).toLocaleString();
    } catch {
      return 'Just now';
    }
  };

  return (
    <div style={styles.page}>
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
      />

      <div style={styles.feed}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <button style={styles.backBtn} onClick={onBack}>← Back to Home</button>
          <span style={styles.title}>🌿 WildSaura Community</span>
          <button style={styles.newPostBtn} onClick={() => setShowModal(true)}>+ New Post</button>
        </div>

        {/* Feed */}
        {loading ? (
          <div style={styles.emptyState}>✨ Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={styles.emptyState}>🌿 No posts yet. Be the first to share!</div>
        ) : (
          posts.map((post) => {
            const liked = post.likes?.includes(userId || '');
            const likeCount = post.likes?.length || 0;
            const commentCount = post.comments?.length || 0;
            const showComments = openComments.has(post.id);

            return (
              <div key={post.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.avatar}>
                    {(post.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.username}>{post.username || 'Anonymous'}</div>
                    <div style={styles.timestamp}>{formatTime(post.timestamp)}</div>
                  </div>
                </div>

                {post.text && <div style={styles.postText}>{post.text}</div>}
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    style={styles.postImage}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}

                <div style={styles.actions}>
                  <button
                    style={{ ...styles.actionBtn, color: liked ? '#e76f51' : '#a1a5b0' }}
                    onClick={() => handleLike(post.id, post.likes || [])}
                  >
                    <span>{liked ? '❤️' : '🤍'}</span>
                    <span>{likeCount}</span>
                  </button>
                  <button
                    style={styles.actionBtn}
                    onClick={() => toggleComments(post.id)}
                  >
                    💬 <span>{commentCount}</span>
                  </button>
                </div>

                {showComments && (
                  <div style={styles.commentSection}>
                    <ul style={styles.commentList}>
                      {(post.comments || []).map((c, i) => (
                        <li key={i} style={styles.commentItem}>
                          <span style={styles.commentUser}>{c.username || 'Anonymous'}</span>
                          {c.text}
                        </li>
                      ))}
                    </ul>
                    <div style={styles.commentInputArea}>
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => { if (e.key === 'Enter') handleComment(post.id); }}
                        style={styles.commentInput}
                      />
                      <button
                        style={styles.commentSubmitBtn}
                        onClick={() => handleComment(post.id)}
                      >
                        Post
                      </button>
                    </div>
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
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>Create Post</div>

            <label style={styles.label}>Caption / Text</label>
            <textarea
              rows={3}
              placeholder="Write something about wildlife..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              style={styles.textarea}
            />

            <label style={styles.label}>Photo URL (optional)</label>
            <input
              type="text"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              style={styles.inputField}
            />

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => { setShowModal(false); setPostText(''); setImageUrl(''); }}>
                Cancel
              </button>
              <button
                style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleSubmitPost}
                disabled={submitting}
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
