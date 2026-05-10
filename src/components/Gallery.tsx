import React, { useState } from 'react';
import { Camera, ChevronDown } from 'lucide-react';
import { Photo, FilterTab } from '../types';
import { PhotoCard } from './PhotoCard';

const NG_YELLOW = '#E8C84A';

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
}

const INITIAL_COUNT = 6;

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
}) => {
  const [showAll, setShowAll] = useState(false);
  // Always show all — category filtering handled by folder view above
  const published = photos.filter(p => p.published !== false);
  const displayPhotos = showAll ? published : published.slice(0, INITIAL_COUNT);
  const hasMore = published.length > INITIAL_COUNT;

  return (
    <section ref={galleryRef} id="gallery" className="bg-wa-dark" style={{ padding: '3.5rem 0 5rem' }}>
      <div className="wa-container">
        {/* Section Header */}
        <div style={{ marginBottom: '2rem' }}>
          {/* NatGeo top rule */}
          <div style={{ width: 36, height: 3, background: NG_YELLOW, marginBottom: '1rem' }} />

          <p className="section-subtitle" style={{ letterSpacing: '0.32em' }}>
            — Field Notes
          </p>
          <h2 className="section-title" style={{
            display: 'flex', alignItems: 'baseline', gap: '0.5rem',
            color: '#F2E4C4',         /* warm parchment instead of cold white */
          }}>
            Latest Posts
            <span style={{
              fontSize: '0.78rem', fontWeight: 500,
              color: NG_YELLOW,
              letterSpacing: '0.06em',
              border: `1px solid ${NG_YELLOW}`,
              padding: '0.1rem 0.55rem',
              marginLeft: '0.35rem',
              fontFamily: 'Cinzel, serif',
            }}>
              {published.length}
            </span>
          </h2>
          <div className="section-line" />
        </div>

        {/* Gallery Grid */}
        {published.length === 0 ? (
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {displayPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onClick={() => onPhotoClick(photo)}
                  onLike={() => onLike(photo.id)}
                  onShare={() => onShare(photo)}
                  onDownload={() => onDownload(photo)}
                  isLoggedIn={isLoggedIn}
                  onLoginRequired={onLoginRequired}
                />
              ))}
            </div>

            {/* View More / View Less Button */}
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
                  {showAll ? 'Show Less' : `View More Posts`}
                  <ChevronDown size={16} style={{
                    transform: showAll ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.3s',
                  }} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
