import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, BookOpen, SlidersHorizontal, X, Clock, Eye, Heart } from 'lucide-react';
import { Story } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUrl';

const useWindowSize = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
};

interface StoryGridPageProps {
  stories: Story[];
  isLoading?: boolean;
  onBack: () => void;
  onStoryClick: (story: Story) => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WIDE_PAGE_MAX = 'calc(100vw - 4rem)';

const getYear = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return String(d.getFullYear());
  } catch { return ''; }
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return dateStr; }
};

const estimateReadTime = (content: string): number =>
  Math.max(1, Math.ceil((content || '').split(/\s+/).length / 200));

const STORY_PLACEHOLDER = '/images/placeholder-card.svg';

const SkeletonStoryGrid = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.25rem',
  }}>
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="skeleton-card" style={{ overflow: 'hidden', borderRadius: 14 }}>
        <div className="skeleton-image" style={{ width: '100%', height: 180 }} />
        <div style={{ padding: '0.875rem' }}>
          <div className="skeleton-text medium" />
          <div className="skeleton-text full" />
          <div className="skeleton-text short" />
        </div>
      </div>
    ))}
  </div>
);

export const StoryGridPage: React.FC<StoryGridPageProps> = ({ stories, isLoading = false, onBack, onStoryClick }) => {
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const width = useWindowSize();
  
  const getGridCols = () => {
    if (width < 640) return 2;
    if (width < 1024) return 2;
    if (width < 1440) return 3;
    if (width < 1920) return 4;
    if (width < 2400) return 5;
    return 6;
  };

  const years = useMemo(() => {
    const ys = new Set<string>();
    stories.forEach(s => { const y = getYear(s.createdAt); if (y) ys.add(y); });
    return ['all', ...Array.from(ys).sort((a, b) => Number(b) - Number(a))];
  }, [stories]);

  const tags = useMemo(() => {
    const ts = new Set<string>();
    stories.forEach(s => (s.tags || []).forEach(t => ts.add(t)));
    return ['all', ...Array.from(ts).sort()];
  }, [stories]);

  const filtered = useMemo(() => {
    return stories.filter(s => {
      const yearOk = selectedYear === 'all' || getYear(s.createdAt) === selectedYear;
      const tagOk = selectedTag === 'all' || (s.tags || []).includes(selectedTag);
      return yearOk && tagOk;
    });
  }, [stories, selectedYear, selectedTag]);

  const activeFilterCount = [selectedYear !== 'all', selectedTag !== 'all'].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-bg)', paddingBottom: '3rem' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,20,15,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '0.875rem 1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: WIDE_PAGE_MAX, margin: '0 auto' }}>
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
              📖 All Stories
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
              {filtered.length} of {stories.length} stories
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
            }}
          >
            <SlidersHorizontal size={14} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {showFilters && (
          <div style={{
            maxWidth: WIDE_PAGE_MAX, margin: '0.75rem auto 0',
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--wa-gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Year
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {years.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} style={{
                    padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedYear === y ? 'var(--wa-gold)' : 'rgba(255,255,255,0.05)',
                    color: selectedYear === y ? '#062013' : 'var(--wa-text-muted)',
                    border: selectedYear === y ? '1px solid var(--wa-gold)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {y === 'all' ? 'All Years' : y}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--wa-gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Tag
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {tags.map(t => (
                  <button key={t} onClick={() => setSelectedTag(t)} style={{
                    padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedTag === t ? 'rgba(108,92,231,0.8)' : 'rgba(255,255,255,0.05)',
                    color: selectedTag === t ? '#fff' : 'var(--wa-text-muted)',
                    border: selectedTag === t ? '1px solid rgba(108,92,231,0.8)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {t === 'all' ? 'All Tags' : t}
                  </button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button onClick={() => { setSelectedYear('all'); setSelectedTag('all'); }} style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)',
                borderRadius: 8, cursor: 'pointer', color: '#ff6b6b', fontSize: '0.78rem', fontWeight: 600,
              }}>
                <X size={12} /> Clear All
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ maxWidth: WIDE_PAGE_MAX, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {isLoading && stories.length === 0 ? (
          <SkeletonStoryGrid />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, display: 'block' }} />
            <p className="font-cinzel" style={{ color: 'var(--wa-text-muted)', fontSize: '0.875rem' }}>
              No stories match the selected filters.
            </p>
            <button onClick={() => { setSelectedYear('all'); setSelectedTag('all'); }} style={{
              marginTop: '1rem', padding: '0.5rem 1.5rem',
              background: 'var(--wa-gold)', color: '#062013',
              border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700,
            }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${getGridCols()}, 1fr)`,
            gap: '1.25rem',
          }}>
            {filtered.map((story, index) => (
              <div
                key={story.id}
                onClick={() => onStoryClick(story)}
                style={{
                  cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
                  background: 'var(--wa-dark-card)',
                  border: '1px solid var(--wa-border)',
                  transition: 'border-color 0.3s, transform 0.3s',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'var(--wa-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={getOptimizedImageUrl(story.coverImageUrl, { width: 560, height: 360, quality: 72 }) || story.coverImageUrl || STORY_PLACEHOLDER}
                    alt={story.title}
                    style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block', transition: 'transform 0.5s' }}
                    loading={index < 6 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '1.5rem 0.75rem 0.6rem',
                  }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {(story.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.6rem',
                          background: 'rgba(201,168,76,0.2)', color: 'var(--wa-gold-light)',
                          border: '1px solid rgba(201,168,76,0.3)',
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0.875rem' }}>
                  <h3 className="font-playfair" style={{
                    fontSize: '0.95rem', fontWeight: 700, color: 'var(--wa-text)',
                    margin: '0 0 0.5rem', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    <a
                      href={`/story/${encodeURIComponent(story.slug || story.firestoreId || String(story.id))}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onStoryClick(story);
                      }}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {story.title}
                    </a>
                  </h3>
                  <p style={{
                    fontSize: '0.78rem', color: 'var(--wa-text-muted)', margin: '0 0 0.75rem',
                    lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{story.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--wa-text-muted)' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} /> {estimateReadTime(story.content)} min
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye size={11} /> {story.viewCount || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Heart size={11} /> {story.likeCount || 0}
                      </span>
                    </div>
                    <span>{formatDate(story.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
