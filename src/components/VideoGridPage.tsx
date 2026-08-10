import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Play, SlidersHorizontal, X, Eye, Heart } from 'lucide-react';
import { Video, Comment, Visitor } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUrl';

interface VideoGridPageProps {
  videos: Video[];
  isLoading?: boolean;
  onVideoClick: (video: Video) => void;
  onBack: () => void;
  visitor: Visitor | null;
  videoComments: Record<string, Comment[]>;
  onAddVideoComment: (firestoreId: string, content: string) => void;
  onVideoLike: (videoId: number) => void;
  onVisitorLoginClick: () => void;
  isAdmin?: boolean;
  onDeleteComment?: (firestoreId: string) => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const VIDEO_PLACEHOLDER = '/images/placeholder-card.svg';
const WIDE_PAGE_MAX = 'calc(100vw - 4rem)';

const VideoThumbnail: React.FC<{ video: Video }> = ({ video }) => {
  const [loaded, setLoaded] = useState(false);
  const source = video.thumbnailUrl || VIDEO_PLACEHOLDER;
  const optimized = getOptimizedImageUrl(source, { width: 720, height: 405, quality: 72 }) || source;
  const candidates = useMemo(
    () => Array.from(new Set([optimized, source, VIDEO_PLACEHOLDER].filter(Boolean))),
    [optimized, source],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setCandidateIndex(0);
  }, [optimized, source]);

  return (
    <>
      {!loaded && (
        <div className="skeleton-image" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      )}
      <img
        src={candidates[candidateIndex] || VIDEO_PLACEHOLDER}
        alt={video.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s, opacity 0.25s', opacity: loaded ? 1 : 0 }}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (candidateIndex < candidates.length - 1) {
            setLoaded(false);
            setCandidateIndex((index) => index + 1);
          } else {
            setLoaded(true);
          }
        }}
      />
    </>
  );
};

const TagChips: React.FC<{ tags?: string[]; max?: number }> = ({ tags = [], max = 3 }) => (
  tags.length ? (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', margin: '0 0 0.6rem' }}>
      {tags.slice(0, max).map((tag) => (
        <span key={tag} style={{
          padding: '0.15rem 0.5rem', borderRadius: 9999, fontSize: '0.6rem',
          background: 'rgba(201,168,76,0.12)', color: 'var(--wa-gold-light)',
          border: '1px solid rgba(201,168,76,0.24)',
        }}>
          #{tag.replace(/^#/, '')}
        </span>
      ))}
    </div>
  ) : null
);

const getYear = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : String(d.getFullYear());
  } catch { return ''; }
};

const getMonthLabel = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return ''; }
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return dateStr; }
};

