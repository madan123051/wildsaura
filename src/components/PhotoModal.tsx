import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, Share2, Download, MapPin, User, Tag, Camera, Maximize2, Timer, Zap, Eye, BookOpen, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { Photo, Comment, Visitor } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUrl';

const formatPhotoDate = (createdAt: any): string => {
  if (!createdAt) return '';
  try {
    if (createdAt?.toDate) return createdAt.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { }
  return '';
};

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
  onLike: () => void;
  onShare: () => void;
  onDownload: () => void;
  onGenerateStory?: () => void;
  isGeneratingStory?: boolean;
  isAdmin?: boolean;
  visitor: Visitor | null;
  comments: Comment[];
  onAddComment: (content: string) => void;
  onVisitorLoginClick: () => void;
  onDeleteComment?: (firestoreId: string) => void;
  freeDownloadsLeft: number;
  isDownloading: boolean;
  photos?: Photo[];
  onNavigate?: (photo: Photo) => void;
}

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);
const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const LinkIconSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);

/** Stable key to identify a photo across id/firestoreId/slug differences */
const getPhotoKey = (p: Photo) => p.firestoreId || p.slug || String(p.id);

const getModalImageUrl = (url?: string) =>
  getOptimizedImageUrl(url, {
    width: 1800,
    quality: 84,
    fit: 'contain',
    maxAge: '30d',
  }) || url || '';

