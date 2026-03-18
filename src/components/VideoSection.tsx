import React, { useState } from 'react';
import { Play, Eye, Heart, ChevronDown, MapPin, MessageCircle, Share2, Send } from 'lucide-react';
import { Video, Comment, Visitor } from '../types';

interface VideoSectionProps {
  videos: Video[];
  visitor: Visitor | null;
  videoComments: Record<number, Comment[]>;
  onAddVideoComment: (videoId: number, content: string) => void;
  onVideoLike: (videoId: number) => void;
  onVisitorLoginClick: () => void;
}

const INITIAL_COUNT = 3;

/* ── tiny toast helper ────────────────────────────────────── */
const showToast = (msg: string) => {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
    padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600',
    background: 'rgba(201,168,76,0.95)', color: '#0a0a0a', zIndex: '9999',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'opacity 0.4s',
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; }, 1800);
  setTimeout(() => t.remove(), 2200);
};

/* ── format relative date ─────────────────────────────────── */
const timeAgo = (date: string | Date) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

export const VideoSection: React.FC<VideoSectionProps> = ({
  videos,
  visitor,
  videoComments,
  onAddVideoComment,
  onVideoLike,
  onVisitorLoginClick,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const displayVideos = showAll ? videos : videos.slice(0, INITIAL_COUNT);
  const hasMore = videos.length > INITIAL_COUNT;

  if (videos.length === 0) return null;

  /* ── share handler ──────────────────────────────────────── */
  const handleShare = async (video: Video) => {
    const url = `${window.location.origin}/video/${video.firestoreId || video.id}`;
    const text = `Check out "${video.title}" on WILDS AURA! 🎬📸`;
    if (navigator.share) {
      try { await navigator.share({ title: video.title, text, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast('Link copied to clipboard! 📋');
      } catch {}
    }
  };

  /* ── submit comment ─────────────────────────────────────── */
  const handleSubmitComment = (videoId: number) => {
    const text = (commentInputs[videoId] || '').trim();
    if (!text) return;
    onAddVideoComment(videoId, text);
    setCommentInputs((p) => ({ ...p, [videoId]: '' }));
  };

  return (
    <section id="videos" style={{ padding: '5rem 0', background: 'linear-gradient(180deg, var(--wa-dark) 0%, rgba(10,10,10,1) 100%)' }}>
      <div className="wa-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p className="font-cinzel" style={{
            fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--wa-gold)', marginBottom: '0.75rem',
          }}>
            Moving Moments
          </p>
          <h2 className="font-playfair" style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700,
            background: 'linear-gradient(135deg, var(--wa-gold), var(--wa-gold-light))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          }}>
            🎬 Videos
            <span style={{
              fontSize: '0.9rem', fontWeight: 400,
              WebkitTextFillColor: 'var(--wa-text-muted)',
            }}>
              ({videos.length})
            </span>
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--wa-text-muted)', maxWidth: 500, margin: '0 auto' }}>
            Experience the wild in motion — cinematic glimpses into the heart of nature.
          </p>
        </div>

        {/* Video Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}>
          {displayVideos.map((video) => {
            const comments = videoComments[video.id] || [];
            const isExpanded = expandedComments[video.id];
            const visibleComments = isExpanded ? comments : comments.slice(-2);
            const hasHiddenComments = comments.length > 2 && !isExpanded;

            return (
              <div
                key={video.id}
                style={{
                  borderRadius: '14px', overflow: 'hidden',
                  background: 'var(--wa-dark-card)',
                  border: '1px solid var(--wa-border)',
                  transition: 'border-color 0.3s, transform 0.3s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--wa-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Video Player / Thumbnail */}
                <div style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
                  {playingId === video.id ? (
                    <video
                      src={video.videoUrl}
                      controls
                      autoPlay
                      style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: '#000' }}
                      onEnded={() => setPlayingId(null)}
                    />
                  ) : (
                    <div
                      style={{ cursor: 'pointer', position: 'relative' }}
                      onClick={() => setPlayingId(video.id)}
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          style={{ width: '100%', height: 220, objectFit: 'cover', transition: 'transform 0.5s' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: 220,
                          background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(0,0,0,0.8))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Play size={48} style={{ color: 'var(--wa-gold)', opacity: 0.5 }} />
                        </div>
                      )}
                      {/* Play Button Overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        transition: 'background 0.3s',
                      }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: '50%',
                          background: 'rgba(201,168,76,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
                          transition: 'transform 0.3s',
                        }}>
                          <Play size={24} style={{ color: '#0a0a0a', marginLeft: 2 }} fill="#0a0a0a" />
                        </div>
                      </div>
                      {/* Duration Badge */}
                      {video.duration && (
                        <div style={{
                          position: 'absolute', bottom: 8, right: 8,
                          padding: '0.2rem 0.5rem', borderRadius: '4px',
                          background: 'rgba(0,0,0,0.8)', color: '#fff',
                          fontSize: '0.7rem', fontWeight: 600,
                        }}>
                          {video.duration}
                        </div>
                      )}
                      {/* Tags */}
                      <div style={{
                        position: 'absolute', top: 8, left: 8,
                        display: 'flex', gap: '0.3rem', flexWrap: 'wrap',
                      }}>
                        {video.tags.slice(0, 3).map((tag) => (
                          <span key={tag} style={{
                            padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.6rem',
                            background: 'rgba(201,168,76,0.2)', color: 'var(--wa-gold-light)',
                            border: '1px solid rgba(201,168,76,0.3)',
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Watermark Badge ─────────────────────────────── */}
                  <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    padding: '0.15rem 0.45rem', borderRadius: '4px',
                    background: 'rgba(0,0,0,0.55)', color: 'var(--wa-gold)',
                    fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em',
                    pointerEvents: 'none', zIndex: 2,
                  }}>
                    © WILDSAURA
                  </div>
                </div>

                {/* Video Info */}
                <div style={{ padding: '1.25rem' }}>
                  <h3 className="font-playfair" style={{
                    fontSize: '1.1rem', fontWeight: 700, color: 'var(--wa-text)',
                    marginBottom: '0.5rem', lineHeight: 1.3,
                  }}>
                    {video.title}
                  </h3>
                  {video.description && (
                    <p style={{
                      fontSize: '0.8rem', color: 'var(--wa-text-muted)', lineHeight: 1.6,
                      marginBottom: '1rem',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {video.description}
                    </p>
                  )}

                  {/* Stats row — with like, share buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--wa-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {video.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={12} /> {video.location}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Eye size={12} /> {video.viewCount}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Like Button */}
                      <button
                        onClick={() => onVideoLike(video.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: (video as any).liked ? 'var(--wa-gold)' : 'rgba(201,168,76,0.6)',
                          fontSize: '0.7rem', transition: 'color 0.2s, transform 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        title="Like this video"
                      >
                        <Heart
                          size={14}
                          fill={(video as any).liked ? 'var(--wa-gold)' : 'none'}
                          style={{ transition: 'fill 0.2s' }}
                        />
                        {video.likeCount}
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleShare(video)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: 'var(--wa-text-muted)', fontSize: '0.7rem', transition: 'color 0.2s, transform 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--wa-gold)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--wa-text-muted)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        title="Share this video"
                      >
                        <Share2 size={13} />
                      </button>

                      {/* Comment count shortcut */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--wa-text-muted)' }}>
                        <MessageCircle size={13} /> {comments.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Comment Section ────────────────────────────── */}
                <div style={{
                  borderTop: '1px solid var(--wa-border)',
                  padding: '0.75rem 1.25rem 1rem',
                }}>
                  {/* View all comments toggle */}
                  {hasHiddenComments && (
                    <button
                      onClick={() => setExpandedComments((p) => ({ ...p, [video.id]: true }))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: '0.72rem', color: 'var(--wa-text-muted)', marginBottom: '0.5rem',
                        transition: 'color 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = 'var(--wa-gold)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = 'var(--wa-text-muted)'; }}
                    >
                      View all {comments.length} comments
                    </button>
                  )}

                  {/* Comment list */}
                  {visibleComments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.65rem' }}>
                      {visibleComments.map((c) => (
                        <div key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          {/* Avatar */}
                          <div style={{
                            width: 26, height: 26, minWidth: 26, borderRadius: '50%',
                            background: c.avatarColor || 'var(--wa-gold)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                          }}>
                            {(c.displayName || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--wa-gold-light)', marginRight: '0.4rem' }}>
                              {c.displayName}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--wa-text-muted)', wordBreak: 'break-word' }}>
                              {c.content}
                            </span>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>
                              {timeAgo(c.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment input or login prompt */}
                  {visitor ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Visitor avatar */}
                      <div style={{
                        width: 26, height: 26, minWidth: 26, borderRadius: '50%',
                        background: visitor.avatarColor || 'var(--wa-gold)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                      }}>
                        {(visitor.displayName || '?')[0].toUpperCase()}
                      </div>
                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center',
                        background: 'rgba(255,255,255,0.04)', borderRadius: '20px',
                        border: '1px solid var(--wa-border)', overflow: 'hidden',
                        transition: 'border-color 0.2s',
                      }}>
                        <input
                          type="text"
                          placeholder="Add a comment…"
                          value={commentInputs[video.id] || ''}
                          onChange={(e) => setCommentInputs((p) => ({ ...p, [video.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(video.id); }}
                          style={{
                            flex: 1, background: 'none', border: 'none', outline: 'none',
                            padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--wa-text)',
                          }}
                        />
                        <button
                          onClick={() => handleSubmitComment(video.id)}
                          disabled={!(commentInputs[video.id] || '').trim()}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '0.4rem 0.65rem', display: 'flex', alignItems: 'center',
                            color: (commentInputs[video.id] || '').trim() ? 'var(--wa-gold)' : 'rgba(201,168,76,0.3)',
                            transition: 'color 0.2s',
                          }}
                          title="Post comment"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={onVisitorLoginClick}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: '0.72rem', color: 'var(--wa-gold)', fontWeight: 600,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                      onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      Login to comment
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Videos Button */}
        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 2rem',
                background: 'transparent',
                border: '2px solid var(--wa-gold)',
                color: 'var(--wa-gold)',
                borderRadius: '50px',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--wa-gold)';
                e.currentTarget.style.color = '#0a0a0a';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--wa-gold)';
              }}
            >
              {showAll ? 'Show Less' : 'View All Videos'}
              <ChevronDown size={16} style={{
                transform: showAll ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.3s',
              }} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
