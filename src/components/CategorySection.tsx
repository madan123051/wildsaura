import React from 'react';
import { Category } from '../types';

interface CategorySectionProps {
  categories: Category[];
  onCategoryClick: (key: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ categories, onCategoryClick }) => {
  return (
    <section className="bg-wa-dark-alt" style={{ padding: '4rem 0' }}>
      <div className="wa-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryClick(cat.key)}
              className="group"
              style={{
                position: 'relative',
                height: '14rem',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                cursor: 'pointer',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                padding: 0,
              }}
            >
              <img
                src={cat.imageUrl}
                alt={cat.label}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.7s',
                }}
                loading="lazy"
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1))',
                transition: 'background 0.3s',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                border: '2px solid transparent',
                borderRadius: '0.75rem',
                transition: 'border-color 0.3s',
              }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem' }}>
                <h3
                  className="font-playfair"
                  style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.02em', marginBottom: '0.5rem', color: '#d4a853' }}
                >
                  {cat.label}
                </h3>
                <div className="gold-line" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
