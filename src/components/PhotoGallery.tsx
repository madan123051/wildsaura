import React, { useMemo, useState, useCallback } from 'react';
import { Camera, Search, ChevronLeft, X, ChevronRight } from 'lucide-react';
import { GalleryPhoto, GalleryCategory } from '../types';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  searchQuery: string;
}

/* ── Nepal NatGeo palette accents (complement the existing CSS vars) ── */
const NG_YELLOW   = '#E8C84A';   // NatGeo signature gold-yellow
const NG_YELLOW_DIM = 'rgba(232,200,74,0.18)';
const HIMAL_DEEP  = 'rgba(141,195,216,0.85)'; // --wa-himal-sky bright
const FOREST_GLOW = 'rgba(63,123,74,0.55)';

/* ── Category config ─────────────────────────────────────────────────── */
const CATEGORY_TABS: Array<{
  key: GalleryCategory;
  label: string;
  nepali: string;
  emoji: string;
  tagline: string;
}> = [
  { key: 'wildlife',   label: 'Wildlife',    nepali: 'वन्यजन्तु',   emoji: '🦁', tagline: 'Rare beasts of Nepal\'s forests' },
  { key: 'birds',      label: 'Birds',       nepali: 'पक्षी',       emoji: '🦅', tagline: 'Wings over the Himalayas' },
  { key: 'landscapes', label: 'Landscapes',  nepali: 'भूदृश्य',    emoji: '🏔️', tagline: 'Peaks, valleys & monsoon skies' },
  { key: 'portraits',  label: 'Portraits',   nepali: 'चित्र',      emoji: '📷', tagline: 'Faces of the wild' },
  { key: 'others',     label: 'Others',      nepali: 'अन्य',       emoji: '🌿', tagline: 'Beyond the ordinary' },
];

const catMeta = (key: GalleryCategory) =>
  CATEGORY_TABS.find((t) => t.key === key) ?? CATEGORY_TABS[4];

