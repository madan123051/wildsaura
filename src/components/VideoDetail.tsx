import React, { useState } from 'react';
import { ArrowLeft, CalendarDays, Heart, MapPin, Share2 } from 'lucide-react';
import { Video } from '../types';

interface VideoDetailProps {
  video: Video;
  onBack: () => void;
  onLike: () => void;
}

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const VideoDetail: React.FC<VideoDetailProps> = ({ video, onBack, onLike }) => {
  const [copied, setCopied] = useState(false);
  const videoToken = video.firestoreId || String(video.id);
  const shareUrl = `${window.location.origin}/video/${encodeURIComponent(videoToken)}`;

  const handleShare = async () => {
    const shareData = {
      title: `${video.title} - WILDS AURA`,
      text: video.description || `Watch "${video.title}" on WILDS AURA Photography.`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // The visitor may cancel the native share dialog.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be unavailable in older browsers.
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--wa-bg)', padding: '96px 1rem 4rem' }}>
      <article style={{ width: 'min(960px, 100%)', margin: '0 auto' }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to videos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: '0.55rem 0.85rem',
            border: '1px solid var(--wa-border)',
            borderRadius: 8,
            background: 'var(--wa-dark-card)',
            color: 'var(--wa-gold)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={17} />
          Videos
        </button>

        <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}>
          <video
            src={video.videoUrl}
            poster={video.thumbnailUrl || undefined}
            controls
            playsInline
            preload="metadata"
            style={{
              display: 'block',
              width: '100%',
              maxHeight: '72vh',
              aspectRatio: video.aspectRatio?.replace(':', '/') || '16/9',
              objectFit: 'contain',
            }}
          />
        </div>

        <div style={{ padding: '1.5rem 0' }}>
          <h1
            className="font-playfair"
            style={{ margin: 0, color: 'var(--wa-text)', fontSize: 'clamp(1.5rem, 4vw, 2.3rem)', lineHeight: 1.25 }}
          >
            {video.title}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', marginTop: '0.9rem', color: 'var(--wa-text-muted)', fontSize: '0.82rem' }}>
            {video.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={14} />
                {video.location}
              </span>
            )}
            {formatDate(video.createdAt) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <CalendarDays size={14} />
                {formatDate(video.createdAt)}
              </span>
            )}
          </div>

          {video.description && (
            <p style={{ margin: '1.15rem 0 0', color: 'var(--wa-text)', opacity: 0.88, lineHeight: 1.7 }}>
              {video.description}
            </p>
          )}

          {video.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '1rem' }}>
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '0.25rem 0.6rem',
                    border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: 999,
                    color: 'var(--wa-gold-light)',
                    fontSize: '0.72rem',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onLike}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.9rem',
                border: '1px solid var(--wa-border)',
                borderRadius: 8,
                background: video.liked ? 'rgba(201,168,76,0.18)' : 'var(--wa-dark-card)',
                color: video.liked ? 'var(--wa-gold)' : 'var(--wa-text-muted)',
                cursor: 'pointer',
              }}
            >
              <Heart size={17} fill={video.liked ? 'currentColor' : 'none'} />
              {video.likeCount}
            </button>
            <button
              type="button"
              onClick={handleShare}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.9rem',
                border: '1px solid var(--wa-border)',
                borderRadius: 8,
                background: 'var(--wa-dark-card)',
                color: 'var(--wa-text-muted)',
                cursor: 'pointer',
              }}
            >
              <Share2 size={17} />
              {copied ? 'Copied' : 'Share'}
            </button>
          </div>
        </div>
      </article>
    </main>
  );
};
