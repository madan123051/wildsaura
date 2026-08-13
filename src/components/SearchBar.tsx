import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Photo } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUrl';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ isOpen, onClose, query, onQueryChange, photos, onPhotoClick }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const filtered = query.trim().length > 0
    ? photos.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.caption || '').toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (p.animalName || '').toLowerCase().includes(q)
        );
      })
    : [];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search photographs"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(3,9,6,0.96)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 'max(88px, calc(env(safe-area-inset-top) + 72px))',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '640px', padding: '0 1.5rem' }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--wa-gold)', opacity: 0.6 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by animal name, tags, location, category..."
            style={{
              width: '100%', padding: '1rem 3rem 1rem 3rem',
              background: 'var(--wa-dark-card)', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '12px', color: 'var(--wa-text)', fontSize: '1rem',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--wa-font-sans)',
            }}
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--wa-text)', padding: 0, width: 44, height: 44,
              display: 'grid', placeItems: 'center', borderRadius: '50%',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        {query.trim().length > 0 && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', borderRadius: '12px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--wa-text-muted)' }}>
                No photos found for "{query}"
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                {filtered.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => { onPhotoClick(p); onClose(); }}
                    style={{
                      padding: 0, cursor: 'pointer', borderRadius: '10px', overflow: 'hidden',
                      background: 'var(--wa-dark-card)', border: '1px solid var(--wa-border)',
                      color: 'inherit', font: 'inherit', textAlign: 'left',
                    }}
                  >
                    <img
                      src={getOptimizedImageUrl(p.thumbnailUrl || p.imageUrl, { width: 320, height: 200, quality: 70 }) || p.thumbnailUrl || p.imageUrl}
                      alt={p.title}
                      style={{ width: '100%', height: 100, objectFit: 'cover' }}
                      width={320}
                      height={200}
                      loading="lazy"
                      decoding="async"
                    />
                    <div style={{ padding: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--wa-text)', marginBottom: '0.15rem' }}>{p.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--wa-text-muted)', textTransform: 'capitalize' }}>{p.category}{p.location ? ` · ${p.location}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p aria-live="polite" style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--wa-text-muted)', marginTop: '1rem' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
