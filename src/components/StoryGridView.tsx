import React, { useState } from 'react';
import { ArrowLeft, Clock, Eye, Heart, CalendarDays } from 'lucide-react';
import { Story } from '../types';

const formatStoryDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const estimateReadTime = (content: string): number => Math.max(1, Math.ceil(content.split(/\s+/).length / 200));

interface StoryGridViewProps {
  stories: Story[];
  onBack: () => void;
  onStoryClick: (story: Story) => void;
}

export const StoryGridView: React.FC<StoryGridViewProps> = ({ stories, onBack, onStoryClick }) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Extract unique years and tags
  const years = [
    'all',
    ...Array.from(
      new Set(stories.filter(s => s.createdAt).map(s => s.createdAt.slice(0, 4)))
    ).sort().reverse(),
  ];

  const allTags = Array.from(
    new Set(stories.flatMap(s => s.tags))
  ).sort();

  // Filter stories based on selected year and tag
  const filtered = stories.filter(s => {
    const yearMatch = selectedYear === 'all' || s.createdAt.slice(0, 4) === selectedYear;
    const tagMatch = selectedTag === 'all' || s.tags.includes(selectedTag);
    return yearMatch && tagMatch;
  });

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
              📖 All Stories
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
              📅 Filter by Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
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
              <option value="all">All Years</option>
              {years.slice(1).map(year => (
                <option key={year} value={year}>
                  {year}
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
              🏷️ Filter by Tag
            </label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
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
              <option value="all">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stories Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.875rem' }}>
              No stories match the selected filters.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {filtered.map(story => (
              <div
                key={story.id}
                onClick={() => onStoryClick(story)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: 'var(--wa-dark-card)',
                  border: '1px solid var(--wa-border)',
                  transition: 'border-color 0.3s, transform 0.3s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--wa-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Cover Image */}
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={story.coverImageUrl}
                    alt={story.title}
                    style={{
                      width: '100%',
                      height: 200,
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
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '1.5rem 1rem 0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {story.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.6rem',
                            background: 'rgba(201,168,76,0.2)',
                            color: 'var(--wa-gold-light)',
                            border: '1px solid rgba(201,168,76,0.3)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '1.25rem' }}>
                  <h3
                    className="font-playfair"
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--wa-text)',
                      marginBottom: '0.5rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {story.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--wa-text-muted)',
                      lineHeight: 1.6,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {story.excerpt}
                  </p>

                  {/* Date */}
                  {story.createdAt && formatStoryDate(story.createdAt) && (
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
                      <span>{formatStoryDate(story.createdAt)}</span>
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
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} /> {estimateReadTime(story.content)} min read
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Eye size={12} /> {story.viewCount}
                      </span>
                    </div>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: 'rgba(201,168,76,0.6)',
                      }}
                    >
                      <Heart size={12} /> {story.likeCount}
                    </span>
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
