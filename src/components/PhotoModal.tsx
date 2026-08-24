import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, CalendarDays, Camera, ChevronLeft, ChevronRight, Download, Eye,
  Heart, MapPin, Maximize2, Share2, Tag, Timer, Trash2, User, X, Zap,
} from 'lucide-react';
import { Comment, Photo, Visitor } from '../types';
import { getDirectImageUrl, getOptimizedImageUrl } from '../utils/imageUrl';
import './PhotoModal.css';

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
  photos?: Photo[];
  onNavigate?: (photo: Photo) => void;
}

const AUTO_ADVANCE_MS = 10_000;
const getPhotoKey = (photo: Photo) => photo.firestoreId || photo.slug || String(photo.id);

const formatPhotoDate = (createdAt: any): string => {
  if (!createdAt) return '';
  try {
    const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {
    return '';
  }
  return '';
};

const getModalImageCandidates = (url?: string) => Array.from(new Set([
  getDirectImageUrl(url),
  getOptimizedImageUrl(url, { width: 1800, quality: 86, fit: 'contain', maxAge: '30d' }),
].filter(Boolean)));

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893C23.94 5.346 18.606 0 12.05 0" />
  </svg>
);

export const PhotoModal: React.FC<PhotoModalProps> = ({
  photo, onClose, onLike, onDownload, onGenerateStory, isGeneratingStory,
  isAdmin, visitor, comments, onAddComment, onVisitorLoginClick, onDeleteComment,
  freeDownloadsLeft, isDownloading, photos, onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'camera' | 'comments'>('details');
  const [commentText, setCommentText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageCandidateIndex, setImageCandidateIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const photoKey = getPhotoKey(photo);
  const imageCandidates = useMemo(() => getModalImageCandidates(photo.imageUrl), [photo.imageUrl]);
  const currentImageSrc = imageCandidates[imageCandidateIndex] || getDirectImageUrl(photo.imageUrl);
  const currentIndex = photos?.findIndex((candidate) => getPhotoKey(candidate) === photoKey) ?? -1;
  const canNavigate = Boolean(photos && photos.length > 1 && currentIndex >= 0 && onNavigate);
  const shouldAutoAdvance = canNavigate && isImageLoaded && !hasImageError && !showShareMenu;
  const hasExif = Boolean(photo.cameraModel || photo.lens || photo.aperture || photo.shutterSpeed || photo.iso || photo.focalLength);
  const photoDate = formatPhotoDate(photo.createdAt);
  const displayTags = photo.tags?.filter(Boolean) || [];

  const goToPrevious = useCallback(() => {
    if (!canNavigate || !photos || !onNavigate) return;
    onNavigate(photos[(currentIndex - 1 + photos.length) % photos.length]);
  }, [canNavigate, currentIndex, onNavigate, photos]);

  const goToNext = useCallback(() => {
    if (!canNavigate || !photos || !onNavigate) return;
    onNavigate(photos[(currentIndex + 1) % photos.length]);
  }, [canNavigate, currentIndex, onNavigate, photos]);

  useEffect(() => {
    setImageCandidateIndex(0);
    setIsImageLoaded(false);
    setHasImageError(false);
    setShowShareMenu(false);
    setActiveTab('details');
  }, [photoKey]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (!shouldAutoAdvance) return;
    const timer = window.setTimeout(goToNext, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [goToNext, photoKey, shouldAutoAdvance]);

  useEffect(() => {
    if (!canNavigate || !photos) return;
    [
      photos[(currentIndex + 1) % photos.length],
      photos[(currentIndex - 1 + photos.length) % photos.length],
    ].forEach((candidate) => {
      const src = getDirectImageUrl(candidate?.imageUrl);
      if (!src) return;
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = src;
    });
  }, [canNavigate, currentIndex, photos]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') { event.preventDefault(); goToPrevious(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goToNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, onClose]);

  useEffect(() => {
    if (!showShareMenu) return;
    const closeShareMenu = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!shareMenuRef.current?.contains(target) && !shareButtonRef.current?.contains(target)) setShowShareMenu(false);
    };
    document.addEventListener('mousedown', closeShareMenu);
    return () => document.removeEventListener('mousedown', closeShareMenu);
  }, [showShareMenu]);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const distanceX = touchStartX.current - event.changedTouches[0].clientX;
    const distanceY = touchStartY.current - event.changedTouches[0].clientY;
    if (Math.abs(distanceX) >= 50 && Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      if (distanceX > 0) goToNext();
      else goToPrevious();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const shareUrl = `${window.location.origin}/photo/${encodeURIComponent(photo.slug || photo.firestoreId || String(photo.id))}`;
  const shareText = `See “${photo.title}” on WildSaura Photography`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const field = document.createElement('textarea');
      field.value = shareUrl;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareOptions = [
    { label: 'WhatsApp', icon: <WhatsAppIcon />, action: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank') },
    { label: 'Facebook', icon: <span className="photo-modal-share-letter">f</span>, action: () => window.open(`https://www.facebook.com/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank') },
    { label: copied ? 'Link copied' : 'Copy link', icon: <Share2 size={15} />, action: copyLink },
  ];

  const postComment = () => {
    const value = commentText.trim();
    if (!value) return;
    onAddComment(value);
    setCommentText('');
  };

  return (
    <div className="photo-modal-backdrop" onClick={onClose}>
      <article className="photo-modal-shell" role="dialog" aria-modal="true" aria-label={photo.title} onClick={(event) => event.stopPropagation()}>
        <button className="photo-modal-close" type="button" onClick={onClose} aria-label="Close photo viewer"><X size={20} /></button>

        <section className="photo-modal-stage" onContextMenu={(event) => event.preventDefault()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {!isImageLoaded && !hasImageError && <div className="photo-modal-loader" role="status" aria-label="Loading full photograph"><span /><p>Preparing full photograph</p></div>}
          {hasImageError && <div className="photo-modal-image-error" role="alert"><strong>Photograph unavailable</strong><p>Please close the viewer and try again.</p></div>}
          <img
            key={`${photoKey}-${imageCandidateIndex}`}
            className={isImageLoaded ? 'is-loaded' : ''}
            src={currentImageSrc}
            alt={photo.altText || photo.caption || photo.title}
            draggable={false}
            decoding="async"
            onDragStart={(event) => event.preventDefault()}
            onLoad={() => { setHasImageError(false); setIsImageLoaded(true); }}
            onError={() => {
              if (imageCandidateIndex < imageCandidates.length - 1) {
                setImageCandidateIndex((index) => index + 1);
                setIsImageLoaded(false);
              } else {
                setIsImageLoaded(false);
                setHasImageError(true);
              }
            }}
          />
          <div className="photo-modal-stage-meta"><span>{photo.category}</span>{canNavigate && <span>{String(currentIndex + 1).padStart(2, '0')} / {String(photos?.length || 0).padStart(2, '0')}</span>}</div>
          <span className="photo-modal-watermark">© WILDSAURA</span>
          {canNavigate && <>
            <button className="photo-modal-nav photo-modal-nav--previous" type="button" onClick={goToPrevious} aria-label="Previous photograph"><ChevronLeft size={22} /></button>
            <button className="photo-modal-nav photo-modal-nav--next" type="button" onClick={goToNext} aria-label="Next photograph"><ChevronRight size={22} /></button>
          </>}
          {shouldAutoAdvance && <div className="photo-modal-progress" aria-label="Next photograph in 10 seconds"><span key={`${photoKey}-${imageCandidateIndex}`} /></div>}
        </section>

        <aside className="photo-modal-editorial">
          <header className="photo-modal-header">
            <p className="photo-modal-kicker"><span /> {photo.category} · WildSaura archive</p>
            <h2>{photo.title}</h2>
            <p className="photo-modal-byline">Photograph by <strong>{photo.photographer || 'WildSaura'}</strong></p>
          </header>

          <div className="photo-modal-tabs" role="tablist" aria-label="Photograph information">
            <button type="button" role="tab" aria-selected={activeTab === 'details'} onClick={() => setActiveTab('details')}>Story</button>
            {hasExif && <button type="button" role="tab" aria-selected={activeTab === 'camera'} onClick={() => setActiveTab('camera')}>Camera</button>}
            <button type="button" role="tab" aria-selected={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>Comments {comments.length}</button>
          </div>

          <div className="photo-modal-panel">
            {activeTab === 'details' && <div className="photo-modal-story">
              <p className="photo-modal-description">{photo.caption || 'A moment from the WildSaura visual archive.'}</p>
              <dl className="photo-modal-facts">
                {photo.location && <div><dt><MapPin size={14} /> Location</dt><dd>{photo.location}</dd></div>}
                {photoDate && <div><dt><CalendarDays size={14} /> Published</dt><dd>{photoDate}</dd></div>}
                <div><dt><Tag size={14} /> Collection</dt><dd>{photo.category}</dd></div>
                <div><dt><User size={14} /> Author</dt><dd>{photo.photographer || 'WildSaura'}</dd></div>
              </dl>
              {displayTags.length > 0 && <div className="photo-modal-tags">{displayTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
            </div>}

            {activeTab === 'camera' && hasExif && <dl className="photo-modal-exif">
              {photo.cameraModel && <ExifRow icon={<Camera size={15} />} label="Camera" value={photo.cameraModel} />}
              {photo.lens && <ExifRow icon={<Maximize2 size={15} />} label="Lens" value={photo.lens} />}
              {photo.aperture && <ExifRow icon={<Eye size={15} />} label="Aperture" value={photo.aperture} />}
              {photo.shutterSpeed && <ExifRow icon={<Timer size={15} />} label="Shutter" value={photo.shutterSpeed} />}
              {photo.iso && <ExifRow icon={<Zap size={15} />} label="ISO" value={photo.iso} />}
              {photo.focalLength && <ExifRow icon={<Eye size={15} />} label="Focal length" value={photo.focalLength} />}
            </dl>}

            {activeTab === 'comments' && <div className="photo-modal-comments">
              <div className="photo-modal-comment-list">
                {comments.length === 0 && <p className="photo-modal-empty">No comments yet. Start the conversation.</p>}
                {comments.map((comment) => <article key={comment.firestoreId || comment.id}>
                  <span className="photo-modal-avatar" style={{ background: comment.avatarColor || '#173327' }}>
                    {comment.avatarUrl ? <img src={comment.avatarUrl} alt="" referrerPolicy="no-referrer" /> : comment.displayName.charAt(0).toUpperCase()}
                  </span>
                  <div><strong>{comment.displayName}</strong><p>{comment.content}</p></div>
                  {isAdmin && comment.firestoreId && onDeleteComment && <button type="button" onClick={() => onDeleteComment(comment.firestoreId!)} aria-label={`Delete comment by ${comment.displayName}`}><Trash2 size={14} /></button>}
                </article>)}
              </div>
              <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={3} placeholder="Write a thoughtful comment…" />
              <div className="photo-modal-comment-actions">
                {!visitor && <button type="button" onClick={onVisitorLoginClick}>Sign in</button>}
                <button type="button" onClick={postComment} disabled={!commentText.trim()}>Post comment</button>
              </div>
            </div>}
          </div>

          <div className="photo-modal-actions">
            <button type="button" className={photo.liked ? 'is-liked' : ''} onClick={onLike}><Heart size={18} fill={photo.liked ? 'currentColor' : 'none'} /><span><strong>{photo.likeCount || 0}</strong> Like</span></button>
            <div className="photo-modal-share-wrap">
              <button ref={shareButtonRef} type="button" onClick={() => setShowShareMenu((open) => !open)}><Share2 size={18} /><span><strong>Send</strong> Share</span></button>
              {showShareMenu && <div className="photo-modal-share-menu" ref={shareMenuRef}>
                {shareOptions.map((option) => <button key={option.label} type="button" onClick={() => { option.action(); if (!option.label.includes('copied')) setShowShareMenu(false); }}>{option.icon}<span>{option.label}</span></button>)}
              </div>}
            </div>
            <button type="button" onClick={onDownload} disabled={isDownloading}><Download size={18} /><span><strong>{isDownloading ? 'Saving' : 'Original'}</strong> {freeDownloadsLeft > 0 ? `${freeDownloadsLeft} free` : 'Download'}</span></button>
            {isAdmin && onGenerateStory && <button type="button" onClick={onGenerateStory} disabled={isGeneratingStory}><BookOpen size={18} /><span><strong>Admin</strong> {isGeneratingStory ? 'Creating…' : 'Create story'}</span></button>}
          </div>
        </aside>
      </article>
    </div>
  );
};

const ExifRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div><dt>{icon} {label}</dt><dd>{value}</dd></div>
);
