import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Camera, SlidersHorizontal, X } from 'lucide-react';
import { Photo, FilterTab } from '../types';
import { PhotoCard } from './PhotoCard';

const useWindowSize = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
};

interface PhotoGridPageProps {
  photos: Photo[];
  filterTabs: FilterTab[];
  isLoading?: boolean;
  onBack: () => void;
  onPhotoClick: (photo: Photo) => void;
  onLike: (id: number) => void;
  onShare: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  initialCategory?: string;
  onCategoryChange?: (category: string) => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getMonthYear = (dateStr: string | any): string => {
  if (!dateStr) return '';
  try {
    const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return ''; }
};

const getYear = (dateStr: string | any): string => {
  if (!dateStr) return '';
  try {
    const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return String(d.getFullYear());
  } catch { return ''; }
};

export const PhotoGridPage: React.FC<PhotoGridPageProps> = ({
  photos,
  filterTabs,
  isLoading = false,
  onBack,
  onPhotoClick,
  onLike,
  onShare,
  onDownload,
  isLoggedIn,
  onLoginRequired,
  initialCategory = 'all',
  onCategoryChange,
}) => {
  const [selectedCategory, setSelectedCategoryState] = useState(initialCategory);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    setSelectedCategoryState(initialCategory);
  }, [initialCategory]);

  const setSelectedCategory = (category: string) => {
    setSelectedCategoryState(category);
    onCategoryChange?.(category);
    if (typeof window !== 'undefined') {
      const nextPath = category === 'all' ? '/photo-grid' : `/category/${encodeURIComponent(category)}`;
      window.history.pushState({}, '', nextPath);
    }
  };
  const width = useWindowSize();
  
  const getGridCols = () => {
    if (width < 640) return 2;
    if (width < 1024) return 3;
    return 4;
  };

  const published = useMemo(() => photos.filter(p => p.published !== false), [photos]);

  const years = useMemo(() => {
    const ys = new Set<string>();
    published.forEach(p => { const y = getYear(p.createdAt); if (y) ys.add(y); });
    return ['all', ...Array.from(ys).sort((a, b) => Number(b) - Number(a))];
  }, [published]);

  const months = useMemo(() => {
    const ms = new Set<string>();
    published.forEach(p => {
      const y = getYear(p.createdAt);
      if (selectedYear === 'all' || y === selectedYear) {
        const m = getMonthYear(p.createdAt);
        if (m) ms.add(m);
      }
    });
    return ['all', ...Array.from(ms)];
  }, [published, selectedYear]);

  const filtered = useMemo(() => {
    return published.filter(p => {
      const catOk = selectedCategory === 'all' || p.category === selectedCategory;
      const yearOk = selectedYear === 'all' || getYear(p.createdAt) === selectedYear;
      const monthOk = selectedMonth === 'all' || getMonthYear(p.createdAt) === selectedMonth;
      return catOk && yearOk && monthOk;
    });
  }, [published, selectedCategory, selectedYear, selectedMonth]);

  const activeFilterCount = [
    selectedCategory !== 'all',
    selectedYear !== 'all',
    selectedMonth !== 'all',
  ].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '3rem' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,20,15,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '0.875rem 1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: 1200, margin: '0 auto' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, flexShrink: 0,
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '50%', cursor: 'pointer',
              color: 'var(--wa-gold)', transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.25)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.12)'; }}
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ flex: 1 }}>
            <h1 className="font-cinzel" style={{
              margin: 0, fontSize: '1rem', fontWeight: 700,
              color: 'var(--wa-gold)', letterSpacing: '0.05em',
            }}>
              📷 All Photos
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
              {filtered.length} of {published.length} photos
            </p>
          </div>

          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.875rem',
              background: showFilters ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: 20, cursor: 'pointer',
              color: 'var(--wa-gold)', fontSize: '0.8rem', fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <SlidersHorizontal size={14} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {showFilters && (
          <div style={{
            maxWidth: 1200, margin: '0.75rem auto 0',
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--wa-gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Category
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCategory(tab.key)}
                    style={{
                      padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: selectedCategory === tab.key ? 'var(--wa-gold)' : 'rgba(255,255,255,0.05)',
                      color: selectedCategory === tab.key ? '#062013' : 'var(--wa-text-muted)',
                      border: selectedCategory === tab.key ? '1px solid var(--wa-gold)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--wa-gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Year
              </label>
              <select
                value={selectedYear}
                onChange={e => { setSelectedYear(e.target.value); setSelectedMonth('all'); }}
                style={{
                  background: '#1a2a1f', color: 'var(--wa-text)',
                  border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8,
                  padding: '0.4rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                {years.map(y => <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--wa-gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{
                  background: '#1a2a1f', color: 'var(--wa-text)',
                  border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8,
                  padding: '0.4rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                {months.map(m => <option key={m} value={m}>{m === 'all' ? 'All Months' : m}</option>)}
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSelectedCategory('all'); setSelectedYear('all'); setSelectedMonth('all'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.4rem 0.75rem',
                  background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)',
                  borderRadius: 8, cursor: 'pointer', color: '#ff6b6b', fontSize: '0.78rem', fontWeight: 600,
                }}
              >
                <X size={12} /> Clear All
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {isLoading && published.length === 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${getGridCols()}, 1fr)`,
            gap: '0.75rem',
          }}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton-card" style={{ overflow: 'hidden', borderRadius: '0.75rem' }}>
                <div className="skeleton-image" style={{ width: '100%', aspectRatio: '1/1' }} />
                <div style={{ padding: '0.75rem' }}>
                  <div className="skeleton-text medium" />
                  <div className="skeleton-text short" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <Camera size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, display: 'block' }} />
            <p className="font-cinzel" style={{ color: 'var(--wa-text-muted)', fontSize: '0.875rem' }}>
              No photos match the selected filters.
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedYear('all'); setSelectedMonth('all'); }}
              style={{
                marginTop: '1rem', padding: '0.5rem 1.5rem',
                background: 'var(--wa-gold)', color: '#062013',
                border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700,
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${getGridCols()}, 1fr)`,
            gap: '0.75rem',
          }}>
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
    </div>
  );
};
