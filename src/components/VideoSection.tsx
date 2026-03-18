import React, { useState } from 'react';
import { Play, Eye, Heart, ChevronDown, MapPin } from 'lucide-react';
import { Video } from '../types';

interface VideoSectionProps {
  videos: Video[];
}

const INITIAL_COUNT = 3;

export const VideoSection: React.FC<VideoSectionProps> = ({ videos }) => {
  const [showAll, setShowAll] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const displayVideos = showAll ? videos : videos.slice(0, INITIAL_COUNT);
  const hasMore = videos.length > INITIAL_COUNT;

  if (videos.length === 0) return null;

  return (
    <section id="videos" style={{ padding: '5rem 0', background: 'linear-gradient(180deg, var(--wa-dark) 0%, rgba(10,10,10,1) 100%)' }}>
      <div className="wa-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p className="font-cinzel" style={{
            fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--wa-gold)', marginBottom: '0.75rem',
          }}>
            Moving Moments
          </p>
          <h2 className="font-playfair" style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700,
            background: 'linear-gradient(135deg, var(--wa-gold), var(--wa-gold-light))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          }}>
            🎬 Videos
            <span style={{
              fontSize: '0.9rem', fontWeight: 400,
              WebkitTextFillColor: 'var(--wa-text-muted)',
            }}>
              ({videos.length})
            </span>
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--wa-text-muted)', maxWidth: 500, margin: '0 auto' }}>
            Experience the wild in motion — cinematic glimpses into the heart of nature.
          </p>
        </div>

        {/* Video Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}>
          {displayVideos.map((video) => (
            <div
              key={video.id}
              style={{
                borderRadius: '14px', overflow: 'hidden',
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
              {/* Video Player / Thumbnail */}
              <div style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
                {playingId === video.id ? (
                  <video
                    src={video.videoUrl}
                    controls
                    autoPlay
                    style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: '#000' }}
                    onEnded={() => setPlayingId(null)}
                  />
                ) : (
                  <div
                    style={{ cursor: 'pointer', position: 'relative' }}
                    onClick={() => setPlayingId(video.id)}
                  >
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        style={{ width: '100%', height: 220, objectFit: 'cover', transition: 'transform 0.5s' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: 220,
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(0,0,0,0.8))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Play size={48} style={{ color: 'var(--wa-gold)', opacity: 0.5 }} />
                      </div>
                    )}
                    {/* Play Button Overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)',
                      transition: 'background 0.3s',
                    }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'rgba(201,168,76,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
                        transition: 'transform 0.3s',
                      }}>
                        <Play size={24} style={{ color: '#0a0a0a', marginLeft: 2 }} fill="#0a0a0a" />
                      </div>
                    </div>
                    {/* Duration Badge */}
                    {video.duration && (
                      <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        padding: '0.2rem 0.5rem', borderRadius: '4px',
                        background: 'rgba(0,0,0,0.8)', color: '#fff',
                        fontSize: '0.7rem', fontWeight: 600,
                      }}>
                        {video.duration}
                      </div>
                    )}
                    {/* Tags */}
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      display: 'flex', gap: '0.3rem', flexWrap: 'wrap',
                    }}>
                      {video.tags.slice(0, 3).map((tag) => (
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
                )}
              </div>

              {/* Video Info */}
              <div style={{ padding: '1.25rem' }}>
                <h3 className="font-playfair" style={{
                  fontSize: '1.1rem', fontWeight: 700, color: 'var(--wa-text)',
                  marginBottom: '0.5rem', lineHeight: 1.3,
                }}>
                  {video.title}
                </h3>
                {video.description && (
                  <p style={{
                    fontSize: '0.8rem', color: 'var(--wa-text-muted)', lineHeight: 1.6,
                    marginBottom: '1rem',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {video.description}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--wa-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {video.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={12} /> {video.location}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Eye size={12} /> {video.viewCount}
                    </span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(201,168,76,0.6)' }}>
                    <Heart size={12} /> {video.likeCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Videos Button */}
        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 2rem',
                background: 'transparent',
                border: '2px solid var(--wa-gold)',
                color: 'var(--wa-gold)',
                borderRadius: '50px',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--wa-gold)';
                e.currentTarget.style.color = '#0a0a0a';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--wa-gold)';
              }}
            >
              {showAll ? 'Show Less' : 'View All Videos'}
              <ChevronDown size={16} style={{
                transform: showAll ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.3s',
              }} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
