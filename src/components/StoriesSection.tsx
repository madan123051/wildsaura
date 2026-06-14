import React from 'react';
import { Clock, Eye, Heart, ArrowRight, CalendarDays } from 'lucide-react';

const formatStoryDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
import { Story } from '../types';

interface StoriesSectionProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
  onViewAll?: () => void;
}

const INITIAL_COUNT = 3;
const estimateReadTime = (content: string): number => Math.max(1, Math.ceil(content.split(/\s+/).length / 200));

export const StoriesSection: React.FC<StoriesSectionProps> = ({ stories, onStoryClick, onViewAll }) => {
  const displayStories = stories.slice(0, INITIAL_COUNT);
  const hasMore = stories.length > INITIAL_COUNT;

  return (
    <section id="stories" style={{ padding: '5rem 0', background: 'var(--wa-dark)' }}>
      <div className="wa-container">
        {/* Section Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="font-cinzel" style={{
              fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
              color: 'var(--wa-gold)', marginBottom: '0.75rem',
            }}>
              Behind The Lens
            </p>
            <h2 className="font-playfair" style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700,
              background: 'linear-gradient(135deg, var(--wa-gold), var(--wa-gold-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}>
              📖 Stories & Adventures
              <span style={{
                fontSize: '0.9rem', fontWeight: 400,
                WebkitTextFillColor: 'var(--wa-text-muted)',
              }}>
                ({stories.length})
              </span>
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--wa-text-muted)', maxWidth: 500, margin: '0 auto' }}>
              Dive into the tales behind each expedition — the patience, the thrill, and the untold moments.
            </p>
          </div>
        </div>

        {/* Story Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {displayStories.map((story) => (
            <div
              key={story.id}
              onClick={() => onStoryClick(story)}
              style={{
                cursor: 'pointer', borderRadius: '14px', overflow: 'hidden',
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
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <img
                  src={story.coverImageUrl}
                  alt={story.title}
                  style={{ width: '100%', height: 200, objectFit: 'cover', transition: 'transform 0.5s' }}
                  loading="lazy"
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  padding: '1.5rem 1rem 0.75rem',
                }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {story.tags.slice(0, 3).map((tag) => (
                      <span key={tag} style={{
                        padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.6rem',
                        background: 'rgba(201,168,76,0.2)', color: 'var(--wa-gold-light)',
                        border: '1px solid rgba(201,168,76,0.3)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <h3 className="font-playfair" style={{
                  fontSize: '1.1rem', fontWeight: 700, color: 'var(--wa-text)',
                  marginBottom: '0.5rem', lineHeight: 1.3,
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
                  fontSize: '0.8rem', color: 'var(--wa-text-muted)', lineHeight: 1.6,
                  marginBottom: '1rem',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {story.excerpt}
                </p>

                {story.createdAt && formatStoryDate(story.createdAt) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--wa-gold)', opacity: 0.75, marginBottom: '0.6rem' }}>
                    <CalendarDays size={11} />
                    <span>{formatStoryDate(story.createdAt)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--wa-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {estimateReadTime(story.content)} min read
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Eye size={12} /> {story.viewCount}
                    </span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(201,168,76,0.6)' }}>
                    <Heart size={12} /> {story.likeCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Stories Button — opens dedicated grid page */}
        {hasMore && onViewAll && (
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button
              onClick={onViewAll}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, var(--wa-gold), #b8892d)',
                color: '#062013',
                border: 'none',
                borderRadius: '50px',
                fontSize: '0.9rem', fontWeight: 700,
                letterSpacing: '0.05em', cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(201,168,76,0.3)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(201,168,76,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(201,168,76,0.3)';
              }}
            >
              View All {stories.length} Stories <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
