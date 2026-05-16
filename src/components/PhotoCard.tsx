import React from 'react';
import { Heart, Share2, Download, MapPin, MessageCircle, CalendarDays } from 'lucide-react';
import { Photo } from '../types';

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
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onClick, onLike, onShare, onDownload, isLoggedIn: _isLoggedIn, onLoginRequired: _onLoginRequired }) => {
  const gated = (action: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); action(); };

  return (
    <div
      className="photo-card"
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--wa-dark-card)',
      }}
    >
      {/* Image */}
      <div
        style={{ aspectRatio: '1/1', position: 'relative', overflow: 'hidden' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={photo.imageUrl}
          alt={photo.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s', userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          loading="lazy"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        {/* Transparent overlay to block right-click save */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} />
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
          }}
        />
        {/* Actions on hover */}
        <div
          className="card-actions"
          style={{
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={gated(onLike)}
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
              <span style={{ fontSize: '0.75rem' }}>{photo.likeCount}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}
              title="Share photo"
            >
              <Share2 size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}
            >
              <MessageCircle size={15} />
            </button>
          </div>
          <button
            onClick={gated(onDownload)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* Card Footer */}
      <div style={{ padding: '0.6rem 0.75rem' }}>
        <p className="font-playfair" style={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}>
          {photo.title}
        </p>
        {photo.location && (
          <p className="text-wa-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', marginTop: '0.2rem' }}>
            <MapPin size={10} /> {photo.location}
          </p>
        )}
        {formatPhotoDate(photo.createdAt) && (
          <p className="text-wa-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', marginTop: '0.15rem', color: '#9fcb8f' }}>
            <CalendarDays size={10} /> {formatPhotoDate(photo.createdAt)}
          </p>
        )}
      </div>

      <style>{`
        .photo-card:hover .card-overlay { opacity: 1 !important; }
        .photo-card:hover .card-actions { opacity: 1 !important; transform: translateY(0) !important; }
        .photo-card:hover img { transform: scale(1.1); }
      `}</style>
    </div>
  );
};
