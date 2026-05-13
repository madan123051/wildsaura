import React, { useState } from 'react';
import { ArrowLeft, Heart, Clock, Eye, Share2, Trash2 } from 'lucide-react';
import { Story, Visitor, Comment } from '../types';

interface StoryDetailProps {
  story: Story;
  onBack: () => void;
  onLike: () => void;
  visitor: Visitor | null;
  comments: Comment[];
  onAddComment: (content: string) => void;
  onVisitorLoginClick: () => void;
  isAdmin?: boolean;
  onDeleteComment?: (firestoreId: string) => void;
}

const estimateReadTime = (content: string): number => Math.max(1, Math.ceil(content.split(/\s+/).length / 200));

// Parse story content: splits by [IMAGE:url] markers and renders paragraphs + images
const renderStoryContent = (content: string) => {
  const parts = content.split(/(\[IMAGE:[^\]]+\])/g);
  const elements: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    const imgMatch = part.match(/^\[IMAGE:(.+)\]$/);
    if (imgMatch) {
      elements.push(
        <div key={`img-${i}`} style={{ margin: '2rem 0', textAlign: 'center' }}>
          <img
            src={imgMatch[1]}
            alt={`Story image ${Math.floor(i / 2) + 1}`}
            style={{
              maxWidth: '100%',
              width: '100%',
              borderRadius: '12px',
              boxShadow: '0 6px 30px rgba(0,0,0,0.5)',
              display: 'block',
            }}
            loading="lazy"
          />
        </div>
      );
    } else {
      // Regular text — split into paragraphs by double newline
      const paras = part.split('\n\n').filter(p => p.trim() !== '');
      paras.forEach((para, j) => {
        elements.push(
          <p key={`p-${i}-${j}`} style={{
            fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--wa-text)',
            marginBottom: '1.25rem', opacity: 0.85,
          }}>
            {para}
          </p>
        );
      });
    }
  });

  return elements;
};

