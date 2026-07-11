import React, { useState } from 'react';
import { Camera, ArrowRight } from 'lucide-react';
import { Photo, FilterTab } from '../types';
import { PhotoCard } from './PhotoCard';

interface GalleryProps {
  photos: Photo[];
  filterTabs: FilterTab[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onPhotoClick: (photo: Photo) => void;
  onLike: (id: number) => void;
  onShare: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  galleryRef: React.RefObject<HTMLElement | null>;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  onViewAll?: () => void;
  isLoading?: boolean;
}

const INITIAL_COUNT = 12;

export const Gallery: React.FC<GalleryProps> = ({
  photos,
  filterTabs,
  selectedCategory,
  onCategoryChange,
  onPhotoClick,
  onLike,
  onShare,
  onDownload,
  galleryRef,
  isLoggedIn,
  onLoginRequired,
  onViewAll,
  isLoading = false,
}) => {
  const published = photos.filter(p => p.published !== false);
  const filtered = selectedCategory === 'all'
    ? published
    : published.filter(p => p.category === selectedCategory);
  const displayPhotos = filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT;

  return (
    <section ref={galleryRef} id="gallery" className="bg-wa-dark" style={{ padding: '4rem 0 5rem' }}>
      <div className="wa-container">
        {/* Section Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="section-subtitle">Portfolio</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              📷 Latest Posts
              <span style={{
                fontSize: '0.9rem', fontWeight: 400, color: 'var(--wa-text-muted)',
                marginLeft: '0.25rem',
              }}>
                ({filtered.length})
              </span>
            </h2>
            {onViewAll && (
              <button
                onClick={onViewAll}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1.25rem',
                  background: 'linear-gradient(135deg, var(--wa-gold), #b8892d)',
                  color: '#062013',
                  border: 'none', borderRadius: 50,
                  fontSize: '0.85rem', fontWeight: 700,
                  letterSpacing: '0.03em', cursor: 'pointer',
                  transition: 'all 0.25s',
                  boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(201,168,76,0.4)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(201,168,76,0.3)';
                }}
              >
                View All <ArrowRight size={15} />
              </button>
            )}
          </div>
          <div className="section-line" />
        </div>

        {/* Category pills REMOVED — categories already shown as thumbnail cards above */}

        {/* Gallery Grid */}
        {isLoading && published.length === 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {Array.from({ length: INITIAL_COUNT }).map((_, index) => (
              <div key={index} className="skeleton-card" style={{ overflow: 'hidden', borderRadius: '0.75rem' }}>
                <div className="skeleton-image" style={{ width: '100%', aspectRatio: '1/1' }} />
                <div style={{ padding: '0.75rem' }}>
                  <div className="skeleton-text medium" />
                  <div className="skeleton-text short" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <Camera size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.875rem' }}>
              No photos in this category yet.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {displayPhotos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onClick={() => onPhotoClick(photo)}
                  onLike={() => onLike(photo.id)}
                  onShare={() => onShare(photo)}
                  onDownload={() => onDownload(photo)}
                  isLoggedIn={isLoggedIn}
                  onLoginRequired={onLoginRequired}
                  priority={index < 4}
                />
              ))}
            </div>

            {/* View All Button */}
            {hasMore && onViewAll && (
              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button
                  onClick={onViewAll}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 2rem',
                    background: 'transparent',
                    border: '2px solid var(--wa-gold)',
                    color: 'var(--wa-gold)',
                    borderRadius: '50px',
                    fontSize: '0.9rem', fontWeight: 600,
                    letterSpacing: '0.05em', cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--wa-gold)';
                    e.currentTarget.style.color = '#062013';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--wa-gold)';
                  }}
                >
                  View All {filtered.length} Photos <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
