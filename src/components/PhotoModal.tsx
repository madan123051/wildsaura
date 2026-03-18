import React, { useState } from 'react';
import { X, Heart, Share2, Download, MapPin, User, Tag, Camera, Maximize2, Timer, Zap, Eye, Lock, ImageOff, BookOpen, Trash2 } from 'lucide-react';
import { Photo, Comment, Visitor } from '../types';

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
  onLike: () => void;
  onShare: () => void;
  onDownload: () => void;
  onGenerateStory?: () => void;
  isGeneratingStory?: boolean;
  isAdmin?: boolean;
  visitor: Visitor | null;
  comments: Comment[];
  onAddComment: (content: string) => void;
  onVisitorLoginClick: () => void;
  onDeleteComment?: (firestoreId: string) => void;
  freeDownloadsLeft: number;
  isDownloading: boolean;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  photo, onClose, onLike, onShare, onDownload, onGenerateStory, isGeneratingStory, isAdmin, visitor, comments, onAddComment, onVisitorLoginClick, onDeleteComment, freeDownloadsLeft, isDownloading,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'exif' | 'comments'>('info');
  const [commentText, setCommentText] = useState('');

  const hasExif = photo.cameraModel || photo.lens || photo.aperture || photo.shutterSpeed || photo.iso || photo.focalLength;

  const tabs = [
    { id: 'info' as const, label: 'Details' },
    ...(hasExif ? [{ id: 'exif' as const, label: 'Camera' }] : []),
    { id: 'comments' as const, label: `Comments (${comments.length})` },
  ];

  const handlePostComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentText('');
  };

  const gated = (action: () => void) => () => {
    if (!visitor) { onVisitorLoginClick(); return; }
    action();
  };

  return (
    <div
      className="modal-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: '1rem', maxWidth: '48rem', width: '100%', maxHeight: '92vh', overflowY: 'auto',
          background: 'var(--wa-dark-card)', border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 0 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative' }}>
          <img src={photo.imageUrl} alt={photo.title} style={{ width: '100%', objectFit: 'cover', borderRadius: '1rem 1rem 0 0', maxHeight: '55vh' }} />
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
            <span className="font-cinzel" style={{
              padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 500,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(0,0,0,0.6)', color: 'var(--wa-gold)', border: '1px solid rgba(201,168,76,0.3)', backdropFilter: 'blur(8px)',
            }}>
              {photo.category}
            </span>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1, paddingRight: '1rem' }}>
              <h2 className="font-playfair" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                {photo.title}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem' }} className="text-wa-muted">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={11} /> {photo.photographer || 'Unknown'}</span>
                {photo.location && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.location)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#d4a853', textDecoration: 'none', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}><MapPin size={11} /> {photo.location}</a>}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Tag size={11} /> {photo.category}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-text-muted)', padding: '0.25rem', flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', margin: '1.25rem 0', paddingBottom: '1.25rem', borderBottom: '1px solid var(--wa-border)' }}>
            <button onClick={gated(onLike)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: photo.liked ? 'var(--wa-gold)' : 'var(--wa-text-muted)', transition: 'color 0.2s' }}>
              <Heart size={18} fill={photo.liked ? 'currentColor' : 'none'} />
              <span style={{ fontSize: '0.875rem' }}>{photo.likeCount}</span>
            </button>
            <button onClick={gated(onShare)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-text-muted)', transition: 'color 0.2s' }}>
              <Share2 size={18} />
            </button>
            <button
              onClick={gated(onDownload)}
              disabled={isDownloading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: isDownloading ? 'wait' : 'pointer', color: 'var(--wa-text-muted)', transition: 'color 0.2s' }}
            >
              <Download size={18} />
              <span style={{ fontSize: '0.75rem' }}>
                {isDownloading ? 'Downloading...' : 'Download'}
              </span>
            </button>
            {isAdmin && onGenerateStory && (
              <button
                onClick={onGenerateStory}
                disabled={isGeneratingStory}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: isGeneratingStory ? 'wait' : 'pointer', color: 'var(--wa-gold)', transition: 'color 0.2s' }}
              >
                <BookOpen size={18} />
                <span style={{ fontSize: '0.75rem' }}>
                  {isGeneratingStory ? 'Generating...' : 'AI Story'}
                </span>
              </button>
            )}
          </div>

          {/* Download info banner */}
          {visitor && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
              padding: '0.6rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem',
              background: freeDownloadsLeft > 0 ? 'rgba(201,168,76,0.1)' : 'rgba(255,100,100,0.1)',
              border: `1px solid ${freeDownloadsLeft > 0 ? 'rgba(201,168,76,0.25)' : 'rgba(255,100,100,0.25)'}`,
              color: freeDownloadsLeft > 0 ? 'var(--wa-gold)' : 'rgba(255,150,150,1)',
            }}>
              {freeDownloadsLeft > 0 ? (
                <>
                  <Download size={14} />
                  <span>{freeDownloadsLeft} free download{freeDownloadsLeft !== 1 ? 's' : ''} remaining (without watermark)</span>
                </>
              ) : (
                <>
                  <ImageOff size={14} />
                  <span>Free downloads used — downloads will include watermark</span>
                </>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', padding: '0.25rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.04)' }}>
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div>
              {photo.caption && <p className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>{photo.caption}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InfoCard label="Photographer" value={photo.photographer || 'Unknown'} />
                {photo.location && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.location)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
                    <InfoCard label="Location" value={photo.location} icon={<MapPin size={14} style={{ color: '#d4a853' }} />} />
                  </a>
                )}
                <InfoCard label="Category" value={photo.category} />
                <InfoCard label="Date" value="March 2026" />
              </div>
            </div>
          )}

          {/* EXIF Tab */}
          {activeTab === 'exif' && hasExif && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {photo.cameraModel && <ExifCard icon={<Camera size={12} />} label="Camera" value={photo.cameraModel} />}
              {photo.lens && <ExifCard icon={<Maximize2 size={12} />} label="Lens" value={photo.lens} />}
              {photo.aperture && <ExifCard icon={<Eye size={12} />} label="Aperture" value={photo.aperture} />}
              {photo.shutterSpeed && <ExifCard icon={<Timer size={12} />} label="Shutter" value={photo.shutterSpeed} />}
              {photo.iso && <ExifCard icon={<Zap size={12} />} label="ISO" value={`ISO ${photo.iso}`} />}
              {photo.focalLength && <ExifCard icon={<Eye size={12} />} label="Focal Length" value={photo.focalLength} />}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', maxHeight: '11rem', overflowY: 'auto' }}>
                {comments.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--wa-text-muted)', padding: '1rem 0' }}>
                    No comments yet. Be the first to share your thoughts!
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--wa-dark-alt)', position: 'relative' }}>
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.displayName} style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, objectFit: 'cover',
                      }} referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: c.avatarColor || 'linear-gradient(135deg, #c9a84c, #f5d98b)',
                        fontSize: '0.65rem', fontWeight: 700, color: '#000',
                      }}>
                        {c.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>{c.displayName}</p>
                      <p className="text-wa-mid" style={{ fontSize: '0.875rem', marginTop: '0.2rem' }}>{c.content}</p>
                    </div>
                    {isAdmin && c.firestoreId && onDeleteComment && (
                      <button
                        onClick={() => onDeleteComment(c.firestoreId!)}
                        title="Delete comment"
                        style={{
                          position: 'absolute', top: '0.5rem', right: '0.5rem',
                          background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.3)',
                          borderRadius: '4px', cursor: 'pointer', padding: '0.2rem',
                          color: 'rgba(255,100,100,0.8)', display: 'flex', alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {visitor ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    {visitor.avatarUrl ? (
                      <img src={visitor.avatarUrl} alt={visitor.displayName} style={{
                        width: 20, height: 20, borderRadius: '50%', objectFit: 'cover',
                      }} referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: visitor.avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 700, color: '#000',
                      }}>
                        {visitor.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--wa-text-muted)' }}>
                      {visitor.displayName}
                    </span>
                  </div>
                  <textarea
                    className="wa-input"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    style={{ resize: 'none', marginBottom: '0.5rem' }}
                  />
                  <button onClick={handlePostComment} className="btn-gold" style={{ width: '100%' }}>
                    Post Comment
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--wa-border)' }}>
                  <Lock size={20} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--wa-text-muted)', marginBottom: '0.5rem' }}>
                    Log in to like, comment & download photos
                  </p>
                  <button onClick={onVisitorLoginClick} className="btn-gold-outline" style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}>
                    Login to Interact
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div style={{ borderRadius: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</p>
    <p style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem', textTransform: 'capitalize' }}>
      {icon} {value}
    </p>
  </div>
);

const ExifCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="exif-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
      <span style={{ color: 'var(--wa-gold)' }}>{icon}</span>
      <p className="font-cinzel text-wa-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
    </div>
    <p style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.8 }}>{value}</p>
  </div>
);
