import React, { useMemo, useState } from 'react';
import { Camera, Search, ChevronLeft } from 'lucide-react';
import { GalleryPhoto, GalleryCategory } from '../types';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  searchQuery: string;
}

const CATEGORY_TABS: Array<{ key: GalleryCategory; label: string; emoji: string }> = [
  { key: 'wildlife', label: 'Wildlife', emoji: '🦁' },
  { key: 'birds', label: 'Birds', emoji: '🦅' },
  { key: 'landscapes', label: 'Landscapes', emoji: '🏔️' },
  { key: 'portraits', label: 'Portraits', emoji: '📷' },
  { key: 'others', label: 'Others', emoji: '🌿' },
];

const categoryLabel = (category: GalleryCategory) =>
  CATEGORY_TABS.find((t) => t.key === category)?.label || category;

const categoryEmoji = (category: GalleryCategory) =>
  CATEGORY_TABS.find((t) => t.key === category)?.emoji || '📁';

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, searchQuery }) => {
  const [openCategory, setOpenCategory] = useState<GalleryCategory | null>(null);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  // Search results across all categories
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.trim().toLowerCase();
    return photos.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        categoryLabel(p.category).toLowerCase().includes(q)
    );
  }, [photos, searchQuery, isSearching]);

  // Photos in open category
  const categoryPhotos = useMemo(() => {
    if (!openCategory) return [];
    return photos.filter((p) => p.category === openCategory);
  }, [photos, openCategory]);

  // Category folder summary
  const categorySummary = useMemo(() =>
    CATEGORY_TABS.map((tab) => {
      const catPhotos = photos.filter((p) => p.category === tab.key);
      return { ...tab, count: catPhotos.length, cover: catPhotos[0]?.imageUrl ?? null };
    }), [photos]);

  // ── Photo grid ────────────────────────────────────────────────────────────
  const PhotoGrid = ({ items }: { items: GalleryPhoto[] }) =>
    items.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '5rem 0', border: '1px dashed rgba(201,168,76,0.18)', borderRadius: '18px', background: 'rgba(255,255,255,0.02)' }}>
        <Camera size={48} style={{ margin: '0 auto 1rem', color: 'var(--wa-gold)', opacity: 0.35 }} />
        <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.875rem' }}>No photos found.</p>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
        {items.map((photo, index) => (
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
              textAlign: 'left',
            }}
          >
            <img
              src={photo.imageUrl}
              alt={photo.title}
              style={{ width: '100%', height: index % 5 === 0 ? 250 : 190, objectFit: 'cover', display: 'block' }}
            />
            <span style={{ display: 'block', padding: '0.7rem 0.8rem' }}>
              <span style={{ display: 'block', color: 'var(--wa-light)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                {photo.title}
              </span>
              <span style={{ color: 'var(--wa-gold)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {categoryLabel(photo.category)}
              </span>
            </span>
          </button>
        ))}
      </div>
    );

  return (
    <section
      id="photo-gallery"
      className="bg-wa-dark"
      style={{ padding: '4rem 0 5rem', background: 'linear-gradient(180deg, rgba(12,30,22,0.1), rgba(0,0,0,0.18))' }}
    >
      <div className="wa-container">
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="section-subtitle">Curated Collection</p>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🖼️ Photo Gallery
            <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--wa-text-muted)', marginLeft: '0.25rem' }}>
              ({photos.length})
            </span>
          </h2>
          <div className="section-line" />
          {isSearching && (
            <p style={{ marginTop: '0.8rem', color: 'var(--wa-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Search size={15} /> Showing results for &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          )}
        </div>

        {/* ── Search mode: flat results across all categories ── */}
        {isSearching ? (
          <PhotoGrid items={searchResults} />

        ) : openCategory ? (
          /* ── Category open: back button + photo grid ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setOpenCategory(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
                  color: 'var(--wa-gold)', borderRadius: '8px', padding: '0.4rem 0.9rem',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                <ChevronLeft size={16} /> All Categories
              </button>
              <span style={{ color: 'var(--wa-light)', fontWeight: 700, fontSize: '1.05rem' }}>
                {categoryEmoji(openCategory)} {categoryLabel(openCategory)}
                <span style={{ color: 'var(--wa-text-muted)', fontWeight: 400, fontSize: '0.88rem', marginLeft: '0.5rem' }}>
                  ({categoryPhotos.length} {categoryPhotos.length === 1 ? 'photo' : 'photos'})
                </span>
              </span>
            </div>
            <PhotoGrid items={categoryPhotos} />
          </>

        ) : (
          /* ── Folder view: category cards ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.1rem' }}>
            {categorySummary.map((cat) => (
              <button
                key={cat.key}
                onClick={() => cat.count > 0 && setOpenCategory(cat.key)}
                style={{
                  border: '1px solid rgba(201,168,76,0.18)',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  padding: 0,
                  background: 'rgba(255,255,255,0.03)',
                  cursor: cat.count > 0 ? 'pointer' : 'default',
                  boxShadow: '0 18px 45px rgba(0,0,0,0.22)',
                  opacity: cat.count === 0 ? 0.42 : 1,
                  textAlign: 'left',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  if (cat.count > 0) {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 24px 55px rgba(0,0,0,0.35)';
                  }
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 18px 45px rgba(0,0,0,0.22)';
                }}
              >
                {/* Cover photo */}
                <div style={{ position: 'relative', height: 160, background: 'rgba(201,168,76,0.05)', overflow: 'hidden' }}>
                  {cat.cover ? (
                    <img
                      src={cat.cover}
                      alt={cat.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2.8rem' }}>
                      {cat.emoji}
                    </div>
                  )}
                  {/* Count badge */}
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)',
                    color: 'var(--wa-gold)', fontSize: '0.68rem', fontWeight: 700,
                    padding: '0.2rem 0.55rem', borderRadius: '20px',
                    border: '1px solid rgba(201,168,76,0.28)',
                  }}>
                    {cat.count} {cat.count === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
                {/* Label */}
                <span style={{ display: 'block', padding: '0.8rem 1rem' }}>
                  <span style={{ display: 'block', color: 'var(--wa-light)', fontSize: '0.92rem', fontWeight: 700 }}>
                    {cat.emoji} {cat.label}
                  </span>
                  <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.72rem', marginTop: '0.2rem', display: 'block' }}>
                    {cat.count === 0 ? 'No photos yet' : 'Open folder →'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
            <img
              src={activePhoto.imageUrl}
              alt={activePhoto.title}
              style={{ width: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '18px', border: '1px solid rgba(201,168,76,0.25)' }}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'var(--wa-light)', margin: 0, fontSize: '1.2rem' }}>{activePhoto.title}</h3>
                <p style={{ color: 'var(--wa-gold)', margin: '0.25rem 0 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                  {categoryLabel(activePhoto.category)}
                </p>
              </div>
              <button className="filter-tab active" onClick={() => setActivePhoto(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
