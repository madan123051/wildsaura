import React, { useState, useMemo } from 'react';
import { ArrowLeft, BookOpen, SlidersHorizontal, X, Clock, Eye, Heart } from 'lucide-react';
import { Story } from '../types';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';

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

const StoryArchiveCover: React.FC<{ story: Story; priority: boolean }> = ({ story, priority }) => {
  const originalImage = story.coverImageUrl || STORY_PLACEHOLDER;
  const image = getOptimizedImageUrl(story.coverImageUrl, {
    width: 960,
    quality: 84,
    fit: 'cover',
  }) || originalImage;
  const srcSet = getOptimizedSrcSet(story.coverImageUrl, [480, 640, 800, 960, 1200, 1600], {
    quality: 84,
    fit: 'cover',
  });

  return (
    <img
      src={image}
      srcSet={srcSet}
      sizes="(max-width: 580px) calc(100vw - 2rem), (max-width: 900px) 50vw, 33vw"
      alt={story.title}
      width={960}
      height={600}
      style={{
        width: '100%',
        height: 'auto',
        aspectRatio: '16 / 10',
        objectFit: 'cover',
        display: 'block',
        transition: 'transform 0.5s',
      }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={(event) => {
        const target = event.currentTarget;
        target.srcset = '';
        if (target.dataset.originalFallback !== 'true' && image !== originalImage) {
          target.dataset.originalFallback = 'true';
          target.src = originalImage;
          return;
        }
        target.onerror = null;
        target.src = STORY_PLACEHOLDER;
      }}
    />
  );
};

export const StoryGridPage: React.FC<StoryGridPageProps> = ({ stories, isLoading = false, onBack, onStoryClick }) => {
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
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
              Field Stories
            </h1>
            <p role="status" aria-live="polite" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
              {isLoading && stories.length === 0
                ? 'Loading stories…'
                : `${filtered.length} of ${stories.length} stories`}
            </p>
          </div>

          <button
            onClick={() => setShowFilters(p => !p)}
            aria-expanded={showFilters}
            aria-controls="story-archive-filters"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              minHeight: 44, padding: '0.45rem 0.875rem',
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
          <div id="story-archive-filters" style={{
            maxWidth: WIDE_PAGE_MAX, margin: '0.75rem auto 0',
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end',
          }}>
            <div role="group" aria-labelledby="story-year-label">
              <span id="story-year-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--wa-gold-light)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Year
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {years.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} aria-pressed={selectedYear === y} style={{
                    minHeight: 44, padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
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

            <div role="group" aria-labelledby="story-tag-label">
              <span id="story-tag-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--wa-gold-light)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Tag
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {tags.map(t => (
                  <button key={t} onClick={() => setSelectedTag(t)} aria-pressed={selectedTag === t} style={{
                    minHeight: 44, padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
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
                minHeight: 44, padding: '0.4rem 0.75rem',
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
          <div role="status" aria-live="polite" style={{ minHeight: 240, display: 'grid', placeItems: 'center', color: 'var(--wa-text-muted)', fontSize: '0.875rem' }}>
            Loading stories…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, display: 'block' }} />
            <p className="font-cinzel" style={{ color: 'var(--wa-text-muted)', fontSize: '0.875rem' }}>
              No stories match the selected filters.
            </p>
            <button onClick={() => { setSelectedYear('all'); setSelectedTag('all'); }} style={{
              minHeight: 44, marginTop: '1rem', padding: '0.5rem 1.5rem',
              background: 'var(--wa-gold)', color: '#062013',
              border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700,
            }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="story-archive-grid">
            {filtered.map((story, index) => (
              <a
                key={story.id}
                href={`/story/${encodeURIComponent(story.slug || story.firestoreId || String(story.id))}`}
                aria-label={`Read ${story.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  onStoryClick(story);
                }}
                style={{
                  display: 'block', cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
                  background: 'var(--wa-dark-card)',
                  border: '1px solid var(--wa-border)',
                  color: 'inherit', textDecoration: 'none',
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
                  <StoryArchiveCover story={story} priority={index < 3} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '1.5rem 0.75rem 0.6rem',
                  }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {(story.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.75rem',
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
                    {story.title}
                  </h3>
                  <p style={{
                    fontSize: '0.78rem', color: 'var(--wa-text-muted)', margin: '0 0 0.75rem',
                    lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{story.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
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
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