/* ─────────────────────────────────────────────────────────────────────── */

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, searchQuery }) => {
  const [openCategory, setOpenCategory] = useState<GalleryCategory | null>(null);
  const [activePhoto, setActivePhoto]   = useState<GalleryPhoto | null>(null);
  const [lightboxIdx, setLightboxIdx]   = useState<number>(0);

  const isSearching = searchQuery.trim().length > 0;

  /* Search results */
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.trim().toLowerCase();
    return photos.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        catMeta(p.category).label.toLowerCase().includes(q) ||
        catMeta(p.category).nepali.includes(q)
    );
  }, [photos, searchQuery, isSearching]);

  /* Active category photos */
  const categoryPhotos = useMemo(() => {
    if (!openCategory) return [];
    return photos.filter((p) => p.category === openCategory);
  }, [photos, openCategory]);

  /* Category summary for folder cards */
  const categorySummary = useMemo(() =>
    CATEGORY_TABS.map((tab) => {
      const catPhotos = photos.filter((p) => p.category === tab.key);
      return {
        ...tab,
        count: catPhotos.length,
        cover:  catPhotos[0]?.imageUrl ?? null,
        cover2: catPhotos[1]?.imageUrl ?? null,
      };
    }), [photos]);

  /* Lightbox helpers */
  const currentPool = isSearching ? searchResults : categoryPhotos;
  const openLightbox = useCallback((photo: GalleryPhoto, pool: GalleryPhoto[]) => {
    setActivePhoto(photo);
    setLightboxIdx(pool.findIndex((p) => (p.id || p.imageUrl) === (photo.id || photo.imageUrl)));
  }, []);
  const lbPrev = useCallback(() => {
    const idx = Math.max(0, lightboxIdx - 1);
    setLightboxIdx(idx);
    setActivePhoto(currentPool[idx]);
  }, [lightboxIdx, currentPool]);
  const lbNext = useCallback(() => {
    const idx = Math.min(currentPool.length - 1, lightboxIdx + 1);
    setLightboxIdx(idx);
    setActivePhoto(currentPool[idx]);
  }, [lightboxIdx, currentPool]);

  /* ── Photo grid ────────────────────────────────────────────────────── */
  const PhotoGrid = ({ items }: { items: GalleryPhoto[] }) => {
    if (items.length === 0) {
      return (
        <div style={{
          textAlign: 'center', padding: '6rem 2rem',
          border: `1px dashed ${NG_YELLOW_DIM}`,
          borderRadius: '4px',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <Camera size={44} style={{ margin: '0 auto 1rem', color: NG_YELLOW, opacity: 0.35 }} />
          <p className="font-cinzel" style={{ color: 'var(--wa-text-muted)', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            No Photos Found
          </p>
          <p className="font-nepali" style={{ color: 'var(--wa-text-muted)', fontSize: '0.9rem', marginTop: '0.4rem', opacity: 0.6 }}>
            कुनै फोटो फेला परेन
          </p>
        </div>
      );
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '3px',
      }}>
        {items.map((photo, index) => (
          <button
            key={photo.id || photo.imageUrl}
            onClick={() => openLightbox(photo, items)}
            style={{
              border: 'none',
              padding: 0,
              background: '#060f0a',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
              gridRow: index % 7 === 0 ? 'span 2' : 'span 1',
              minHeight: index % 7 === 0 ? 360 : 200,
            }}
            onMouseOver={(e) => {
              const img = e.currentTarget.querySelector('img') as HTMLImageElement;
              const overlay = e.currentTarget.querySelector('.ng-hover-overlay') as HTMLElement;
              if (img) img.style.transform = 'scale(1.06)';
              if (overlay) overlay.style.opacity = '1';
            }}
            onMouseOut={(e) => {
              const img = e.currentTarget.querySelector('img') as HTMLImageElement;
              const overlay = e.currentTarget.querySelector('.ng-hover-overlay') as HTMLElement;
              if (img) img.style.transform = 'scale(1)';
              if (overlay) overlay.style.opacity = '0';
            }}
          >
            <img
              src={photo.imageUrl}
              alt={photo.title}
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                transition: 'transform 0.5s ease',
              }}
            />
            {/* NatGeo-style bottom title overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.22) 45%, transparent 70%)',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              padding: '0.85rem 0.9rem',
            }}>
              {/* NatGeo yellow left border accent */}
              <div style={{ width: 28, height: 2, background: NG_YELLOW, marginBottom: '0.4rem' }} />
              <span className="font-cinzel" style={{
                color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                letterSpacing: '0.04em', lineHeight: 1.3,
                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
              }}>
                {photo.title}
              </span>
              <span style={{
                color: NG_YELLOW, fontSize: '0.6rem', letterSpacing: '0.16em',
                textTransform: 'uppercase', marginTop: '0.25rem', opacity: 0.9,
              }}>
                {catMeta(photo.category).label}
              </span>
            </div>
            {/* Hover overlay with view cue */}
            <div className="ng-hover-overlay" style={{
              position: 'absolute', inset: 0,
              background: 'rgba(232,200,74,0.08)',
              border: `2px solid ${NG_YELLOW}`,
              opacity: 0, transition: 'opacity 0.25s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="font-cinzel" style={{
                color: NG_YELLOW, fontSize: '0.65rem', letterSpacing: '0.22em',
                textTransform: 'uppercase', background: 'rgba(0,0,0,0.6)',
                padding: '0.35rem 0.8rem',
              }}>View</span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  /* ── Folder cards — compact horizontal scroll strip ─────────────── */
  const FolderGrid = () => (
    <div style={{ paddingBottom: '0.5rem' }}>
      {/* Horizontal scroll row */}
      <div style={{
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
        padding: '1.5rem 1.25rem 0.75rem',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      } as React.CSSProperties}>
        {categorySummary.map((cat) => (
          <button
            key={cat.key}
            onClick={() => cat.count > 0 && setOpenCategory(cat.key)}
            style={{
              flex: '0 0 auto',
              width: 118,
              height: 148,
              scrollSnapAlign: 'start',
              border: 'none',
              padding: 0,
              background: '#060f0a',
              cursor: cat.count > 0 ? 'pointer' : 'not-allowed',
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '7px',
              opacity: cat.count === 0 ? 0.38 : 1,
              boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
              transition: 'transform 0.22s ease, box-shadow 0.22s ease',
            }}
            onMouseOver={(e) => {
              if (cat.count === 0) return;
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.6), 0 0 0 2px ${NG_YELLOW}`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.45)';
            }}
          >
            {/* Cover image */}
            {cat.cover ? (
              <img
                src={cat.cover}
                alt={cat.label}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(160deg, #0c2018, #071509)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem',
              }}>
                {cat.emoji}
              </div>
            )}

            {/* Bottom gradient */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(3,10,6,0.95) 0%, rgba(3,10,6,0.4) 50%, rgba(0,0,0,0.08) 100%)',
            }} />

            {/* Photo count badge — top right */}
            <span style={{
              position: 'absolute', top: 7, right: 7,
              background: NG_YELLOW,
              color: '#050d08',
              fontSize: '0.5rem', fontWeight: 800,
              fontFamily: 'Cinzel, serif',
              letterSpacing: '0.06em',
              padding: '0.12rem 0.38rem',
              lineHeight: 1.4,
            }}>
              {cat.count}
            </span>

            {/* Bottom label */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.55rem 0.65rem 0.65rem' }}>
              {/* NatGeo accent bar */}
              <div style={{ width: 20, height: 2, background: NG_YELLOW, marginBottom: '0.32rem' }} />

              {/* Nepali name — sage */}
              <div className="font-nepali" style={{
                color: 'rgba(197,217,181,0.72)',
                fontSize: '0.58rem',
                lineHeight: 1.2,
                marginBottom: '0.18rem',
              }}>
                {cat.nepali}
              </div>

              {/* English label — warm parchment */}
              <div className="font-cinzel" style={{
                color: '#F2E4C4',
                fontSize: '0.68rem', fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                lineHeight: 1.2,
              }}>
                {cat.label}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Scroll hint dots */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: '5px', padding: '0.6rem 0 0.2rem',
      }}>
        {categorySummary.map((cat) => (
          <div key={cat.key} style={{
            width: 4, height: 4, borderRadius: '50%',
            background: cat.count > 0 ? NG_YELLOW : 'rgba(255,255,255,0.12)',
            opacity: cat.count > 0 ? 0.55 : 0.25,
          }} />
        ))}
      </div>
    </div>
  );

  /* ── Main render ─────────────────────────────────────────────────── */
  return (
    <section
      id="photo-gallery"
      style={{
        padding: '0 0 5rem',
        background: 'var(--wa-dark)',
        position: 'relative',
      }}
    >
      {/* ── Editorial masthead ─────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '0',
      }}>
        <div className="wa-container" style={{ paddingTop: '4rem', paddingBottom: '2.8rem' }}>

          {/* NatGeo top yellow rule */}
          <div style={{
            width: 56, height: 4, background: NG_YELLOW,
            marginBottom: '1.4rem',
          }} />

          {/* Label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <span className="section-subtitle" style={{ letterSpacing: '0.38em' }}>
              Visual Archive
            </span>
            <span style={{
              background: NG_YELLOW_DIM, border: `1px solid ${NG_YELLOW}`,
              color: NG_YELLOW, fontSize: '0.6rem', fontFamily: 'Cinzel, serif',
              letterSpacing: '0.18em', padding: '0.18rem 0.65rem',
              textTransform: 'uppercase',
            }}>
              {photos.length} Images
            </span>
          </div>

          {/* Main title */}
          <h2 className="font-cinzel" style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.9rem)',
            fontWeight: 700,
            color: 'var(--wa-text)',
            margin: 0,
            letterSpacing: '0.04em',
            lineHeight: 1.15,
            textTransform: 'uppercase',
          }}>
            Nepal's Wild Heritage
          </h2>

          {/* Nepali subtitle */}
          <div className="font-nepali" style={{
            color: 'var(--wa-himal-sky)',
            fontSize: '1.05rem',
            marginTop: '0.5rem',
            opacity: 0.82,
            letterSpacing: '0.02em',
          }}>
            नेपालको प्रकृति र वन्यजन्तु — WildSaura द्वारा
          </div>

          {/* Thin divider with accent dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.4rem' }}>
            <div style={{ width: 40, height: 1, background: `linear-gradient(to right, ${NG_YELLOW}, transparent)` }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: NG_YELLOW, opacity: 0.6 }} />
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Search status */}
          {isSearching && (
            <div style={{
              marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.55rem',
              color: 'var(--wa-text-muted)', fontSize: '0.85rem',
            }}>
              <Search size={14} style={{ color: NG_YELLOW }} />
              <span>Showing results for </span>
              <strong style={{ color: NG_YELLOW }}>"{searchQuery.trim()}"</strong>
              <span style={{ color: 'var(--wa-text-muted)', opacity: 0.6 }}>
                — {searchResults.length} found
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Open category breadcrumb bar ──────────────────────────── */}
      {openCategory && !isSearching && (
        <div style={{
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          background: 'rgba(0,0,0,0.25)',
        }}>
          <div className="wa-container" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => setOpenCategory(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: 'transparent',
                border: `1px solid ${NG_YELLOW}`,
                color: NG_YELLOW, borderRadius: '2px',
                padding: '0.3rem 0.75rem', cursor: 'pointer',
                fontSize: '0.68rem', fontFamily: 'Cinzel, serif',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = NG_YELLOW_DIM; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronLeft size={12} /> All Categories
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>›</span>
            <span className="font-cinzel" style={{
              color: '#fff', fontSize: '0.78rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', fontWeight: 700,
            }}>
              {catMeta(openCategory).emoji} {catMeta(openCategory).label}
            </span>
            <span className="font-nepali" style={{ color: 'var(--wa-himal-sky)', fontSize: '0.8rem', opacity: 0.65, marginLeft: '0.25rem' }}>
              ({catMeta(openCategory).nepali})
            </span>
            <span style={{
              marginLeft: 'auto',
              background: NG_YELLOW, color: '#050d08',
              fontSize: '0.58rem', fontFamily: 'Cinzel, serif', fontWeight: 800,
              padding: '0.18rem 0.55rem', letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              {categoryPhotos.length} Photos
            </span>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
      <div style={{ marginTop: 0 }}>
        {isSearching ? (
          <div className="wa-container" style={{ paddingTop: '2rem' }}>
            <PhotoGrid items={searchResults} />
          </div>
        ) : openCategory ? (
          <PhotoGrid items={categoryPhotos} />
        ) : (
          <FolderGrid />
        )}
      </div>

      {/* ── Footer editorial tag ─────────────────────────────────── */}
      {!isSearching && !openCategory && photos.length > 0 && (
        <div className="wa-container" style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 20, height: 2, background: NG_YELLOW }} />
          <span className="font-cinzel" style={{
            color: 'rgba(255,255,255,0.28)', fontSize: '0.62rem',
            letterSpacing: '0.28em', textTransform: 'uppercase',
          }}>
            Click any folder to explore
          </span>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────── */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(2,6,4,0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); lbPrev(); }}
              style={{
                position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', border: `1px solid ${NG_YELLOW}`,
                color: NG_YELLOW, borderRadius: '2px', padding: '0.7rem 0.75rem',
                cursor: 'pointer', zIndex: 91,
              }}
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Next */}
          {lightboxIdx < currentPool.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); lbNext(); }}
              style={{
                position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', border: `1px solid ${NG_YELLOW}`,
                color: NG_YELLOW, borderRadius: '2px', padding: '0.7rem 0.75rem',
                cursor: 'pointer', zIndex: 91,
              }}
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => setActivePhoto(null)}
            style={{
              position: 'fixed', top: 16, right: 16,
              background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(255,255,255,0.2)`,
              color: '#fff', borderRadius: '2px', padding: '0.45rem',
              cursor: 'pointer', zIndex: 91,
            }}
          >
            <X size={18} />
          </button>

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '92vh', position: 'relative' }}
          >
            <img
              src={activePhoto.imageUrl}
              alt={activePhoto.title}
              style={{
                maxWidth: '90vw', maxHeight: '80vh',
                objectFit: 'contain', display: 'block',
                border: `3px solid ${NG_YELLOW}`,
              }}
            />

            {/* Caption bar — NatGeo style */}
            <div style={{
              background: NG_YELLOW,
              padding: '0.65rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '1rem',
            }}>
              <div>
                <div className="font-cinzel" style={{
                  color: '#050d08', fontSize: '0.82rem', fontWeight: 700,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  {activePhoto.title}
                </div>
                <div style={{
                  color: 'rgba(5,13,8,0.62)', fontSize: '0.62rem',
                  letterSpacing: '0.14em', marginTop: '0.15rem', textTransform: 'uppercase',
                }}>
                  {catMeta(activePhoto.category).label} · {catMeta(activePhoto.category).nepali}
                </div>
              </div>
              <div className="font-cinzel" style={{
                color: 'rgba(5,13,8,0.45)', fontSize: '0.6rem', letterSpacing: '0.12em',
                whiteSpace: 'nowrap',
              }}>
                {lightboxIdx + 1} / {currentPool.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
