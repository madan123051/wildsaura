import React, { useState } from 'react';
import { Category } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUrl';

const NG_YELLOW = '#9fcb8f';
const PARCHMENT = '#e8f5e9';
const CATEGORY_PLACEHOLDER = '/images/placeholder-card.svg';

interface CategorySectionProps {
  categories: Category[];
  onCategoryClick: (key: string) => void;
  /** When true, renders shimmer skeleton placeholders while Firestore photos load */
  loading?: boolean;
}

/** Skeleton placeholder card — matches CategoryCard dimensions exactly */
const SkeletonCard: React.FC = () => (
  <div
    style={{
      flexShrink: 0,
      width: 'clamp(115px, 8vw, 190px)',
      height: 'clamp(145px, 10vw, 238px)',
      borderRadius: '6px',
      overflow: 'hidden',
      scrollSnapAlign: 'start',
      background: '#111',
    }}
  >
    <div className="skeleton-image" style={{ width: '100%', height: '100%' }} />
  </div>
);

/** Number of skeleton cards to show while loading (matches real category count) */
const SKELETON_COUNT = 7;

export const CategorySection: React.FC<CategorySectionProps> = ({ categories, onCategoryClick, loading = false }) => {
  return (
    <section className="bg-wa-dark-alt" style={{ padding: '1.75rem 0 2rem' }}>
      <div className="wa-container" style={{ paddingLeft: 0, paddingRight: 0 }}>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 1.25rem', marginBottom: '0.9rem' }}>
          <div style={{ width: 22, height: 3, background: NG_YELLOW, flexShrink: 0 }} />
          <span style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.65rem',
            letterSpacing: '0.28em',
            color: NG_YELLOW,
            textTransform: 'uppercase',
          }}>
            Browse by Category
          </span>
        </div>

        {/* Horizontal scroll strip */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(0.55rem, 1vw, 1rem)',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            padding: '0.25rem clamp(1.25rem, 4vw, 4rem) 0.75rem',
            scrollbarWidth: 'none',
          }}
        >
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)
            : categories.map((cat) => (
                <CategoryCard key={cat.key} cat={cat} onClick={() => onCategoryClick(cat.key)} />
              ))}
        </div>

        {/* Scroll hint dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '5px',
          marginTop: '0.15rem',
        }}>
          {Array.from({ length: loading ? SKELETON_COUNT : categories.length }).map((_, i) => (
            <div key={i} style={{
              width: i === 0 ? 14 : 5,
              height: 3,
              borderRadius: 2,
              background: loading
                ? 'rgba(255,255,255,0.12)'
                : i === 0 ? NG_YELLOW : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>
    </section>
  );
};

/** Individual category card with optimized loading */
const CategoryCard: React.FC<{ cat: Category; onClick: () => void }> = ({ cat, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const optimizedUrl = getOptimizedImageUrl(cat.imageUrl, {
    width: 260,
    height: 330,
    quality: 68,
    maxAge: '14d',
  });

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: 'clamp(115px, 8vw, 190px)',
        height: 'clamp(145px, 10vw, 238px)',
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        background: '#111',
        scrollSnapAlign: 'start',
        transition: 'transform 0.22s, box-shadow 0.22s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px) scale(1.04)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 2px ${NG_YELLOW}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'none';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
    >
      {/* Skeleton loader while image loads */}
      {!loaded && !error && (
        <div className="skeleton-image" style={{
          position: 'absolute',
          inset: 0,
        }} />
      )}

      {/* Optimized thumbnail image */}
      <img
        src={error ? (cat.imageUrl || CATEGORY_PLACEHOLDER) : (optimizedUrl || CATEGORY_PLACEHOLDER)}
        alt={cat.label}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!error) {
            setError(true);
          } else {
            setLoaded(true);
          }
        }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0.05) 100%)',
      }} />

      {/* NatGeo yellow accent bar */}
      <div style={{
        position: 'absolute',
        bottom: 'clamp(34px, 2.8vw, 58px)',
        left: 'clamp(10px, 1vw, 18px)',
        width: 'clamp(20px, 1.8vw, 34px)',
        height: 2,
        background: NG_YELLOW,
      }} />

      {/* Label */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0 clamp(10px, 1vw, 18px) clamp(10px, 1vw, 18px)',
      }}>
        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 'clamp(0.67rem, 0.58vw, 0.92rem)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: PARCHMENT,
          textTransform: 'uppercase',
          lineHeight: 1.25,
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
        }}>
          {cat.label}
        </div>
      </div>


    </button>
  );
};
