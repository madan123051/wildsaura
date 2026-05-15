import React, { useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { Photo } from '../types';
import { PhotoCard } from './PhotoCard';

interface PhotoGridViewProps {
  photos: Photo[];
  onBack: () => void;
  onPhotoClick: (photo: Photo) => void;
  onLike: (id: number) => void;
  onShare: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export const PhotoGridView: React.FC<PhotoGridViewProps> = ({
  photos,
  onBack,
  onPhotoClick,
  onLike,
  onShare,
  onDownload,
  isLoggedIn,
  onLoginRequired,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique months and categories from photos
  const months = [
    'all',
    ...Array.from(
      new Set(
        photos
          .filter(p => p.createdAt)
          .map(p => p.createdAt!.slice(0, 7))
      )
    ).sort().reverse(),
  ];

  const categories = [
    'all',
    ...Array.from(new Set(photos.map(p => p.category))).sort(),
  ];

  // Filter photos based on selected month and category
  const filtered = photos.filter(p => {
    if (!p.published) return false;

    const photoMonth = p.createdAt?.slice(0, 7);
    const monthMatch = selectedMonth === 'all' || photoMonth === selectedMonth;
    const categoryMatch = selectedCategory === 'all' || p.category === selectedCategory;

    return monthMatch && categoryMatch;
  });

  const formatMonthYear = (monthStr: string): string => {
    try {
      const d = new Date(monthStr + '-01');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } catch {
      return monthStr;
    }
  };

  return (
    <section style={{ padding: '2rem 0', background: 'var(--wa-dark)', minHeight: '100vh' }}>
      <div className="wa-container">
        {/* Header with Back Button */}
        <div style={{ marginBottom: '2.5rem' }}>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--wa-gold)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <ArrowLeft size={18} /> Back to Home
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              📷 All Photos
            </h2>
            <span
              style={{
                background: 'rgba(201,168,76,0.2)',
                color: 'var(--wa-gold)',
                padding: '0.25rem 0.75rem',
                borderRadius: '50px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              {filtered.length}
            </span>
          </div>
          <div className="section-line" />
        </div>

        {/* Filter Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            background: 'rgba(10,10,10,0.3)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(201,168,76,0.1)',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--wa-gold)',
                marginBottom: '0.5rem',
              }}
            >
              📅 Filter by Date
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--wa-dark)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--wa-text)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Dates</option>
              {months.slice(1).map(month => (
                <option key={month} value={month}>
                  {formatMonthYear(month)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--wa-gold)',
                marginBottom: '0.5rem',
              }}
            >
              🏷️ Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--wa-dark)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--wa-text)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Categories</option>
              {categories.slice(1).map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Photo Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <Camera size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p
              className="font-cinzel text-wa-muted"
              style={{ fontSize: '0.875rem' }}
            >
              No photos match the selected filters.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {filtered.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
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
      </div>
    </section>
  );
};
