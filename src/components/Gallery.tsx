import React from 'react';
import { ArrowRight, Camera } from 'lucide-react';
import { FilterTab, Photo } from '../types';
import { sortByCreatedAtDesc } from '../utils/dateSort';
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

const INITIAL_COUNT = 10;
const CARD_VARIANTS: Array<'wide' | 'tall' | 'standard'> = [
  'wide', 'tall', 'standard', 'standard', 'standard', 'tall', 'wide', 'standard', 'standard', 'standard',
];

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
  const published = sortByCreatedAtDesc(photos.filter((photo) => photo.published !== false));
  const filtered = selectedCategory === 'all'
    ? published
    : published.filter((photo) => photo.category === selectedCategory);
  const displayPhotos = filtered.slice(0, INITIAL_COUNT);
  const visibleTabs = filterTabs.filter((tab) => (
    tab.key === 'all' ||
    tab.key === selectedCategory ||
    published.some((photo) => photo.category === tab.key)
  ));

  return (
    <section ref={galleryRef} id="gallery" className="portfolio-section">
      <div className="wa-container">
        <div className="portfolio-section__header">
          <div>
            <p className="section-kicker"><span>01</span> Portfolio</p>
            <h2>Selected work</h2>
          </div>
          <div className="portfolio-section__intro">
            <p>
              Quiet encounters, restless landscapes, and moments that reward patience. A living archive from Nepal, Japan, and the spaces between.
            </p>
            {onViewAll && (
              <button type="button" className="text-arrow-link" onClick={onViewAll}>
                View full archive <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="portfolio-filters" role="group" aria-label="Filter photographs by category">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-pressed={selectedCategory === tab.key}
              onClick={() => onCategoryChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && published.length === 0 ? (
          <div className="editorial-work-grid" aria-label="Loading photographs">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`portfolio-skeleton portfolio-skeleton--${CARD_VARIANTS[index]}`}
              >
                <div className="skeleton-image" />
                <div className="skeleton-text medium" />
              </div>
            ))}
          </div>
        ) : displayPhotos.length === 0 ? (
          <div className="portfolio-empty">
            <Camera size={38} aria-hidden="true" />
            <h3>No photographs here yet</h3>
            <p>Choose another collection, or return soon for new field notes.</p>
            {selectedCategory !== 'all' && (
              <button type="button" className="text-arrow-link" onClick={() => onCategoryChange('all')}>
                View all work <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="editorial-work-grid">
            {displayPhotos.map((photo, index) => (
              <PhotoCard
                key={photo.firestoreId || photo.id}
                photo={photo}
                variant={CARD_VARIANTS[index % CARD_VARIANTS.length]}
                priority={index < 2}
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

        {filtered.length > INITIAL_COUNT && onViewAll && (
          <div className="portfolio-section__footer">
            <button type="button" className="outline-button" onClick={onViewAll}>
              Explore all {filtered.length} photographs <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