export const VideoGridPage: React.FC<VideoGridPageProps> = ({
  videos, isLoading = false, onVideoClick, onBack, visitor, videoComments, onAddVideoComment, onVideoLike, onVisitorLoginClick, isAdmin, onDeleteComment,
}) => {
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const years = useMemo(() => {
    const ys = new Set<string>();
    videos.forEach(v => { const y = getYear(v.createdAt); if (y) ys.add(y); });
    return ['all', ...Array.from(ys).sort((a, b) => Number(b) - Number(a))];
  }, [videos]);

  const months = useMemo(() => {
    const ms = new Set<string>();
    videos.forEach(v => {
      const y = getYear(v.createdAt);
      if (selectedYear === 'all' || y === selectedYear) {
        const m = getMonthLabel(v.createdAt);
        if (m) ms.add(m);
      }
    });
    return ['all', ...Array.from(ms)];
  }, [videos, selectedYear]);

  const filtered = useMemo(() => {
    return videos.filter(v => {
      const yearOk = selectedYear === 'all' || getYear(v.createdAt) === selectedYear;
      const monthOk = selectedMonth === 'all' || getMonthLabel(v.createdAt) === selectedMonth;
      return yearOk && monthOk;
    });
  }, [videos, selectedYear, selectedMonth]);

  const activeFilterCount = [selectedYear !== 'all', selectedMonth !== 'all'].filter(Boolean).length;

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
            aria-label="Back to home"
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
            <h1 className="font-playfair" style={{
              margin: 0, fontSize: '1.15rem', fontWeight: 600,
              color: 'var(--wa-text)', letterSpacing: '-0.01em',
            }}>
              Motion Journal
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
              {filtered.length} of {videos.length} videos
            </p>
          </div>

          <button
            onClick={() => setShowFilters(p => !p)}
            aria-expanded={showFilters}
            aria-controls="video-archive-filters"
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
          <div id="video-archive-filters" style={{
            maxWidth: WIDE_PAGE_MAX, margin: '0.75rem auto 0',
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--wa-gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
                Year
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {years.map(y => (
                  <button key={y} onClick={() => { setSelectedYear(y); setSelectedMonth('all'); }} style={{
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
              <button onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }} style={{
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
        {isLoading && videos.length === 0 ? (
          <div className="video-archive-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton-card" style={{ overflow: 'hidden', borderRadius: 14 }}>
                <div className="skeleton-image" style={{ width: '100%', aspectRatio: '16/9' }} />
                <div style={{ padding: '0.875rem' }}>
                  <div className="skeleton-text medium" />
                  <div className="skeleton-text short" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <Play size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, display: 'block' }} />
            <p className="font-cinzel" style={{ color: 'var(--wa-text-muted)', fontSize: '0.875rem' }}>
              No videos match the selected filters.
            </p>
            <button onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }} style={{
              marginTop: '1rem', padding: '0.5rem 1.5rem',
              background: 'var(--wa-gold)', color: '#062013',
              border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700,
            }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="video-archive-grid">
            {filtered.map(video => {
              const isPlaying = playingId === video.id;
              return (
                <div
                  key={video.id}
                  style={{
                    borderRadius: 14, overflow: 'hidden',
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
                  <div style={{
                    position: 'relative', background: '#000', overflow: 'hidden',
                    aspectRatio: (video as any).aspectRatio ? (video as any).aspectRatio.replace(':', '/') : '16/9',
                    maxHeight: 300,
                  }}>
                    {isPlaying ? (
                      <video
                        src={video.videoUrl}
                        controls
                        autoPlay
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                        onEnded={() => setPlayingId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label={`Play ${video.title}`}
                        style={{ cursor: 'pointer', position: 'relative', width: '100%', height: '100%', display: 'block', padding: 0, border: 0, background: 'transparent' }}
                        onClick={() => setPlayingId(video.id)}
                      >
                        <VideoThumbnail video={video} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.3)',
                        }}>
                          <div style={{
                            width: 52, height: 52,
                            background: 'rgba(201,168,76,0.9)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
                          }}>
                            <Play size={22} style={{ color: '#062013', marginLeft: 2 }} fill="#062013" />
                          </div>
                        </div>
                        {video.duration && (
                          <span style={{
                            position: 'absolute', bottom: 8, right: 8,
                            background: 'rgba(0,0,0,0.8)',
                            color: '#fff', fontSize: '0.7rem', fontWeight: 600,
                            padding: '0.2rem 0.5rem', borderRadius: 4,
                          }}>{video.duration}</span>
                        )}
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '0.875rem' }}>
                    <h3 className="font-playfair" style={{
                      fontSize: '0.95rem', fontWeight: 700, color: 'var(--wa-text)',
                      margin: '0 0 0.4rem', lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      <a
                        href={`/video/${encodeURIComponent(video.firestoreId || String(video.id))}`}
                        onClick={(event) => {
                          event.preventDefault();
                          onVideoClick(video);
                        }}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {video.title}
                      </a>
                    </h3>
                    {video.description && (
                      <p style={{
                        fontSize: '0.78rem', color: 'var(--wa-text-muted)', margin: '0 0 0.6rem',
                        lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{video.description}</p>
                    )}
                    <TagChips tags={video.tags} max={3} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--wa-text-muted)' }}>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Eye size={11} /> {video.viewCount || 0}
                        </span>
                        <button
                          type="button"
                          aria-label={`${(video as any).liked ? 'Unlike' : 'Like'} ${video.title}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: (video as any).liked ? '#ff6b9d' : undefined, padding: 0, border: 0, background: 'transparent', font: 'inherit' }}
                          onClick={() => onVideoLike(video.id)}
                        >
                          <Heart size={11} fill={(video as any).liked ? '#ff6b9d' : 'none'} /> {video.likeCount || 0}
                        </button>
                      </div>
                      <span>{formatDate(video.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
