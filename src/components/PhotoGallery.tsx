import React, { useMemo, useState } from 'react';
import { Camera, Search } from 'lucide-react';
import { GalleryPhoto, GalleryCategory } from '../types';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  searchQuery: string;
}

const CATEGORY_TABS: Array<{ key: 'all' | GalleryCategory; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'birds', label: 'Birds' },
  { key: 'landscapes', label: 'Landscapes' },
  { key: 'portraits', label: 'Portraits' },
  { key: 'others', label: 'Others' },
];

const categoryLabel = (category: GalleryCategory) => CATEGORY_TABS.find(tab => tab.key === category)?.label || category;

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, searchQuery }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | GalleryCategory>('all');
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  const filteredPhotos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return photos.filter((photo) => {
      const matchesCategory = selectedCategory === 'all' || photo.category === selectedCategory;
      const matchesSearch = !q ||
        photo.title.toLowerCase().includes(q) ||
        photo.category.toLowerCase().includes(q) ||
        categoryLabel(photo.category).toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [photos, searchQuery, selectedCategory]);

  return (
    <section id="photo-gallery" className="bg-wa-dark" style={{ padding: '4rem 0 5rem', background: 'linear-gradient(180deg, rgba(12,30,22,0.1), rgba(0,0,0,0.18))' }}>
      <div className="wa-container">
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="section-subtitle">Curated Collection</p>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🖼️ Photo Gallery
            <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--wa-text-muted)', marginLeft: '0.25rem' }}>
              ({filteredPhotos.length})
            </span>
          </h2>
          <div className="section-line" />
          {searchQuery.trim() && (
            <p style={{ marginTop: '0.8rem', color: 'var(--wa-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Search size={15} /> Showing gallery results for “{searchQuery.trim()}”
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`filter-tab ${selectedCategory === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', border: '1px dashed rgba(201,168,76,0.18)', borderRadius: '18px', background: 'rgba(255,255,255,0.02)' }}>
            <Camera size={48} style={{ margin: '0 auto 1rem', color: 'var(--wa-gold)', opacity: 0.35 }} />
            <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.875rem' }}>
              No gallery photos found.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
            {filteredPhotos.map((photo, index) => (
              <button
                key={photo.id || photo.imageUrl}
                onClick={() => setActivePhoto(photo)}
                style={{
                  border: '1px solid rgba(201,168,76,0.12)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  padding: 0,
                  background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  boxShadow: '0 18px 45px rgba(0,0,0,0.2)',
                }}
              >
                <img src={photo.imageUrl} alt={photo.title} style={{ width: '100%', height: index % 5 === 0 ? 250 : 190, objectFit: 'cover', display: 'block' }} />
                <span style={{ display: 'block', padding: '0.7rem 0.8rem', textAlign: 'left' }}>
                  <span style={{ display: 'block', color: 'var(--wa-light)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>{photo.title}</span>
                  <span style={{ color: 'var(--wa-gold)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{categoryLabel(photo.category)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
            <img src={activePhoto.imageUrl} alt={activePhoto.title} style={{ width: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '18px', border: '1px solid rgba(201,168,76,0.25)' }} />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'var(--wa-light)', margin: 0, fontSize: '1.2rem' }}>{activePhoto.title}</h3>
                <p style={{ color: 'var(--wa-gold)', margin: '0.25rem 0 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>{categoryLabel(activePhoto.category)}</p>
              </div>
              <button className="filter-tab active" onClick={() => setActivePhoto(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
