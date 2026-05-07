import React, { useMemo, useState } from 'react';
import { Camera, Search } from 'lucide-react';
import { GalleryCategory, GalleryPhoto } from '../types';

type GalleryFilter = GalleryCategory | 'all';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  searchQuery: string;
}

const FILTERS: { key: GalleryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'birds', label: 'Birds' },
  { key: 'landscapes', label: 'Landscapes' },
  { key: 'portraits', label: 'Portraits' },
];

const matchesGallerySearch = (photo: GalleryPhoto, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    photo.title.toLowerCase().includes(q) ||
    photo.category.toLowerCase().includes(q) ||
    (photo.fileName || '').toLowerCase().includes(q)
  );
};

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, searchQuery }) => {
  const [selectedCategory, setSelectedCategory] = useState<GalleryFilter>('all');
  const [localSearch, setLocalSearch] = useState('');
  const activeSearch = searchQuery.trim() || localSearch.trim();

  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      const categoryMatch = selectedCategory === 'all' || photo.category === selectedCategory;
      return categoryMatch && matchesGallerySearch(photo, activeSearch);
    });
  }, [photos, selectedCategory, activeSearch]);

  return (
    <section id="photo-gallery" className="bg-wa-dark" style={{ padding: '4rem 0 5rem' }}>
      <div className="wa-container">
        <div style={{ marginBottom: '2rem' }}>
          <p className="section-subtitle">Photo Gallery</p>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🖼️ Browse by Category
            <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--wa-text-muted)' }}>
              ({filteredPhotos.length})
            </span>
          </h2>
          <div className="section-line" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedCategory(filter.key)}
              className={`filter-tab ${selectedCategory === filter.key ? 'active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', maxWidth: 520, marginBottom: '2rem' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--wa-gold)', opacity: 0.65 }} />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search gallery photos by title, category, file name..."
            style={{
              width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
              background: 'var(--wa-dark-card)', border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: '999px', color: 'var(--wa-text)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchQuery.trim() && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--wa-gold)' }}>
              Showing gallery matches for global search: “{searchQuery.trim()}”
            </p>
          )}
        </div>

        {filteredPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--wa-text-muted)' }}>
            <Camera size={52} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p className="font-cinzel" style={{ fontSize: '0.95rem' }}>No gallery photos found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.9rem' }}>
            {filteredPhotos.map((photo) => (
              <article
                key={photo.firestoreId || photo.id}
                style={{
                  position: 'relative', overflow: 'hidden', borderRadius: '18px', minHeight: 250,
                  background: 'var(--wa-dark-card)', border: '1px solid rgba(201,168,76,0.12)',
                  boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
                }}
              >
                <img src={photo.imageUrl} alt={photo.title} loading="lazy" style={{ width: '100%', height: 250, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.05) 58%)' }} />
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '999px', background: 'rgba(201,168,76,0.18)', color: 'var(--wa-gold)', border: '1px solid rgba(201,168,76,0.24)', fontSize: '0.65rem', textTransform: 'capitalize', marginBottom: '0.45rem' }}>
                    {photo.category}
                  </span>
                  <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{photo.title}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
