import React, { useMemo, useState } from 'react';
import { Camera, Search, ChevronLeft } from 'lucide-react';
import { GalleryPhoto, GalleryCategory } from '../types';
import { formatPhotoDate } from '../utils/dateFormatter'; // NEW: Import date formatter

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
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  const MONTH_NAMES: Record<string, string> = { '01':'January','02':'February','03':'March','04':'April','05':'May','06':'June','07':'July','08':'August','09':'September','10':'October','11':'November','12':'December' };
  const getPhotoYearMonth = (photo: GalleryPhoto): { year: string; month: string } => {
    if (photo.storagePath) { const parts = photo.storagePath.split('/'); if (parts.length >= 5) return { year: parts[2], month: parts[3] }; }
    if (photo.createdAt?.toDate) { const d: Date = photo.createdAt.toDate(); return { year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, '0') }; }
    return { year: String(new Date().getFullYear()), month: String(new Date().getMonth() + 1).padStart(2, '0') };
  };
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

  // Group category photos by year
  const yearMap = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    categoryPhotos.forEach((p) => {
      const year = p.uploadedAt
        ? new Date(p.uploadedAt.seconds ? p.uploadedAt.seconds * 1000 : p.uploadedAt).getFullYear().toString()
        : 'Unknown';
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(p);
    });
    return map;
  }, [categoryPhotos]);

  // Group category+year photos by month
  const monthMap = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    if (!openYear) return map;
    categoryPhotos
      .filter((p) => {
        const year = p.uploadedAt
          ? new Date(p.uploadedAt.seconds ? p.uploadedAt.seconds * 1000 : p.uploadedAt).getFullYear().toString()
          : 'Unknown';
        return year === openYear;
      })
      .forEach((p) => {
        const month = p.uploadedAt
          ? String(new Date(p.uploadedAt.seconds ? p.uploadedAt.seconds * 1000 : p.uploadedAt).getMonth() + 1).padStart(2, '0')
          : '01';
        if (!map.has(month)) map.set(month, []);
        map.get(month)!.push(p);
      });
    return map;
  }, [categoryPhotos, openYear]);

  // Photos for the open month
  const monthPhotos = useMemo(() => {
    if (!openMonth) return [];
    return monthMap.get(openMonth) ?? [];
  }, [monthMap, openMonth]);

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
              {/* NEW: Display upload date */}
              {photo.createdAt && (
                <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.6rem', display: 'block', marginTop: '0.35rem' }}>
                  📅 {formatPhotoDate(photo.createdAt)}
                </span>
              )}
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

        ) : openCategory && openYear && openMonth ? (
          /* ── Month level: breadcrumb + photo grid ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => { setOpenCategory(null); setOpenYear(null); setOpenMonth(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--wa-gold)', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <ChevronLeft size={14} /> All
              </button>
              <span style={{ color: 'rgba(201,168,76,0.45)' }}>›</span>
              <button onClick={() => { setOpenYear(null); setOpenMonth(null); }}
                style={{ background: 'none', border: 'none', color: 'rgba(201,168,76,0.75)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
                {categoryEmoji(openCategory)} {categoryLabel(openCategory)}
              </button>
              <span style={{ color: 'rgba(201,168,76,0.45)' }}>›</span>
              <button onClick={() => setOpenMonth(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(201,168,76,0.75)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
                {openYear}
              </button>
              <span style={{ color: 'rgba(201,168,76,0.45)' }}>›</span>
              <span style={{ color: 'var(--wa-light)', fontWeight: 700 }}>{MONTH_NAMES[openMonth]}</span>
            </div>
            <PhotoGrid items={monthPhotos} />
          </>

        ) : openCategory && openYear ? (
          /* ── Year level: month folders ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => { setOpenCategory(null); setOpenYear(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--wa-gold)', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <ChevronLeft size={14} /> All
              </button>
              <span style={{ color: 'rgba(201,168,76,0.45)' }}>›</span>
              <button onClick={() => setOpenYear(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(201,168,76,0.75)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
                {categoryEmoji(openCategory)} {categoryLabel(openCategory)}
              </button>
              <span style={{ color: 'rgba(201,168,76,0.45)' }}>›</span>
              <span style={{ color: 'var(--wa-light)', fontWeight: 700 }}>{openYear}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.1rem' }}>
              {Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([month, mPhotos]) => (
                <button key={month} onClick={() => setOpenMonth(month)}
                  style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '18px', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', boxShadow: '0 18px 45px rgba(0,0,0,0.2)', textAlign: 'left', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 24px 55px rgba(0,0,0,0.35)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 18px 45px rgba(0,0,0,0.2)'; }}>
                  <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                    <img src={mPhotos[0].imageUrl} alt={month} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)', color: 'var(--wa-gold)', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>
                      {mPhotos.length}
                    </span>
                  </div>
                  <span style={{ display: 'block', padding: '0.8rem 1rem' }}>
                    <span style={{ display: 'block', color: 'var(--wa-light)', fontSize: '0.92rem', fontWeight: 700 }}>🗓️ {MONTH_NAMES[month]}</span>
                    <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.72rem', display: 'block' }}>Open →</span>
                  </span>
                </button>
              ))}
            </div>
          </>

        ) : openCategory ? (
          /* ── Category level: year folders ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => setOpenCategory(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--wa-gold)', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <ChevronLeft size={16} /> All Categories
              </button>
              <span style={{ color: 'var(--wa-light)', fontWeight: 700, fontSize: '1.05rem' }}>
                {categoryEmoji(openCategory)} {categoryLabel(openCategory)}
                <span style={{ color: 'var(--wa-text-muted)', fontWeight: 400, fontSize: '0.88rem', marginLeft: '0.5rem' }}>
                  ({categoryPhotos.length})
                </span>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.1rem' }}>
              {Array.from(yearMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yPhotos]) => (
                <button key={year} onClick={() => setOpenYear(year)}
                  style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '18px', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', boxShadow: '0 18px 45px rgba(0,0,0,0.2)', textAlign: 'left', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 24px 55px rgba(0,0,0,0.35)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 18px 45px rgba(0,0,0,0.2)'; }}>
                  <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                    <img src={yPhotos[0].imageUrl} alt={year} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)', color: 'var(--wa-gold)', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>
                      {yPhotos.length}
                    </span>
                  </div>
                  <span style={{ display: 'block', padding: '0.8rem 1rem' }}>
                    <span style={{ display: 'block', color: 'var(--wa-light)', fontSize: '0.92rem', fontWeight: 700 }}>📅 {year}</span>
                    <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.72rem', display: 'block' }}>Open →</span>
                  </span>
                </button>
              ))}
            </div>
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
                {/* NEW: Show upload date in lightbox */}
                {activePhoto.createdAt && (
                  <p style={{ color: 'var(--wa-text-muted)', margin: '0.3rem 0 0', fontSize: '0.75rem' }}>
                    📅 Uploaded {formatPhotoDate(activePhoto.createdAt)}
                  </p>
                )}
              </div>
              <button className="filter-tab active" onClick={() => setActivePhoto(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
