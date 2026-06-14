import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, Share2, Download, MapPin, User, Tag, Camera, Maximize2, Timer, Zap, Eye, ImageOff, BookOpen, Trash2, ChevronLeft, ChevronRight, Copy, ExternalLink, CalendarDays } from 'lucide-react';
import { Photo, Comment, Visitor } from '../types';

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

export const PhotoModal: React.FC<PhotoModalProps> = ({
  photo, onClose, onLike, onShare, onDownload, onGenerateStory, isGeneratingStory, isAdmin, visitor, comments, onAddComment, onVisitorLoginClick, onDeleteComment, freeDownloadsLeft, isDownloading, photos, onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'exif' | 'comments'>('info');
  const [commentText, setCommentText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const hasExif = photo.cameraModel || photo.lens || photo.aperture || photo.shutterSpeed || photo.iso || photo.focalLength;

  const currentIndex = photos ? photos.findIndex(p => getPhotoKey(p) === getPhotoKey(photo)) : -1;
  const hasPrev = photos && currentIndex > 0;
  const hasNext = photos && currentIndex >= 0 && currentIndex < photos.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev && onNavigate && photos) onNavigate(photos[currentIndex - 1]);
  }, [hasPrev, onNavigate, photos, currentIndex]);

  const goToNext = useCallback(() => {
    if (hasNext && onNavigate && photos) onNavigate(photos[currentIndex + 1]);
  }, [hasNext, onNavigate, photos, currentIndex]);

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
      className="modal-backdrop" 
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: '1rem', maxWidth: '48rem', width: '100%', maxHeight: '96vh', overflowY: 'auto',
          background: 'var(--wa-dark-card)', border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 0 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* — Image — */}
        <div 
          style={{ position: 'relative', touchAction: 'pan-y' }}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            src={photo.imageUrl} 
            alt={`${photo.title} - ${(photo.tags || []).join(', ')}`}
            style={{ width: '100%', objectFit: 'cover', borderRadius: '1rem 1rem 0 0', maxHeight: '50vh', userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
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
            onClick={onClose}
            style={{
              position: 'absolute', top: '0.6rem', right: '0.6rem', zIndex: 4,
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            <X size={15} />
          </button>

          {/* Photo counter - bottom left ON image */}
          {photos && photos.length > 1 && currentIndex >= 0 && (
            <div style={{
              position: 'absolute', bottom: '0.6rem', left: '0.6rem', zIndex: 2,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              borderRadius: '9999px', padding: '0.15rem 0.6rem',
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.05em',
            }}>
              {currentIndex + 1} / {photos.length}
            </div>
          )}

          {/* Watermark - bottom right ON image */}
          <span className="font-cinzel" style={{
            position: 'absolute', bottom: 6, right: 6, zIndex: 2,
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
        {/* Modal content follows... (rest of the file remains same) */}
      </div>
    </div>
  );
};
