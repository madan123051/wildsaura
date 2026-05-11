import React, { useMemo, useState } from 'react';
import { Camera, ChevronLeft, FolderOpen, Folder, Search } from 'lucide-react';
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

const MONTH_NAMES: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

const categoryLabel = (cat: GalleryCategory) =>
  CATEGORY_TABS.find(t => t.key === cat)?.label || cat;

/** Extract year & month from storagePath (new: gallery/cat/year/month/file) or createdAt fallback */
const extractYearMonth = (photo: GalleryPhoto): { year: string; month: string } => {
  if (photo.storagePath) {
    const parts = photo.storagePath.split('/');
    if (parts.length >= 5 && /^\d{4}$/.test(parts[2]) && /^\d{2}$/.test(parts[3])) {
      return { year: parts[2], month: parts[3] };
    }
  }
  const date = photo.createdAt?.toDate
    ? photo.createdAt.toDate()
    : photo.createdAt instanceof Date
    ? photo.createdAt
    : new Date();
  return {
    year: date.getFullYear().toString(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
  };
};

type AnnotatedPhoto = GalleryPhoto & { year: string; month: string };

const folderCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.6rem',
  padding: '1.5rem 1rem',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.03)',
  cursor: 'pointer',
  transition: 'all 0.22s ease',
  textAlign: 'center',
};

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, searchQuery }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | GalleryCategory>('all');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleCategoryChange = (cat: 'all' | GalleryCategory) => {
    setSelectedCategory(cat);
    setSelectedYear(null);
    setSelectedMonth(null);
  };

  const handleBack = () => {
    if (selectedMonth) { setSelectedMonth(null); return; }
    if (selectedYear) { setSelectedYear(null); return; }
    setSelectedCategory('all');
  };

  // Base filter: category + search
  const categoryFiltered: AnnotatedPhoto[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return photos
      .filter(p => {
        const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          categoryLabel(p.category).toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .map(p => ({ ...p, ...extractYearMonth(p) }));
  }, [photos, searchQuery, selectedCategory]);

  const years = useMemo(
    () => [...new Set(categoryFiltered.map(p => p.year))].sort((a, b) => b.localeCompare(a)),
    [categoryFiltered]
  );

  const months = useMemo(() => {
    if (!selectedYear) return [];
    const inYear = categoryFiltered.filter(p => p.year === selectedYear);
    return [...new Set(inYear.map(p => p.month))].sort((a, b) => b.localeCompare(a));
  }, [categoryFiltered, selectedYear]);

  const displayPhotos = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    return categoryFiltered.filter(p => p.year === selectedYear && p.month === selectedMonth);
  }, [categoryFiltered, selectedYear, selectedMonth]);

  const showFlatGrid = selectedCategory === 'all';
  const showYearFolders = !showFlatGrid && !selectedYear;
  const showMonthFolders = !showFlatGrid && !!selectedYear && !selectedMonth;
  const showPhotosGrid = !showFlatGrid && !!selectedYear && !!selectedMonth;

  const breadcrumb = [
    selectedCategory !== 'all' ? categoryLabel(selectedCategory as GalleryCategory) : null,
    selectedYear,
    selectedMonth ? MONTH_NAMES[selectedMonth] : null,
  ].filter(Boolean) as string[];

  const photoCount = showFlatGrid
    ? categoryFiltered.length
    : showYearFolders
    ? categoryFiltered.length
    : showMonthFolders
    ? categoryFiltered.filter(p => p.year === selectedYear).length
    : displayPhotos.length;

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
              ({photoCount})
            </span>
          </h2>
          <div className="section-line" />
          {searchQuery.trim() && (
            <p style={{ marginTop: '0.8rem', color: 'var(--wa-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Search size={15} /> Showing results for "{searchQuery.trim()}"
            </p>
          )}
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleCategoryChange(tab.key)}
              className={`filter-tab ${selectedCategory === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Breadcrumb / Back navigation */}
        {breadcrumb.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              padding: '0.6rem 0.8rem',
              borderRadius: '10px',
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.15)',
              width: 'fit-content',
            }}
          >
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--wa-gold)', fontSize: '0.82rem', padding: 0,
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 0.2rem' }}>|</span>
            <span style={{ color: 'rgba(235,230,220,0.6)', fontSize: '0.82rem' }}>
              {breadcrumb.join(' › ')}
            </span>
          </div>
        )}

        {/* ── Year folders ── */}
        {showYearFolders && (
          <>
            {years.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {years.map(year => {
                  const count = categoryFiltered.filter(p => p.year === year).length;
                  const isHov = hovered === `y-${year}`;
                  return (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      onMouseEnter={() => setHovered(`y-${year}`)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        ...folderCardStyle,
                        background: isHov ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                        borderColor: isHov ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.2)',
                        transform: isHov ? 'translateY(-2px)' : 'none',
                      }}
                    >
                      <FolderOpen size={44} color={isHov ? '#c9a84c' : 'rgba(201,168,76,0.65)'} />
                      <span style={{ color: 'var(--wa-light)', fontWeight: 700, fontSize: '1.1rem' }}>{year}</span>
                      <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.72rem' }}>{count} photo{count !== 1 ? 's' : ''}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Month folders ── */}
        {showMonthFolders && (
          <>
            {months.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                {months.map(month => {
                  const count = categoryFiltered.filter(p => p.year === selectedYear && p.month === month).length;
                  const isHov = hovered === `m-${month}`;
                  return (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      onMouseEnter={() => setHovered(`m-${month}`)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        ...folderCardStyle,
                        background: isHov ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                        borderColor: isHov ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.2)',
                        transform: isHov ? 'translateY(-2px)' : 'none',
                      }}
                    >
                      <Folder size={40} color={isHov ? '#c9a84c' : 'rgba(201,168,76,0.55)'} />
                      <span style={{ color: 'var(--wa-light)', fontWeight: 600, fontSize: '0.95rem' }}>{MONTH_NAMES[month]}</span>
                      <span style={{ color: 'var(--wa-gold)', fontSize: '0.72rem', fontWeight: 500 }}>{selectedYear}</span>
                      <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.7rem' }}>{count} photo{count !== 1 ? 's' : ''}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Photos grid ── */}
        {(showPhotosGrid || showFlatGrid) && (
          <>
            {(showPhotosGrid ? displayPhotos : categoryFiltered).length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {(showPhotosGrid ? displayPhotos : categoryFiltered).map((photo, index) => (
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
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      style={{ width: '100%', height: index % 5 === 0 ? 250 : 190, objectFit: 'cover', display: 'block' }}
                    />
                    <span style={{ display: 'block', padding: '0.7rem 0.8rem', textAlign: 'left' }}>
                      <span style={{ display: 'block', color: 'var(--wa-light)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>{photo.title}</span>
                      <span style={{ color: 'var(--wa-gold)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{categoryLabel(photo.category)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
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

const EmptyState: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '5rem 0', border: '1px dashed rgba(201,168,76,0.18)', borderRadius: '18px', background: 'rgba(255,255,255,0.02)' }}>
    <Camera size={48} style={{ margin: '0 auto 1rem', color: 'var(--wa-gold)', opacity: 0.35 }} />
    <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.875rem' }}>No gallery photos found.</p>
  </div>
);
