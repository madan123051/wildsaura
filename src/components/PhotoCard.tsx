import React from 'react';
import { Heart, Share2, Download, MapPin, MessageCircle, CalendarDays } from 'lucide-react';
import { Photo } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUrl';

const PHOTO_PLACEHOLDER = '/images/placeholder-card.svg';

const formatPhotoDate = (createdAt: any): string => {
  if (!createdAt) return '';
  try {
    if (createdAt?.toDate) {
      return createdAt.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch { /* ignore */ }
  return '';
};

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
  onLike: () => void;
  onShare: () => void;
  onDownload: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  priority?: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onClick, onLike, onShare, onDownload, isLoggedIn: _isLoggedIn, onLoginRequired: _onLoginRequired, priority = false }) => {
  const stopAndRun = (action: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); action(); };
  const [imgLoaded, setImgLoaded] = React.useState(false);

  // Use slug or firestoreId or id for the URL
  const photoSlug = photo.slug || photo.firestoreId || photo.id;
  const sourceImage = photo.thumbnailUrl || photo.imageUrl || PHOTO_PLACEHOLDER;
  const cardImageUrl = getOptimizedImageUrl(sourceImage, {
    width: 520,
    height: 520,
    quality: 72,
  }) || PHOTO_PLACEHOLDER;
  const imageCandidates = React.useMemo(
    () => Array.from(new Set([cardImageUrl, sourceImage, PHOTO_PLACEHOLDER].filter(Boolean))),
    [cardImageUrl, sourceImage],
  );
  const [imageCandidateIndex, setImageCandidateIndex] = React.useState(0);

  React.useEffect(() => {
    setImgLoaded(false);
    setImageCandidateIndex(0);
  }, [cardImageUrl, sourceImage]);

  return (
    <div
      className="photo-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      style={{
        position: 'relative',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--wa-dark-card)',
      }}
    >
      {/* Invisible SEO Link - Absolute overlay but doesn't block clicks because it's behind content or has pointer-events: none */}
      <a 
        href={`/photo/${photoSlug}`}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: 0,
          pointerEvents: 'auto'
        }}
        aria-label={`View ${photo.title}`}
      >
        {photo.title}
      </a>

      {/* Image Section */}
      <div
        style={{ aspectRatio: '1/1', position: 'relative', overflow: 'hidden', zIndex: 1, pointerEvents: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!imgLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(110deg, #1a2e1a 8%, #2a4a2a 18%, #1a2e1a 33%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s linear infinite',
            }}
          />
        )}
        <img
          src={imageCandidates[imageCandidateIndex] || PHOTO_PLACEHOLDER}
          alt={photo.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s, opacity 0.25s', opacity: imgLoaded ? 1 : 0, userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            if (imageCandidateIndex < imageCandidates.length - 1) {
              setImgLoaded(false);
              setImageCandidateIndex((index) => index + 1);
            } else {
              setImgLoaded(true);
            }
          }}
        />
        {/* Watermark badge */}
        <span
          className="font-cinzel"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            padding: '2px 6px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(63, 123, 74, 0.45)',
            borderRadius: '4px',
            color: 'rgba(159, 203, 143, 0.85)',
            fontSize: '0.5rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          © WILDSAURA
        </span>
        {/* Hover overlay */}
        <div
          className="card-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 40%, transparent 100%)',
            opacity: 0,
            transition: 'opacity 0.3s',
            pointerEvents: 'none',
          }}
        />
        {/* Actions on hover */}
        <div
          className="card-actions"
          style={{
            zIndex: 3,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: 0,
            transition: 'all 0.3s',
            transform: 'translateY(4px)',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={stopAndRun(onLike)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s',
                color: photo.liked ? 'var(--wa-gold)' : 'rgba(255,255,255,0.8)',
              }}
            >
              <Heart size={15} fill={photo.liked ? 'currentColor' : 'none'} />
              <span style={{ fontSize: '0.75rem', color: 'inherit' }}>{photo.likes || 0}</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.8)' }}>
              <MessageCircle size={15} />
              <span style={{ fontSize: '0.75rem' }}>{photo.commentsCount || 0}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={stopAndRun(onShare)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                padding: '0.4rem',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={stopAndRun(onDownload)}
              style={{
                background: 'var(--wa-gold)',
                border: 'none',
                padding: '0.4rem',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '0.75rem', zIndex: 1, position: 'relative', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
          <h3
            className="font-cinzel"
            style={{
              fontSize: '0.9rem',
              color: 'var(--wa-gold)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {photo.title}
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {photo.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
              <MapPin size={10} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.location}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
            <CalendarDays size={10} />
            <span>{formatPhotoDate(photo.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