export const PhotoModal: React.FC<PhotoModalProps> = ({
  photo, onClose, onLike, onShare, onDownload, onGenerateStory, isGeneratingStory, isAdmin, visitor, comments, onAddComment, onVisitorLoginClick, onDeleteComment, freeDownloadsLeft, isDownloading, photos, onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'exif' | 'comments'>('info');
  const [commentText, setCommentText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [imageCandidateIndex, setImageCandidateIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const hasExif = photo.cameraModel || photo.lens || photo.aperture || photo.shutterSpeed || photo.iso || photo.focalLength;
  const photoKey = getPhotoKey(photo);
  const modalImageUrl = getModalImageUrl(photo.imageUrl);
  const imageCandidates = Array.from(new Set([modalImageUrl, photo.imageUrl].filter(Boolean)));
  const currentImageSrc = imageCandidates[imageCandidateIndex] || photo.imageUrl;

  const currentIndex = photos ? photos.findIndex(p => getPhotoKey(p) === getPhotoKey(photo)) : -1;
  const canNavigate = Boolean(photos && photos.length > 1 && currentIndex >= 0 && onNavigate);
  const hasPrev = canNavigate;
  const hasNext = canNavigate;
  const nextPhoto = canNavigate && photos ? photos[(currentIndex + 1) % photos.length] : null;
  const previousPhoto = canNavigate && photos ? photos[(currentIndex - 1 + photos.length) % photos.length] : null;
  const shouldAutoAdvance = canNavigate && !isDetailsOpen && !showShareMenu;

  const goToPrev = useCallback(() => {
    if (!canNavigate || !onNavigate || !photos) return;
    const targetIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    onNavigate(photos[targetIndex]);
  }, [canNavigate, onNavigate, photos, currentIndex]);

  const goToNext = useCallback(() => {
    if (!canNavigate || !onNavigate || !photos) return;
    onNavigate(photos[(currentIndex + 1) % photos.length]);
  }, [canNavigate, onNavigate, photos, currentIndex]);

  useEffect(() => {
    setImageCandidateIndex(0);
    setIsImageLoaded(false);
    setShowShareMenu(false);
  }, [photoKey, modalImageUrl]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!shouldAutoAdvance) return;
    const timer = window.setTimeout(goToNext, 5000);
    return () => window.clearTimeout(timer);
  }, [shouldAutoAdvance, goToNext, photoKey]);

  useEffect(() => {
    [nextPhoto, previousPhoto].forEach((candidate) => {
      if (!candidate?.imageUrl) return;
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = getModalImageUrl(candidate.imageUrl);
    });
  }, [nextPhoto?.imageUrl, previousPhoto?.imageUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
      else if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, onClose]);

  useEffect(() => {
    if (!showShareMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node) && 
          shareButtonRef.current && !shareButtonRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showShareMenu]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    
    // Only treat as horizontal swipe if X delta is dominant and large enough
    if (Math.abs(diffX) >= 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0) goToNext(); else goToPrev();
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const shareUrl = `${window.location.origin}/photo/${encodeURIComponent(photo.slug || photo.firestoreId || String(photo.id))}`;
  const shareText = `Check out "${photo.title}" on WildSaura Photography! 🦁📸`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { label: 'WhatsApp', icon: <WhatsAppIcon />, onClick: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank') },
    { label: 'Twitter / X', icon: <XIcon />, onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank') },
    { label: 'Facebook', icon: <FacebookIcon />, onClick: () => window.open(`https://www.facebook.com/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank') },
    { label: copied ? 'Copied!' : 'Copy Link', icon: <LinkIconSvg />, onClick: handleCopyLink },
  ];

  const tabs = [
    { id: 'info' as const, label: 'Details' },
    ...(hasExif ? [{ id: 'exif' as const, label: 'Camera' }] : []),
    { id: 'comments' as const, label: `Comments (${comments.length})` },
  ];

  const handlePostComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentText('');
  };

  const navArrowStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: '0.6rem', zIndex: 3, width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(201,168,76,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#9fcb8f', transition: 'background 0.2s',
    backdropFilter: 'blur(4px)',
  });

  return (
    <div 
      className="modal-backdrop photo-modal-backdrop" 
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0.75rem', background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div 
        className="photo-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-label={photo.title}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', borderRadius: '1rem', width: 'min(100%, 96vw)', maxWidth: '1400px',
          height: 'min(92dvh, 920px)', overflow: 'hidden',
          background: '#020504', border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 0 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* — Image — */}
        <div 
          className="photo-modal-image-wrap"
          style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'pan-y', background: '#020504', overflow: 'hidden' }}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {!isImageLoaded && (
            <div className="photo-modal-image-loader" aria-hidden="true">
              <div />
            </div>
          )}
          <img
            key={`${photoKey}-${imageCandidateIndex}`}
            className="photo-modal-image"
            src={currentImageSrc}
            alt={`${photo.title} - ${(photo.tags || []).join(', ')}`}
            style={{
              width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center',
              borderRadius: '1rem', userSelect: 'none', WebkitUserDrag: 'none',
              opacity: isImageLoaded ? 1 : 0, transform: isImageLoaded ? 'scale(1)' : 'scale(0.985)',
              transition: 'opacity 260ms ease, transform 360ms ease',
            } as React.CSSProperties}
            decoding="async"
            sizes="100vw"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              if (imageCandidateIndex < imageCandidates.length - 1) {
                setIsImageLoaded(false);
                setImageCandidateIndex((index) => index + 1);
              } else {
                setIsImageLoaded(true);
              }
            }}
          />
          {shouldAutoAdvance && (
            <div className="photo-modal-progress" aria-hidden="true">
              <span key={photoKey} />
            </div>
          )}
          {/* Click blocker - pointerEvents:none so swipe/tap events reach the container */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' }} />

          {/* Category badge - top left */}
          <div style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', zIndex: 2 }}>
            <span className="font-cinzel" style={{
              padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 500,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(0,0,0,0.6)', color: 'var(--wa-gold)', border: '1px solid rgba(201,168,76,0.3)', backdropFilter: 'blur(8px)',
            }}>
              {photo.category}
            </span>
          </div>

          {/* Close button - top right ON image */}
          <button 
            type="button"
            className="photo-modal-close"
            onClick={onClose}
            onTouchStart={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
            aria-label="Close photo"
            title="Close photo"
            style={{
              position: 'absolute',
              top: 'max(0.6rem, calc(env(safe-area-inset-top, 0px) + 0.35rem))',
              right: 'max(0.6rem, calc(env(safe-area-inset-right, 0px) + 0.35rem))',
              zIndex: 10,
              background: 'rgba(2,5,4,0.88)', border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', boxShadow: '0 4px 18px rgba(0,0,0,0.48)',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>

          {/* Photo counter - bottom left ON image */}
          {photos && photos.length > 1 && currentIndex >= 0 && (
            <div style={{
              position: 'absolute', top: '2.65rem', left: '0.6rem', zIndex: 2,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              borderRadius: '9999px', padding: '0.15rem 0.6rem',
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.05em',
            }}>
              {currentIndex + 1} / {photos.length}
            </div>
          )}

          {/* Watermark - bottom right ON image */}
          <span className="font-cinzel" style={{
            position: 'absolute', top: 9, right: 66, zIndex: 2,
            padding: '2px 6px', background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(201,168,76,0.4)', borderRadius: '4px',
            color: 'rgba(201,168,76,0.8)', fontSize: '0.5rem', fontWeight: 700,
            letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            © WILDSAURA PHOTOGRAPHY
          </span>

          {/* Prev arrow */}
          {hasPrev && (
            <button onClick={goToPrev} aria-label="Previous photo" style={navArrowStyle('left')}>
              <ChevronLeft size={20} />
            </button>
          )}
          {/* Next arrow */}
          {hasNext && (
            <button onClick={goToNext} aria-label="Next photo" style={navArrowStyle('right')}>
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        {!isDetailsOpen && (
          <div className="photo-modal-collapsed-details">
            <div className="photo-modal-collapsed-copy">
              <h2 className="font-playfair">{photo.title}</h2>
              <p>
                {photo.photographer || 'WildSaura'}
                {photo.location ? ` · ${photo.location}` : ''}
                {formatPhotoDate(photo.createdAt) ? ` · ${formatPhotoDate(photo.createdAt)}` : ''}
              </p>
            </div>
            <button className="photo-modal-details-toggle" onClick={() => setIsDetailsOpen(true)}>
              <span>Get details</span>
              <ChevronUp size={16} />
            </button>
          </div>
        )}
        {/* ── Compact Info Section ── */}
        <div
          className={`photo-modal-info ${isDetailsOpen ? 'is-open' : ''}`}
          style={{
            position: 'absolute', left: '0.75rem', right: '0.75rem', bottom: '0.75rem', zIndex: 8,
            maxHeight: 'min(68dvh, 34rem)', overflowY: 'auto', padding: '0.75rem 1rem',
            borderRadius: '0.9rem', background: 'rgba(5, 12, 9, 0.92)',
            border: '1px solid rgba(201,168,76,0.22)', boxShadow: '0 -16px 60px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            transform: isDetailsOpen ? 'translateY(0)' : 'translateY(calc(100% + 1rem))',
            opacity: isDetailsOpen ? 1 : 0, pointerEvents: isDetailsOpen ? 'auto' : 'none',
            transition: 'transform 260ms ease, opacity 220ms ease',
          }}
        >
          <div className="photo-modal-panel-header">
            <span className="photo-modal-panel-grip" />
            <button onClick={() => setIsDetailsOpen(false)} className="photo-modal-details-toggle photo-modal-hide-details">
              <span>Hide details</span>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Title + meta — single compact row */}
          <div className="photo-modal-heading" style={{ marginBottom: '0.6rem' }}>
            <h2 className="font-playfair" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.2rem', lineHeight: 1.3 }}>
              {photo.title}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }} className="text-wa-muted photo-modal-meta">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={10} /> {photo.photographer || 'Unknown'}</span>
              {photo.location && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.location)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#9fcb8f', textDecoration: 'none' }}
                  onClick={(e) => e.stopPropagation()}>
                  <MapPin size={10} /> {photo.location}
                </a>
              )}
              {formatPhotoDate(photo.createdAt) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#9fcb8f' }}><CalendarDays size={10} /> {formatPhotoDate(photo.createdAt)}</span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Tag size={10} /> {photo.category}</span>
            </div>
          </div>

          {/* ── Actions row — compact ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            paddingBottom: '0.6rem', borderBottom: '1px solid var(--wa-border)',
            flexWrap: 'wrap',
          }} className="photo-modal-actions">
            {/* Like */}
            <button onClick={onLike} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: photo.liked ? 'var(--wa-gold)' : 'var(--wa-text-muted)',
              padding: '0.35rem 0.6rem', borderRadius: '0.4rem',
              fontSize: '0.75rem', transition: 'color 0.2s',
            }}>
              <Heart size={15} fill={photo.liked ? 'currentColor' : 'none'} />
              <span>{photo.likeCount}</span>
            </button>

            {/* Share */}
            <div style={{ position: 'relative' }}>
              <button ref={shareButtonRef} onClick={() => setShowShareMenu(prev => !prev)} style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: showShareMenu ? 'var(--wa-gold)' : 'var(--wa-text-muted)',
                padding: '0.35rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem',
              }}>
                <Share2 size={15} />
                <span>Share</span>
              </button>
              {showShareMenu && (
                <div ref={shareMenuRef} style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginBottom: '0.4rem', background: 'rgba(20,20,20,0.95)',
                  border: '1px solid rgba(201,168,76,0.3)', borderRadius: '0.75rem',
                  padding: '0.4rem', minWidth: '160px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  zIndex: 10, backdropFilter: 'blur(12px)',
                  animation: 'shareMenuFadeIn 0.15s ease-out',
                }}>
                  <style>{`@keyframes shareMenuFadeIn { from { opacity:0; transform:translateX(-50%) translateY(4px);} to {opacity:1; transform:translateX(-50%) translateY(0);}}`}</style>
                  {shareOptions.map((opt, i) => (
                    <button key={i} onClick={() => { opt.onClick(); if (opt.label !== 'Copied!' && opt.label !== 'Copy Link') setShowShareMenu(false); }} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                      padding: '0.45rem 0.65rem', background: 'transparent', border: 'none',
                      borderRadius: '0.5rem', cursor: 'pointer',
                      color: opt.label === 'Copied!' ? '#9fcb8f' : 'rgba(247,251,248,0.7)',
                      fontSize: '0.75rem', textAlign: 'left', whiteSpace: 'nowrap',
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,0.12)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                      <span style={{ width: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Download */}
            <button onClick={onDownload} disabled={isDownloading} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'none', border: 'none', cursor: isDownloading ? 'wait' : 'pointer',
              color: 'var(--wa-text-muted)', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem',
            }}>
              <Download size={15} />
              <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
            </button>

            {/* AI Story (admin only) */}
            {isAdmin && onGenerateStory && (
              <button onClick={onGenerateStory} disabled={isGeneratingStory} style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: 'none', border: 'none', cursor: isGeneratingStory ? 'wait' : 'pointer',
                color: 'var(--wa-gold)', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem',
              }}>
                <BookOpen size={15} />
                <span>{isGeneratingStory ? 'Generating...' : 'AI Story'}</span>
              </button>
            )}

            {/* Free download badge — inline small chip */}
            <span style={{
              marginLeft: 'auto', fontSize: '0.6rem', color: '#9fcb8f',
              background: 'rgba(159,203,143,0.1)', border: '1px solid rgba(159,203,143,0.2)',
              borderRadius: '9999px', padding: '0.2rem 0.5rem',
              display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap',
            }} className="photo-modal-free-chip">
              <Download size={10} /> Free · No watermark 🎉
            </span>
          </div>

          {/* ── Tabs ── */}
          <div className="photo-modal-tabs" style={{ display: 'flex', gap: '0.2rem', margin: '0.6rem 0', padding: '0.2rem', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.04)' }}>
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Info Tab ── */}
          {activeTab === 'info' && (
            <div>
              {photo.caption && <p className="text-wa-mid photo-modal-caption" style={{ fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.6rem' }}>{photo.caption}</p>}
              <div className="photo-modal-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <InfoCard label="Photographer" value={photo.photographer || 'Unknown'} />
                {photo.location && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.location)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
                    <InfoCard label="Location" value={photo.location} icon={<MapPin size={12} style={{ color: '#9fcb8f' }} />} />
                  </a>
                )}
                <InfoCard label="Category" value={photo.category} />
                {formatPhotoDate(photo.createdAt) && (
                  <InfoCard label="Date" value={formatPhotoDate(photo.createdAt)} icon={<CalendarDays size={12} style={{ color: '#9fcb8f' }} />} />
                )}
              </div>
            </div>
          )}

          {/* ── EXIF Tab ── */}
          {activeTab === 'exif' && hasExif && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {photo.cameraModel && <ExifCard icon={<Camera size={11} />} label="Camera" value={photo.cameraModel} />}
              {photo.lens && <ExifCard icon={<Maximize2 size={11} />} label="Lens" value={photo.lens} />}
              {photo.aperture && <ExifCard icon={<Eye size={11} />} label="Aperture" value={photo.aperture} />}
              {photo.shutterSpeed && <ExifCard icon={<Timer size={11} />} label="Shutter" value={photo.shutterSpeed} />}
              {photo.iso && <ExifCard icon={<Zap size={11} />} label="ISO" value={`ISO ${photo.iso}`} />}
              {photo.focalLength && <ExifCard icon={<Eye size={11} />} label="Focal Length" value={photo.focalLength} />}
            </div>
          )}

          {/* ── Comments Tab ── */}
          {activeTab === 'comments' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: '10rem', overflowY: 'auto' }}>
                {comments.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--wa-text-muted)', padding: '0.75rem 0' }}>
                    No comments yet. Be the first!
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.65rem', borderRadius: '0.5rem', background: 'var(--wa-dark-alt)', position: 'relative' }}>
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.displayName} style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.avatarColor || 'linear-gradient(135deg,#c9a84c,#f5d98b)', fontSize: '0.6rem', fontWeight: 700, color: '#000' }}>
                        {c.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.7 }}>{c.displayName}</p>
                      <p className="text-wa-mid" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>{c.content}</p>
                    </div>
                    {isAdmin && c.firestoreId && onDeleteComment && (
                      <button onClick={() => onDeleteComment(c.firestoreId!)} title="Delete comment" style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '4px', cursor: 'pointer', padding: '0.15rem', color: 'rgba(255,100,100,0.8)', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {visitor ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                    {visitor.avatarUrl ? (
                      <img src={visitor.avatarUrl} alt={visitor.displayName} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: visitor.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: '#062013' }}>
                        {visitor.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: '0.65rem', color: 'var(--wa-text-muted)' }}>{visitor.displayName}</span>
                  </div>
                  <textarea className="wa-input" placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: '0.4rem', fontSize: '0.8rem' }} />
                  <button onClick={handlePostComment} className="btn-gold" style={{ width: '100%', padding: '0.45rem' }}>Post Comment</button>
                </div>
              ) : (
                <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--wa-border)', padding: '0.65rem' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--wa-text-muted)', marginBottom: '0.35rem' }}>Commenting as guest</p>
                  <textarea className="wa-input" placeholder="Write a comment as guest..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: '0.4rem', fontSize: '0.8rem' }} />
                  <button onClick={handlePostComment} className="btn-gold" style={{ width: '100%', padding: '0.45rem' }}>Post Comment</button>
                </div>
              )}
            </div>
          )}
        </div>
        <style>{`
          .photo-modal-image-loader {
            position: absolute;
            inset: 0;
            z-index: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at center, rgba(31,68,43,0.42), rgba(0,0,0,0.65) 58%, rgba(0,0,0,0.95));
          }

          .photo-modal-image-loader > div {
            width: min(46vw, 520px);
            aspect-ratio: 4 / 3;
            border-radius: 0.9rem;
            background: linear-gradient(110deg, #0c2018 8%, #294635 18%, #0c2018 33%);
            background-size: 200% 100%;
            animation: photoModalShimmer 1.2s linear infinite;
            border: 1px solid rgba(201,168,76,0.12);
          }

          .photo-modal-progress {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 3px;
            z-index: 6;
            background: rgba(255,255,255,0.08);
          }

          .photo-modal-progress span {
            display: block;
            width: 100%;
            height: 100%;
            transform-origin: left;
            background: linear-gradient(90deg, #9fcb8f, var(--wa-gold));
            animation: photoModalProgress 5s linear forwards;
          }

          .photo-modal-close:focus-visible {
            outline: 2px solid var(--wa-gold);
            outline-offset: 3px;
          }

          .photo-modal-close:active {
            transform: scale(0.94);
          }

          .photo-modal-collapsed-details {
            position: absolute;
            left: 0.75rem;
            right: 0.75rem;
            bottom: 0.75rem;
            z-index: 7;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.72rem 0.82rem;
            border-radius: 0.9rem;
            background: rgba(5,12,9,0.88);
            border: 1px solid rgba(201,168,76,0.22);
            box-shadow: 0 -14px 48px rgba(0,0,0,0.42);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
          }

          .photo-modal-collapsed-copy {
            min-width: 0;
          }

          .photo-modal-collapsed-copy h2 {
            margin: 0;
            color: var(--wa-light);
            font-size: 1rem;
            line-height: 1.15;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .photo-modal-collapsed-copy p {
            margin: 0.22rem 0 0;
            color: var(--wa-text-muted);
            font-size: 0.66rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .photo-modal-details-toggle {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
            border: 1px solid rgba(201,168,76,0.38);
            border-radius: 999px;
            background: rgba(201,168,76,0.16);
            color: var(--wa-gold);
            cursor: pointer;
            padding: 0.48rem 0.78rem;
            font-size: 0.72rem;
            font-weight: 700;
          }

          .photo-modal-panel-header {
            position: sticky;
            top: 0;
            z-index: 3;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            margin: -0.1rem 0 0.55rem;
            padding-bottom: 0.35rem;
            background: linear-gradient(to bottom, rgba(5,12,9,0.98), rgba(5,12,9,0));
          }

          .photo-modal-panel-grip {
            width: 2.4rem;
            height: 3px;
            border-radius: 999px;
            background: rgba(201,168,76,0.35);
          }

          .photo-modal-hide-details {
            padding: 0.34rem 0.65rem;
            background: rgba(255,255,255,0.04);
          }

          @keyframes photoModalProgress {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }

          @keyframes photoModalShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          @media (max-width: 640px) {
            .photo-modal-backdrop {
              padding: 0.35rem !important;
              align-items: center !important;
            }

            .photo-modal-shell {
              width: 100% !important;
              height: calc(100dvh - 0.7rem) !important;
              border-radius: 0.8rem !important;
              overflow: hidden !important;
            }

            .photo-modal-image-wrap {
              background: #030604;
            }

            .photo-modal-image {
              display: block !important;
              width: 100% !important;
              height: 100% !important;
              object-fit: contain !important;
              border-radius: 0.8rem !important;
              background: #030604;
            }

            .photo-modal-collapsed-details {
              left: 0.45rem !important;
              right: 0.45rem !important;
              bottom: 0.45rem !important;
              padding: 0.55rem 0.6rem !important;
              border-radius: 0.72rem !important;
              gap: 0.45rem !important;
            }

            .photo-modal-collapsed-copy h2 {
              font-size: 0.86rem !important;
            }

            .photo-modal-collapsed-copy p {
              font-size: 0.56rem !important;
            }

            .photo-modal-details-toggle {
              padding: 0.42rem 0.58rem !important;
              font-size: 0.6rem !important;
            }

            .photo-modal-info {
              left: 0.45rem !important;
              right: 0.45rem !important;
              bottom: 0.45rem !important;
              max-height: min(74dvh, calc(100dvh - 3rem)) !important;
              overflow-y: auto !important;
              padding: 0.55rem 0.7rem 0.7rem !important;
              -webkit-overflow-scrolling: touch;
              border-radius: 0.72rem !important;
            }

            .photo-modal-heading {
              margin-bottom: 0.4rem !important;
            }

            .photo-modal-heading h2 {
              font-size: 0.95rem !important;
              line-height: 1.15 !important;
              margin-bottom: 0.18rem !important;
            }

            .photo-modal-meta {
              gap: 0.28rem 0.45rem !important;
              font-size: 0.58rem !important;
              line-height: 1.2 !important;
            }

            .photo-modal-actions {
              gap: 0.1rem !important;
              padding-bottom: 0.42rem !important;
              flex-wrap: nowrap !important;
              overflow-x: auto !important;
              scrollbar-width: none;
            }

            .photo-modal-actions::-webkit-scrollbar {
              display: none;
            }

            .photo-modal-actions button {
              padding: 0.26rem 0.42rem !important;
              font-size: 0.64rem !important;
              flex: 0 0 auto;
            }

            .photo-modal-actions button svg {
              width: 13px !important;
              height: 13px !important;
            }

            .photo-modal-free-chip {
              display: none !important;
            }

            .photo-modal-tabs {
              margin: 0.42rem 0 !important;
              padding: 0.15rem !important;
            }

            .photo-modal-tabs .tab-btn {
              padding: 0.25rem 0.35rem !important;
              font-size: 0.58rem !important;
              letter-spacing: 0.04em !important;
              min-height: 28px;
            }

            .photo-modal-caption {
              font-size: 0.68rem !important;
              line-height: 1.35 !important;
              margin-bottom: 0.45rem !important;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }

            .photo-modal-detail-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 0.35rem !important;
            }

            .photo-modal-detail-card {
              padding: 0.38rem 0.46rem !important;
              border-radius: 0.45rem !important;
            }

            .photo-modal-detail-card-label {
              font-size: 0.48rem !important;
              letter-spacing: 0.08em !important;
              margin-bottom: 0.12rem !important;
            }

            .photo-modal-detail-card-value {
              font-size: 0.66rem !important;
              line-height: 1.2 !important;
              gap: 0.12rem !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="photo-modal-detail-card" style={{ borderRadius: '0.5rem', padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <p className="font-cinzel text-wa-muted photo-modal-detail-card-label" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</p>
    <p className="photo-modal-detail-card-value" style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.2rem', textTransform: 'capitalize' }}>
      {icon} {value}
    </p>
  </div>
);

const ExifCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="exif-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
      <span style={{ color: 'var(--wa-gold)' }}>{icon}</span>
      <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
    </div>
    <p style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.8 }}>{value}</p>
  </div>
);
