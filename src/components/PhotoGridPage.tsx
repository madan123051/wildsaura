import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Camera, SlidersHorizontal, X } from 'lucide-react';
import { Photo, FilterTab } from '../types';
import { PhotoCard } from './PhotoCard';
import { sortByCreatedAtDesc } from '../utils/dateSort';

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
const WIDE_PAGE_MAX = 'calc(100vw - 4rem)';

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
      const nextPath = category === 'all' ? '/photos' : `/category/${encodeURIComponent(category)}`;
      window.history.pushState({}, '', nextPath);
    }
  };
  const published = useMemo(() => sortByCreatedAtDesc(photos.filter(p => p.published !== false)), [photos]);

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
      <div style={{
        background: 'var(--wa-dark)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '0.875rem 1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: WIDE_PAGE_MAX, margin: '0 auto' }}>
          <button
            onClick={onBack}
            aria-label="Back to home"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, flexShrink: 0,
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
            <h1 className="font-playfair" style={{
              margin: 0, fontSize: '1.15rem', fontWeight: 600,
              color: 'var(--wa-text)', letterSpacing: '-0.01em',
            }}>
              Photographic Archive
            </h1>
            <p role="status" aria-live="polite" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
              {isLoading && published.length === 0
                ? 'Loading photos…'
                : `${filtered.length} of ${published.length} photos`}
            </p>
          </div>

          <button
            onClick={() => setShowFilters(p => !p)}
            aria-expanded={showFilters}
            aria-controls="photo-archive-filters"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              minHeight: 44, padding: '0.45rem 0.875rem',
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
          <div id="photo-archive-filters" style={{
            maxWidth: WIDE_PAGE_MAX, margin: '0.75rem auto 0',
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end',
          }}>
            <div role="group" aria-labelledby="photo-category-label">
              <span id="photo-category-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--wa-gold-light)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Category
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCategory(tab.key)}
                    aria-pressed={selectedCategory === tab.key}
                    style={{
                      minHeight: 44, padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
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
              <label htmlFor="photo-year-filter" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--wa-gold-light)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Year
              </label>
              <select
                id="photo-year-filter"
                value={selectedYear}
                onChange={e => { setSelectedYear(e.target.value); setSelectedMonth('all'); }}
                style={{
                  background: '#1a2a1f', color: 'var(--wa-text)',
                  border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8,
                  minHeight: 44, padding: '0.4rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                {years.map(y => <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="photo-month-filter" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--wa-gold-light)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Month
              </label>
              <select
                id="photo-month-filter"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{
                  background: '#1a2a1f', color: 'var(--wa-text)',
                  border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8,
                  minHeight: 44, padding: '0.4rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
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
                  minHeight: 44, padding: '0.4rem 0.75rem',
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

      <div style={{ maxWidth: WIDE_PAGE_MAX, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {isLoading && published.length === 0 ? (
          <div role="status" aria-live="polite" style={{ minHeight: 240, display: 'grid', placeItems: 'center', color: 'var(--wa-text-muted)', fontSize: '0.875rem' }}>
            Loading photos…
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
                minHeight: 44, marginTop: '1rem', padding: '0.5rem 1.5rem',
                background: 'var(--wa-gold)', color: '#062013',
                border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700,
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="photo-archive-grid">
            {filtered.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => onPhotoClick(photo)}
                onLike={() => onLike(photo.id)}
                onShare={() => onShare(photo)}
                onDownload={() => onDownload(photo)}
                isLoggedIn={isLoggedIn}
                onLoginRequired={onLoginRequired}
                priority={index < 8}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
