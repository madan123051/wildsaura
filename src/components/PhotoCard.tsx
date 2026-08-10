import React from 'react';
import { ArrowUpRight, Download, Heart, MapPin, Share2 } from 'lucide-react';
import { Photo } from '../types';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';

const PHOTO_PLACEHOLDER = '/images/placeholder-card.svg';

const formatPhotoDate = (createdAt: any): string => {
  if (!createdAt) return '';
  try {
    const value = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    if (!Number.isNaN(value.getTime())) {
      return value.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  } catch {
    return '';
  }
  return '';
};

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
  onLike: () => void;
  onShare: () => void;
  onDownload: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  priority?: boolean;
  variant?: 'wide' | 'tall' | 'standard';
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  onClick,
  onLike,
  onShare,
  onDownload,
  priority = false,
  variant = 'standard',
}) => {
  const photoSlug = photo.slug || photo.firestoreId || photo.id;
  const sourceImage = photo.thumbnailUrl || photo.imageUrl || PHOTO_PLACEHOLDER;
  const optimizedImage = getOptimizedImageUrl(sourceImage, {
    width: variant === 'wide' ? 1200 : 800,
    quality: 78,
    fit: 'cover',
  }) || PHOTO_PLACEHOLDER;
  const optimizedSrcSet = getOptimizedSrcSet(sourceImage, [400, 640, 800, 1000, 1200], {
    quality: 78,
    fit: 'cover',
  });
  const imageCandidates = React.useMemo(
    () => Array.from(new Set([optimizedImage, sourceImage, PHOTO_PLACEHOLDER].filter(Boolean))),
    [optimizedImage, sourceImage],
  );
  const [candidateIndex, setCandidateIndex] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [optimizedImage, sourceImage]);

  const stopAndRun = (action: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  const date = formatPhotoDate(photo.createdAt);

  return (
    <article className={`editorial-photo-card editorial-photo-card--${variant}`}>
      <a
        href={`/photo/${encodeURIComponent(String(photoSlug))}`}
        className="editorial-photo-card__link"
        aria-label={`View ${photo.title}`}
        onClick={(event) => {
          event.preventDefault();
          onClick();
        }}
      >
        <div
          className={`editorial-photo-card__media${loaded ? ' is-loaded' : ''}`}
          onContextMenu={(event) => event.preventDefault()}
          aria-busy={!loaded}
        >
          <img
            src={imageCandidates[candidateIndex] || PHOTO_PLACEHOLDER}
            srcSet={candidateIndex === 0 ? optimizedSrcSet : undefined}
            sizes={variant === 'wide'
              ? '(max-width: 620px) calc(100vw - 2rem), (max-width: 900px) calc(100vw - 3rem), 58vw'
              : '(max-width: 620px) calc(100vw - 2rem), (max-width: 900px) 50vw, 34vw'}
            alt={photo.title}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            width={variant === 'wide' ? 1200 : 800}
            height={variant === 'tall' ? 1000 : variant === 'wide' ? 750 : 600}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (candidateIndex < imageCandidates.length - 1) {
                setCandidateIndex((index) => index + 1);
                setLoaded(false);
              } else {
                setLoaded(true);
              }
            }}
          />
          <div className="editorial-photo-card__shade" />
          <span className="editorial-photo-card__category">{photo.category}</span>
          <span className="editorial-photo-card__open">
            Open photograph <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>

        <div className="editorial-photo-card__caption">
          <div>
            <h3>{photo.title}</h3>
            {(photo.location || date) && (
              <p>
                {photo.location && <><MapPin size={12} aria-hidden="true" /> {photo.location}</>}
                {photo.location && date && <span aria-hidden="true"> · </span>}
                {date}
              </p>
            )}
          </div>
          <span className="editorial-photo-card__index">© WA</span>
        </div>
      </a>

      <div className="editorial-photo-card__actions" aria-label={`Actions for ${photo.title}`}>
        <button
          type="button"
          className={photo.liked ? 'is-liked' : undefined}
          onClick={stopAndRun(onLike)}
          aria-label={`${photo.liked ? 'Unlike' : 'Like'} ${photo.title}`}
          title="Like photograph"
        >
          <Heart size={15} fill={photo.liked ? 'currentColor' : 'none'} aria-hidden="true" />
          <span>{photo.likeCount || 0}</span>
        </button>
        <button type="button" onClick={stopAndRun(onShare)} aria-label={`Share ${photo.title}`}>
          <Share2 size={15} aria-hidden="true" />
        </button>
        <button type="button" onClick={stopAndRun(onDownload)} aria-label={`Download ${photo.title}`}>
          <Download size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};
