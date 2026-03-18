import React from 'react';
import { Camera } from 'lucide-react';
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
}

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
  const filtered = selectedCategory === 'all' ? photos : photos.filter((p) => p.category === selectedCategory);

  return (
    <section ref={galleryRef} id="gallery" className="bg-wa-dark" style={{ padding: '4rem 0 5rem' }}>
      <div className="wa-container">
        {/* Section Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="section-subtitle">Portfolio</p>
          <h2 className="section-title">FEATURED GALLERY.</h2>
          <div className="section-line" />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2.5rem' }}>
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onCategoryChange(tab.key)}
              className={`filter-tab ${selectedCategory === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <Camera size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.875rem' }}>
              No photos in this category yet.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {filtered.map((photo) => (
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
        )}
      </div>
    </section>
  );
};
