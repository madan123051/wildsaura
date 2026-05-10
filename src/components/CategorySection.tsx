import React from 'react';
import { Category } from '../types';

const NG_YELLOW = '#E8C84A';
const PARCHMENT = '#F2E4C4';
const SAGE = 'rgba(197,217,181,0.75)';

interface CategorySectionProps {
  categories: Category[];
  onCategoryClick: (key: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ categories, onCategoryClick }) => {
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
            gap: '0.55rem',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            padding: '0.25rem 1.25rem 0.75rem',
            scrollbarWidth: 'none',
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryClick(cat.key)}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: 115,
                height: 145,
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
              {/* Photo */}
              <img
                src={cat.imageUrl}
                alt={cat.label}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                loading="lazy"
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
                bottom: 34,
                left: 10,
                width: 20,
                height: 2,
                background: NG_YELLOW,
              }} />

              {/* Label */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '0 10px 10px',
              }}>
                <div style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.67rem',
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
          ))}
        </div>

        {/* Scroll hint dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '5px',
          marginTop: '0.15rem',
        }}>
          {categories.map((_, i) => (
            <div key={i} style={{
              width: i === 0 ? 14 : 5,
              height: 3,
              borderRadius: 2,
              background: i === 0 ? NG_YELLOW : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>
    </section>
  );
};