export const StoryDetail: React.FC<StoryDetailProps> = ({
  story, onBack, onLike, visitor, comments, onAddComment, onVisitorLoginClick: _onVisitorLoginClick, isAdmin, onDeleteComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [shareToast, setShareToast] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.origin + '/story/' + encodeURIComponent(story.slug);
    const shareData = {
      title: `${story.title} — WILDS AURA`,
      text: story.excerpt || `Read "${story.title}" on WILDS AURA Photography`,
      url: shareUrl,
    };
    // Try native share on mobile
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch {}
    }
    // Desktop: copy link
    try {
      await navigator.clipboard.writeText(`${story.title} — WILDS AURA\n${story.excerpt}\n${shareUrl}`);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    } catch {}
  };

  const handlePostComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentText('');
  };

  const shareUrl = window.location.origin + '/story/' + encodeURIComponent(story.slug);
  const shareText = story.excerpt || `Read "${story.title}" on WILDS AURA Photography`;
  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${story.title}\n${shareUrl}`)}`,
    facebook: `https://www.facebook.com/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-dark)', paddingTop: '80px' }}>
      {/* Cover Image */}
      <div style={{ position: 'relative', maxHeight: '50vh', overflow: 'hidden' }}>
        <img
          src={story.coverImageUrl}
          alt={story.title}
          style={{ width: '100%', height: '50vh', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(transparent 50%, var(--wa-dark) 100%)',
        }} />
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 20, left: 20, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.3)',
            color: 'var(--wa-gold)', cursor: 'pointer', fontSize: '0.8rem',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Content */}
      <div className="wa-container" style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ marginTop: '-3rem', position: 'relative', zIndex: 5 }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {story.tags.map((tag) => (
              <span key={tag} style={{
                padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.65rem',
                background: 'rgba(201,168,76,0.15)', color: 'var(--wa-gold)',
                border: '1px solid rgba(201,168,76,0.25)',
              }}>
                {tag}
              </span>
            ))}
          </div>

          <h1 className="font-playfair" style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 700,
            color: 'var(--wa-text)', lineHeight: 1.3, marginBottom: '1rem',
          }}>
            {story.title}
          </h1>

          {/* Meta */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1.25rem',
            fontSize: '0.75rem', color: 'var(--wa-text-muted)',
            paddingBottom: '1.5rem', borderBottom: '1px solid var(--wa-border)',
            marginBottom: '2rem', flexWrap: 'wrap',
          }}>
            <span>By <strong style={{ color: 'var(--wa-gold)' }}>{story.photographer || 'Unknown'}</strong></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={13} /> {estimateReadTime(story.content)} min read</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Eye size={13} /> {story.viewCount} views</span>
            <span>{new Date(story.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          {/* Story Content — supports [IMAGE:url] inline markers */}
          <div style={{ marginBottom: '2.5rem' }}>
            {renderStoryContent(story.content)}
          </div>

          {/* Like Button */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1.25rem 0', borderTop: '1px solid var(--wa-border)',
            borderBottom: '1px solid var(--wa-border)',
            marginBottom: '2rem',
          }}>
            <button
              onClick={onLike}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1.25rem', borderRadius: '8px',
                background: story.liked ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
                border: story.liked ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--wa-border)',
                color: story.liked ? 'var(--wa-gold)' : 'var(--wa-text-muted)',
                cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.3s',
              }}
            >
              <Heart size={18} fill={story.liked ? 'currentColor' : 'none'} />
              {story.likeCount} {story.likeCount === 1 ? 'Like' : 'Likes'}
            </button>
            <button
              onClick={handleShare}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1.25rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--wa-border)',
                color: 'var(--wa-text-muted)',
                cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.3s',
              }}
            >
              <Share2 size={18} /> Share
            </button>
            <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-gold-outline" style={{ textDecoration: 'none', padding: '0.5rem 0.9rem' }}>WhatsApp</a>
            <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="btn-gold-outline" style={{ textDecoration: 'none', padding: '0.5rem 0.9rem' }}>Facebook</a>
            <a href={shareLinks.x} target="_blank" rel="noopener noreferrer" className="btn-gold-outline" style={{ textDecoration: 'none', padding: '0.5rem 0.9rem' }}>X</a>
            {/* Share Toast */}
            {shareToast && (
              <div style={{
                position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--wa-gold)', color: '#0a0a0a', padding: '0.75rem 1.5rem',
                borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', zIndex: 9999,
                boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
              }}>
                📋 Story link copied to clipboard!
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 className="font-cinzel" style={{
              fontSize: '0.85rem', color: 'var(--wa-gold)', letterSpacing: '0.1em',
              marginBottom: '1.25rem',
            }}>
              Comments ({comments.length})
            </h3>

            {comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {comments.map((c) => (
                  <div key={c.id} style={{
                    display: 'flex', gap: '0.75rem', padding: '0.75rem',
                    borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--wa-border)', position: 'relative',
                  }}>
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.displayName} style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, objectFit: 'cover',
                      }} referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: c.avatarColor || 'var(--wa-gold)',
                        fontSize: '0.75rem', fontWeight: 700, color: '#000',
                      }}>
                        {c.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--wa-text)' }}>{c.displayName}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--wa-text-muted)' }}>{c.createdAt}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--wa-text)', opacity: 0.8, marginTop: '0.25rem', lineHeight: 1.5 }}>{c.content}</p>
                    </div>
                    {isAdmin && c.firestoreId && onDeleteComment && (
                      <button
                        onClick={() => onDeleteComment(c.firestoreId!)}
                        title="Delete comment"
                        style={{
                          position: 'absolute', top: '0.5rem', right: '0.5rem',
                          background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.3)',
                          borderRadius: '4px', cursor: 'pointer', padding: '0.25rem',
                          color: 'rgba(255,100,100,0.8)', display: 'flex', alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {visitor?.avatarUrl ? (
                    <img src={visitor.avatarUrl} alt={visitor.displayName} style={{
                      width: 24, height: 24, borderRadius: '50%', objectFit: 'cover',
                    }} referrerPolicy="no-referrer" />
                  ) : (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: visitor?.avatarColor || '#4f9f62',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, color: '#000',
                    }}>
                      {(visitor?.displayName || 'Guest').charAt(0).toUpperCase()}
                    </div>
                  )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
                    Commenting as <strong style={{ color: 'var(--wa-gold)' }}>{visitor?.displayName || 'Guest'}</strong>
                  </span>
                </div>
                <textarea
                  className="wa-input"
                  placeholder="Share your thoughts..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  style={{ resize: 'none', marginBottom: '0.5rem' }}
                />
                <button onClick={handlePostComment} className="btn-gold" style={{ width: '100%' }}>
                  Post Comment
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
