import React, { useState } from 'react';
import { ArrowLeft, Play, Eye, Heart, CalendarDays } from 'lucide-react';
import { Video } from '../types';

interface VideoGridViewProps {
  videos: Video[];
  onBack: () => void;
  onVideoClick: (video: Video) => void;
  onVideoLike: (videoId: number) => void;
}

export const VideoGridView: React.FC<VideoGridViewProps> = ({
  videos,
  onBack,
  onVideoClick,
  onVideoLike,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Extract unique months
  const months = [
    'all',
    ...Array.from(
      new Set(
        videos
          .filter(v => v.createdAt)
          .map(v => v.createdAt!.slice(0, 7))
      )
    ).sort().reverse(),
  ];

  // Filter videos based on selected month
  const filtered = videos.filter(v => {
    const videoMonth = v.createdAt?.slice(0, 7);
    return selectedMonth === 'all' || videoMonth === selectedMonth;
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
    <section
      style={{
        padding: '2rem 0',
        background: 'linear-gradient(180deg, var(--wa-dark) 0%, rgba(10,10,10,1) 100%)',
        minHeight: '100vh',
      }}
    >
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
              🎬 All Videos
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
            display: 'flex',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            background: 'rgba(10,10,10,0.3)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(201,168,76,0.1)',
            maxWidth: '400px',
          }}
        >
          <div style={{ flex: 1 }}>
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
        </div>

        {/* Videos Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.875rem' }}>
              No videos match the selected filters.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {filtered.map(video => (
              <div
                key={video.id}
                style={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: 'var(--wa-dark-card)',
                  border: '1px solid var(--wa-border)',
                  transition: 'border-color 0.3s, transform 0.3s',
                  cursor: 'pointer',
                }}
                onClick={() => onVideoClick(video)}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--wa-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Video Thumbnail with Play Button */}
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#000',
                    aspectRatio: '16/9',
                  }}
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s',
                    }}
                    onMouseOver={(e) => {
                      (e.target as HTMLImageElement).style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                      (e.target as HTMLImageElement).style.transform = 'scale(1)';
                    }}
                  />
                  {/* Play Button Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.3s',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '0';
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(201,168,76,0.9)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Play size={32} fill="currentColor" color="#062013" />
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '1.25rem' }}>
                  <h3
                    className="font-playfair"
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--wa-text)',
                      marginBottom: '0.75rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {video.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--wa-text-muted)',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {video.description}
                  </p>

                  {/* Date */}
                  {video.createdAt && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.68rem',
                        color: 'var(--wa-gold)',
                        opacity: 0.75,
                        marginBottom: '0.6rem',
                      }}
                    >
                      <CalendarDays size={11} />
                      <span>{video.createdAt}</span>
                    </div>
                  )}

                  {/* Stats */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: 'var(--wa-text-muted)',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(201,168,76,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Eye size={12} /> {video.viewCount || 0}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onVideoLike(video.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: 'rgba(201,168,76,0.6)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        transition: 'color 0.3s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.color = 'var(--wa-gold)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.color = 'rgba(201,168,76,0.6)';
                      }}
                    >
                      <Heart size={12} /> {video.likeCount || 0}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
