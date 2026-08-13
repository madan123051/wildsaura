import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Camera,
  ChevronRight,
  Folder,
  Search,
  X,
} from 'lucide-react';
import { GalleryPhoto, GalleryCategory } from '../types';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  searchQuery: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadAll?: () => void;
}

interface CategoryDefinition {
  key: GalleryCategory;
  label: string;
  note: string;
}

const CATEGORY_TABS: CategoryDefinition[] = [
  { key: 'wildlife', label: 'Wildlife', note: 'Encounters in the wild' },
  { key: 'birds', label: 'Birds', note: 'Flight, form and habitat' },
  { key: 'landscapes', label: 'Landscapes', note: 'Studies of place and light' },
  { key: 'portraits', label: 'Portraits', note: 'People and quiet gestures' },
  { key: 'others', label: 'Field Notes', note: 'Details beyond the categories' },
];

const MONTH_NAMES: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

const PHOTO_PLACEHOLDER = '/images/placeholder-card.svg';

const categoryLabel = (category: GalleryCategory) =>
  CATEGORY_TABS.find((tab) => tab.key === category)?.label || category;

const getPhotoYearMonth = (photo: GalleryPhoto): { year: string; month: string } => {
  if (photo.storagePath) {
    const parts = photo.storagePath.split('/');
    if (parts.length >= 5) return { year: parts[2], month: parts[3] };
  }

  if (photo.createdAt?.toDate) {
    const date: Date = photo.createdAt.toDate();
    return {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, '0'),
    };
  }

  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
  };
};

const formatCount = (count: number, singular = 'frame', plural = 'frames') =>
  `${count.toLocaleString()} ${count === 1 ? singular : plural}`;

const getPhotoKey = (photo: GalleryPhoto, index = 0) =>
  photo.id || `${photo.imageUrl}-${index}`;

interface SmartImageProps {
  src?: string | null;
  alt: string;
  sizes: string;
  fit?: 'cover' | 'contain';
  eager?: boolean;
}

const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  sizes,
  fit = 'cover',
  eager = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [imageCandidateIndex, setImageCandidateIndex] = useState(0);
  const resolvedSrc = src || PHOTO_PLACEHOLDER;
  const optimizedSrc = getOptimizedImageUrl(resolvedSrc, {
    width: 960,
    quality: 78,
    fit,
  }) || resolvedSrc;
  const optimizedSrcSet = getOptimizedSrcSet(
    resolvedSrc,
    [360, 520, 720, 960],
    { quality: 78, fit },
  );
  const imageCandidates = useMemo(
    () => Array.from(new Set([optimizedSrc, resolvedSrc, PHOTO_PLACEHOLDER].filter(Boolean))),
    [optimizedSrc, resolvedSrc],
  );

  useEffect(() => {
    setLoaded(false);
    setImageCandidateIndex(0);
  }, [optimizedSrc, resolvedSrc]);

  return (
    <div className={`field-gallery__image-shell field-gallery__image-shell--${fit}`}>
      {!loaded && <span className="field-gallery__image-skeleton" aria-hidden="true" />}
      <img
        src={imageCandidates[imageCandidateIndex] || PHOTO_PLACEHOLDER}
        srcSet={imageCandidateIndex === 0 ? optimizedSrcSet : undefined}
        sizes={sizes}
        alt={alt}
        className="field-gallery__image"
        style={{ opacity: loaded ? 1 : 0, objectFit: fit }}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (imageCandidateIndex < imageCandidates.length - 1) {
            setLoaded(false);
            setImageCandidateIndex((index) => index + 1);
          } else {
            setLoaded(true);
          }
        }}
      />
    </div>
  );
};

interface FolderCardProps {
  label: string;
  note: string;
  meta: string;
  index: string;
  cover?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  eager?: boolean;
}

const FolderCard: React.FC<FolderCardProps> = ({
  label,
  note,
  meta,
  index,
  cover,
  onClick,
  disabled = false,
  eager = false,
}) => (
  <button
    type="button"
    className="field-gallery__folder-card"
    onClick={onClick}
    disabled={disabled}
    aria-label={disabled ? `${label}, ${meta}` : `Open ${label}, ${meta}`}
  >
    <span className="field-gallery__folder-media">
      {cover ? (
        <SmartImage
          src={cover}
          alt=""
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
          eager={eager}
        />
      ) : (
        <span className="field-gallery__empty-cover" aria-hidden="true">
          <Folder size={32} strokeWidth={1.25} />
        </span>
      )}
      <span className="field-gallery__folio" aria-hidden="true">{index}</span>
    </span>
    <span className="field-gallery__folder-copy">
      <span className="field-gallery__eyebrow">Archive collection</span>
      <span className="field-gallery__folder-heading">
        <strong>{label}</strong>
        {!disabled && <ArrowUpRight size={17} aria-hidden="true" />}
      </span>
      <span className="field-gallery__folder-note">{note}</span>
      <span className="field-gallery__folder-meta">{meta}</span>
    </span>
  </button>
);

interface PhotoContactSheetProps {
  items: GalleryPhoto[];
  onOpen: (photo: GalleryPhoto) => void;
}

const PhotoContactSheet: React.FC<PhotoContactSheetProps> = ({ items, onOpen }) => {
  if (items.length === 0) {
    return (
      <div className="field-gallery__empty-state" role="status">
        <Camera size={34} strokeWidth={1.25} aria-hidden="true" />
        <p>No photographs found in this entry.</p>
        <span>Try another collection or search term.</span>
      </div>
    );
  }

  return (
    <div className="field-gallery__photo-grid">
      {items.map((photo, index) => {
        const isWide = index % 5 === 0;
        const isPortrait = Boolean(
          photo.width && photo.height && photo.height > photo.width,
        );
        const aspectRatio = isWide ? '16 / 9' : isPortrait ? '4 / 5' : '4 / 3';
        const dimensions = photo.width && photo.height
          ? `${photo.width} × ${photo.height}`
          : `Frame ${String(index + 1).padStart(2, '0')}`;

        return (
          <button
            type="button"
            key={getPhotoKey(photo, index)}
            className={`field-gallery__photo-card${isWide ? ' field-gallery__photo-card--wide' : ''}`}
            onClick={() => onOpen(photo)}
            aria-label={`Open ${photo.title || 'untitled photograph'} in lightbox`}
          >
            <span className="field-gallery__photo-media" style={{ aspectRatio }}>
              <SmartImage
                src={photo.imageUrl}
                alt={photo.title || 'Gallery photograph'}
                sizes={isWide
                  ? '(max-width: 640px) 92vw, (max-width: 960px) 92vw, 62vw'
                  : '(max-width: 640px) 92vw, (max-width: 960px) 46vw, 31vw'}
                eager={index < 2}
              />
              <span className="field-gallery__photo-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
            </span>
            <span className="field-gallery__photo-caption">
              <span>
                <span className="field-gallery__eyebrow">{categoryLabel(photo.category)}</span>
                <strong>{photo.title || 'Untitled study'}</strong>
              </span>
              <span className="field-gallery__photo-spec">{dimensions}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

const GalleryBreadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav className="field-gallery__breadcrumbs" aria-label="Gallery folders">
    <ol>
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
          {item.onClick ? (
            <button type="button" onClick={item.onClick}>{item.label}</button>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  searchQuery,
  hasMore = false,
  isLoadingMore = false,
  onLoadAll,
}) => {
  const [openCategory, setOpenCategory] = useState<GalleryCategory | null>(null);
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchQuery.trim().toLowerCase();
    return photos.filter(
      (photo) =>
        photo.title.toLowerCase().includes(query) ||
        photo.category.toLowerCase().includes(query) ||
        categoryLabel(photo.category).toLowerCase().includes(query),
    );
  }, [photos, searchQuery, isSearching]);

  const categoryPhotos = useMemo(() => {
    if (!openCategory) return [];
    return photos.filter((photo) => photo.category === openCategory);
  }, [photos, openCategory]);

  const yearMap = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    categoryPhotos.forEach((photo) => {
      const { year } = getPhotoYearMonth(photo);
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(photo);
    });
    return map;
  }, [categoryPhotos]);

  const monthMap = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    if (!openYear) return map;

    categoryPhotos
      .filter((photo) => getPhotoYearMonth(photo).year === openYear)
      .forEach((photo) => {
        const { month } = getPhotoYearMonth(photo);
        if (!map.has(month)) map.set(month, []);
        map.get(month)!.push(photo);
      });

    return map;
  }, [categoryPhotos, openYear]);

  const monthPhotos = useMemo(() => {
    if (!openMonth) return [];
    return monthMap.get(openMonth) ?? [];
  }, [monthMap, openMonth]);

  const categorySummary = useMemo(
    () => CATEGORY_TABS.map((tab) => {
      const tabPhotos = photos.filter((photo) => photo.category === tab.key);
      return {
        ...tab,
        count: tabPhotos.length,
        cover: tabPhotos[0]?.imageUrl ?? null,
      };
    }),
    [photos],
  );

  const returnToRoot = useCallback(() => {
    setOpenCategory(null);
    setOpenYear(null);
    setOpenMonth(null);
  }, []);

  const openPhoto = useCallback((photo: GalleryPhoto) => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    setActivePhoto(photo);
  }, []);

  const closePhoto = useCallback(() => {
    setActivePhoto(null);
    window.setTimeout(() => previouslyFocusedRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!activePhoto) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePhoto();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePhoto, closePhoto]);

  const sortedYears = useMemo(
    () => Array.from(yearMap.entries()).sort((a, b) => b[0].localeCompare(a[0])),
    [yearMap],
  );
  const sortedMonths = useMemo(
    () => Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0])),
    [monthMap],
  );

  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: 'All collections', onClick: openCategory ? returnToRoot : undefined },
    ];

    if (openCategory) {
      items.push({
        label: categoryLabel(openCategory),
        onClick: openYear
          ? () => {
              setOpenYear(null);
              setOpenMonth(null);
            }
          : undefined,
      });
    }

    if (openYear) {
      items.push({
        label: openYear,
        onClick: openMonth ? () => setOpenMonth(null) : undefined,
      });
    }

    if (openMonth) items.push({ label: MONTH_NAMES[openMonth] || openMonth });
    return items;
  }, [openCategory, openMonth, openYear, returnToRoot]);

  const viewTitle = isSearching
    ? 'Search results'
    : openMonth
      ? `${MONTH_NAMES[openMonth] || openMonth} ${openYear}`
      : openYear
        ? `${categoryLabel(openCategory!)} · ${openYear}`
        : openCategory
          ? categoryLabel(openCategory)
          : 'The Field Archive';

  const viewCount = isSearching
    ? searchResults.length
    : openMonth
      ? monthPhotos.length
      : openYear
        ? monthMap.size
        : openCategory
          ? yearMap.size
          : photos.length;

  const activeImageUrl = activePhoto
    ? getOptimizedImageUrl(activePhoto.imageUrl, {
        width: 1800,
        quality: 86,
        fit: 'contain',
      }) || activePhoto.imageUrl
    : '';
  const activeImageSrcSet = activePhoto
    ? getOptimizedSrcSet(activePhoto.imageUrl, [720, 1080, 1440, 1800], {
        quality: 86,
        fit: 'contain',
      })
    : undefined;

  return (
    <section id="photo-gallery" className="field-gallery" aria-labelledby="field-gallery-title">
      <div className="field-gallery__texture" aria-hidden="true" />
      <div className="wa-container field-gallery__container">
        <header className="field-gallery__header">
          <div className="field-gallery__issue">
            <span>Archive No. 01</span>
            <span>{new Date().getFullYear()}</span>
          </div>
          <div className="field-gallery__header-grid">
            <div>
              <p className="field-gallery__kicker">Photography · Field journal</p>
              <h2 id="field-gallery-title">{viewTitle}</h2>
            </div>
            <div className="field-gallery__intro">
              <p>
                A living index of wildlife, people and places—filed by collection,
                season and year.
              </p>
              <span>{formatCount(viewCount, isSearching || openMonth ? 'frame' : 'entry', isSearching || openMonth ? 'frames' : 'entries')}</span>
              {hasMore && onLoadAll && (
                <button
                  type="button"
                  className="field-gallery__load-all"
                  onClick={onLoadAll}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading archive…' : 'Load full archive'}
                  {!isLoadingMore && <ArrowUpRight size={15} aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>

          {isSearching ? (
            <div className="field-gallery__search-status" role="status" aria-live="polite">
              <Search size={15} aria-hidden="true" />
              <span>
                {formatCount(searchResults.length)} matching &ldquo;{searchQuery.trim()}&rdquo;
              </span>
            </div>
          ) : (
            openCategory && (
              <div className="field-gallery__path-row">
                <button
                  type="button"
                  className="field-gallery__back"
                  onClick={openMonth
                    ? () => setOpenMonth(null)
                    : openYear
                      ? () => setOpenYear(null)
                      : returnToRoot}
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  Back one level
                </button>
                <GalleryBreadcrumbs items={breadcrumbItems} />
              </div>
            )
          )}
        </header>

        <div className="field-gallery__content">
          {isSearching ? (
            <PhotoContactSheet items={searchResults} onOpen={openPhoto} />
          ) : openCategory && openYear && openMonth ? (
            <PhotoContactSheet items={monthPhotos} onOpen={openPhoto} />
          ) : openCategory && openYear ? (
            <div className="field-gallery__folder-grid">
              {sortedMonths.map(([month, monthItems], index) => (
                <FolderCard
                  key={month}
                  index={String(index + 1).padStart(2, '0')}
                  label={MONTH_NAMES[month] || month}
                  note={`${openYear} field journal`}
                  meta={formatCount(monthItems.length)}
                  cover={monthItems[0]?.imageUrl}
                  onClick={() => setOpenMonth(month)}
                  eager={index < 2}
                />
              ))}
            </div>
          ) : openCategory ? (
            <div className="field-gallery__folder-grid">
              {sortedYears.map(([year, yearItems], index) => (
                <FolderCard
                  key={year}
                  index={String(index + 1).padStart(2, '0')}
                  label={year}
                  note={`${categoryLabel(openCategory)} annual edit`}
                  meta={formatCount(yearItems.length)}
                  cover={yearItems[0]?.imageUrl}
                  onClick={() => {
                    setOpenYear(year);
                    setOpenMonth(null);
                  }}
                  eager={index < 2}
                />
              ))}
            </div>
          ) : (
            <div className="field-gallery__folder-grid">
              {categorySummary.map((category, index) => (
                <FolderCard
                  key={category.key}
                  index={String(index + 1).padStart(2, '0')}
                  label={category.label}
                  note={category.note}
                  meta={formatCount(category.count)}
                  cover={category.cover}
                  disabled={category.count === 0}
                  onClick={() => {
                    setOpenCategory(category.key);
                    setOpenYear(null);
                    setOpenMonth(null);
                  }}
                  eager={index < 2}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {activePhoto && (
        <div
          className="field-gallery__lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby="field-gallery-lightbox-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePhoto();
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="field-gallery__lightbox-close"
            onClick={closePhoto}
            aria-label="Close photograph"
          >
            <X size={19} aria-hidden="true" />
          </button>
          <figure className="field-gallery__lightbox-figure">
            <div className="field-gallery__lightbox-image-wrap">
              <img
                src={activeImageUrl}
                srcSet={activeImageSrcSet}
                sizes="100vw"
                alt={activePhoto.title || 'Gallery photograph'}
                className="field-gallery__lightbox-image"
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <figcaption className="field-gallery__lightbox-caption">
              <div>
                <span className="field-gallery__eyebrow">{categoryLabel(activePhoto.category)}</span>
                <h3 id="field-gallery-lightbox-title">{activePhoto.title || 'Untitled study'}</h3>
                {activePhoto.photographer && <p>Photograph by {activePhoto.photographer}</p>}
              </div>
              <dl>
                {activePhoto.width && activePhoto.height && (
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{activePhoto.width} × {activePhoto.height}</dd>
                  </div>
                )}
                {activePhoto.format && (
                  <div>
                    <dt>Format</dt>
                    <dd>{activePhoto.format.toUpperCase()}</dd>
                  </div>
                )}
              </dl>
            </figcaption>
          </figure>
        </div>
      )}

      <style>{`
        .field-gallery {
          --fg-bg: #08100d;
          --fg-panel: #0d1813;
          --fg-panel-raised: #122019;
          --fg-ivory: #eee9dc;
          --fg-muted: #9caa9e;
          --fg-moss: #b7c6a5;
          --fg-brass: #c6a969;
          --fg-line: rgba(227, 219, 196, 0.15);
          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding: clamp(5rem, 9vw, 8.5rem) 0;
          background: var(--fg-bg);
          color: var(--fg-ivory);
        }

        .field-gallery__texture {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          display: none;
        }

        .field-gallery__container {
          position: relative;
          max-width: 1500px;
        }

        .field-gallery__header {
          margin-bottom: clamp(2.25rem, 5vw, 4.5rem);
        }

        .field-gallery__issue {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.65rem;
          border-bottom: 1px solid var(--fg-line);
          color: var(--fg-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .field-gallery__header-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(250px, 0.55fr);
          gap: clamp(2rem, 7vw, 7rem);
          align-items: end;
          padding: clamp(2rem, 4.5vw, 4rem) 0 1.75rem;
          border-bottom: 1px solid var(--fg-line);
        }

        .field-gallery__kicker,
        .field-gallery__eyebrow {
          display: block;
          margin: 0 0 0.65rem;
          color: var(--fg-brass);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          line-height: 1.4;
          text-transform: uppercase;
        }

        .field-gallery__header h2 {
          max-width: 900px;
          margin: 0;
          color: var(--fg-ivory);
          font-family: var(--wa-font-serif);
          font-size: clamp(2.25rem, 6.6vw, 6.4rem);
          font-weight: 500;
          letter-spacing: -0.035em;
          line-height: 0.96;
          text-wrap: balance;
        }

        .field-gallery__intro {
          padding-left: 1rem;
          border-left: 2px solid var(--fg-brass);
        }

        .field-gallery__intro p {
          margin: 0 0 1.2rem;
          color: #b8c1b9;
          font-size: clamp(0.88rem, 1.15vw, 1rem);
          line-height: 1.75;
        }

        .field-gallery__intro > span {
          color: var(--fg-moss);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .field-gallery__load-all {
          width: fit-content;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.85rem;
          padding: 0.55rem 0.9rem;
          border: 1px solid var(--fg-line);
          border-radius: 999px;
          background: transparent;
          color: var(--fg-ivory);
          font: 650 0.75rem/1 var(--wa-font-sans);
          letter-spacing: 0.06em;
          cursor: pointer;
        }

        .field-gallery__load-all:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .field-gallery__search-status,
        .field-gallery__path-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-height: 3.25rem;
          margin-top: 1rem;
        }

        .field-gallery__search-status {
          width: fit-content;
          padding: 0.7rem 0.95rem;
          border: 1px solid var(--fg-line);
          background: rgba(255,255,255,0.025);
          color: var(--fg-muted);
          font-size: 0.8rem;
        }

        .field-gallery__back {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          min-height: 44px;
          padding: 0.45rem 0.8rem;
          border: 1px solid var(--fg-line);
          border-radius: 999px;
          background: transparent;
          color: var(--fg-ivory);
          cursor: pointer;
          font: inherit;
          font-size: 0.75rem;
          transition: border-color 180ms ease, background 180ms ease;
        }

        .field-gallery__back:hover {
          border-color: rgba(198, 169, 105, 0.55);
          background: rgba(198, 169, 105, 0.07);
        }

        .field-gallery__breadcrumbs {
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .field-gallery__breadcrumbs ol {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          min-width: max-content;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .field-gallery__breadcrumbs li {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: #67736a;
        }

        .field-gallery__breadcrumbs button,
        .field-gallery__breadcrumbs span {
          border: 0;
          padding: 0.35rem 0;
          background: transparent;
          color: var(--fg-muted);
          font: inherit;
          min-height: 44px;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .field-gallery__breadcrumbs button {
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: transparent;
          text-underline-offset: 0.25rem;
        }

        .field-gallery__breadcrumbs button:hover {
          color: var(--fg-ivory);
          text-decoration-color: var(--fg-brass);
        }

        .field-gallery__breadcrumbs span[aria-current='page'] {
          color: var(--fg-ivory);
        }

        .field-gallery__folder-grid,
        .field-gallery__photo-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: clamp(1rem, 2vw, 1.75rem);
        }

        .field-gallery__folder-card {
          grid-column: span 4;
          position: relative;
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--fg-line);
          border-radius: 0;
          padding: 0;
          background: var(--fg-panel);
          color: inherit;
          cursor: pointer;
          text-align: left;
          box-shadow: 0 10px 26px rgba(0,0,0,0.14);
          transition: transform 240ms ease, border-color 240ms ease, background 240ms ease;
        }

        .field-gallery__folder-card:hover:not(:disabled) {
          transform: translateY(-5px);
          border-color: rgba(198, 169, 105, 0.55);
          background: var(--fg-panel-raised);
        }

        .field-gallery__folder-card:disabled {
          cursor: not-allowed;
          opacity: 0.46;
        }

        .field-gallery__folder-media {
          position: relative;
          display: block;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #0b1510;
        }

        .field-gallery__folder-media::after,
        .field-gallery__photo-media::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, transparent 50%, rgba(2,7,4,0.45));
        }

        .field-gallery__image-shell,
        .field-gallery__image-skeleton,
        .field-gallery__image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .field-gallery__image-shell {
          overflow: hidden;
          background: #101b15;
        }

        .field-gallery__image-skeleton {
          display: block;
          background: #14241b;
          animation: none;
        }

        .field-gallery__image {
          display: block;
          transition: opacity 260ms ease, transform 700ms cubic-bezier(.2,.65,.25,1);
        }

        .field-gallery__folder-card:hover:not(:disabled) .field-gallery__image,
        .field-gallery__photo-card:hover .field-gallery__image {
          transform: scale(1.025);
        }

        .field-gallery__empty-cover {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: rgba(183,198,165,0.48);
          background: #0d1813;
        }

        .field-gallery__folio,
        .field-gallery__photo-index {
          position: absolute;
          z-index: 2;
          top: 0.75rem;
          left: 0.75rem;
          display: grid;
          place-items: center;
          min-width: 2rem;
          height: 2rem;
          padding: 0 0.35rem;
          border: 1px solid rgba(238,233,220,0.28);
          background: rgba(4,10,7,0.88);
          color: var(--fg-ivory);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
        }

        .field-gallery__folder-copy {
          display: block;
          min-height: 168px;
          padding: 1.25rem 1.25rem 1.15rem;
          border-top: 1px solid var(--fg-line);
        }

        .field-gallery__folder-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .field-gallery__folder-heading strong {
          color: var(--fg-ivory);
          font-family: var(--wa-font-serif);
          font-size: clamp(1.15rem, 1.8vw, 1.55rem);
          font-weight: 500;
          line-height: 1.2;
        }

        .field-gallery__folder-heading svg {
          flex: 0 0 auto;
          color: var(--fg-brass);
          transition: transform 180ms ease;
        }

        .field-gallery__folder-card:hover:not(:disabled) .field-gallery__folder-heading svg {
          transform: translate(2px, -2px);
        }

        .field-gallery__folder-note,
        .field-gallery__folder-meta {
          display: block;
          color: var(--fg-muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .field-gallery__folder-note {
          min-height: 2.45em;
          margin-top: 0.55rem;
        }

        .field-gallery__folder-meta {
          margin-top: 0.85rem;
          color: var(--fg-moss);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .field-gallery__photo-card {
          grid-column: span 4;
          min-width: 0;
          border: 0;
          border-top: 1px solid var(--fg-line);
          padding: 0.75rem 0 0;
          background: transparent;
          color: inherit;
          cursor: zoom-in;
          text-align: left;
        }

        .field-gallery__photo-card--wide {
          grid-column: span 8;
        }

        .field-gallery__photo-media {
          position: relative;
          display: block;
          overflow: hidden;
          background: var(--fg-panel);
        }

        .field-gallery__photo-caption {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 0 0.2rem;
        }

        .field-gallery__photo-caption strong {
          display: block;
          max-width: 35ch;
          overflow: hidden;
          color: var(--fg-ivory);
          font-family: var(--wa-font-serif);
          font-size: clamp(0.92rem, 1.3vw, 1.15rem);
          font-weight: 500;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .field-gallery__photo-caption .field-gallery__eyebrow {
          margin-bottom: 0.3rem;
          font-size: 0.75rem;
        }

        .field-gallery__photo-spec {
          flex: 0 0 auto;
          padding-top: 1.25rem;
          color: #6f7c72;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .field-gallery__empty-state {
          display: grid;
          place-items: center;
          min-height: 330px;
          border: 1px solid var(--fg-line);
          background: rgba(255,255,255,0.018);
          color: var(--fg-muted);
          text-align: center;
          align-content: center;
        }

        .field-gallery__empty-state svg {
          margin-bottom: 1rem;
          color: var(--fg-brass);
        }

        .field-gallery__empty-state p {
          margin: 0;
          color: var(--fg-ivory);
          font-family: var(--wa-font-serif);
          font-size: 1.1rem;
        }

        .field-gallery__empty-state span {
          margin-top: 0.45rem;
          font-size: 0.75rem;
        }

        .field-gallery__lightbox {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: grid;
          place-items: center;
          overflow-y: auto;
          padding: clamp(1rem, 3vw, 2.5rem);
          background: rgba(3,7,5,0.96);
        }

        .field-gallery__lightbox-close {
          position: fixed;
          z-index: 3;
          top: max(clamp(1rem, 2vw, 1.6rem), calc(env(safe-area-inset-top, 0px) + 0.75rem));
          right: max(clamp(1rem, 2vw, 1.6rem), calc(env(safe-area-inset-right, 0px) + 0.75rem));
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border: 1px solid rgba(238,233,220,0.28);
          border-radius: 50%;
          background: rgba(8,16,13,0.78);
          color: var(--fg-ivory);
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 4px 18px rgba(0,0,0,0.48);
          transition: background 180ms ease, border-color 180ms ease;
        }

        .field-gallery__lightbox-close:hover {
          border-color: var(--fg-brass);
          background: rgba(198,169,105,0.12);
        }

        .field-gallery__lightbox-figure {
          width: min(100%, 1500px);
          margin: auto;
        }

        .field-gallery__lightbox-image-wrap {
          display: grid;
          place-items: center;
          min-height: min(65vh, 760px);
        }

        .field-gallery__lightbox-image {
          display: block;
          width: auto;
          max-width: 100%;
          height: auto;
          max-height: 76vh;
          object-fit: contain;
          box-shadow: 0 16px 42px rgba(0,0,0,0.42);
        }

        .field-gallery__lightbox-caption {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          margin-top: 1.25rem;
          padding-top: 1.1rem;
          border-top: 1px solid rgba(238,233,220,0.2);
        }

        .field-gallery__lightbox-caption h3 {
          margin: 0;
          color: var(--fg-ivory);
          font-family: var(--wa-font-serif);
          font-size: clamp(1.1rem, 2vw, 1.55rem);
          font-weight: 500;
        }

        .field-gallery__lightbox-caption p {
          margin: 0.4rem 0 0;
          color: var(--fg-muted);
          font-size: 0.875rem;
        }

        .field-gallery__lightbox-caption dl {
          display: flex;
          gap: 2rem;
          margin: 0;
        }

        .field-gallery__lightbox-caption dl div {
          min-width: 90px;
        }

        .field-gallery__lightbox-caption dt,
        .field-gallery__lightbox-caption dd {
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .field-gallery__lightbox-caption dt {
          color: #6f7c72;
        }

        .field-gallery__lightbox-caption dd {
          margin-top: 0.35rem;
          color: var(--fg-moss);
        }

        .field-gallery button:focus-visible {
          outline: 2px solid var(--fg-brass);
          outline-offset: 4px;
        }

        @keyframes fieldGalleryShimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        @media (max-width: 1024px) {
          .field-gallery__header-grid {
            grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
            gap: 2.5rem;
          }

          .field-gallery__folder-card,
          .field-gallery__photo-card {
            grid-column: span 6;
          }

          .field-gallery__photo-card--wide {
            grid-column: span 12;
          }
        }

        @media (max-width: 700px) {
          .field-gallery {
            padding: 4.25rem 0;
          }

          .field-gallery__header-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            padding: 2rem 0 1.5rem;
          }

          .field-gallery__header h2 {
            font-size: clamp(2.15rem, 12vw, 3.4rem);
          }

          .field-gallery__intro {
            max-width: 34rem;
          }

          .field-gallery__path-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .field-gallery__breadcrumbs {
            width: 100%;
          }

          .field-gallery__folder-card,
          .field-gallery__photo-card,
          .field-gallery__photo-card--wide {
            grid-column: span 12;
          }

          .field-gallery__folder-copy {
            min-height: 0;
          }

          .field-gallery__photo-caption {
            gap: 0.5rem;
          }

          .field-gallery__lightbox {
            align-items: start;
            padding:
              max(4.5rem, calc(env(safe-area-inset-top, 0px) + 4rem))
              max(1rem, calc(env(safe-area-inset-right, 0px) + 0.75rem))
              max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))
              max(1rem, calc(env(safe-area-inset-left, 0px) + 0.75rem));
          }

          .field-gallery__lightbox-image-wrap {
            min-height: 0;
          }

          .field-gallery__lightbox-image {
            max-height: 68vh;
          }

          .field-gallery__lightbox-caption {
            flex-direction: column;
            gap: 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .field-gallery *,
          .field-gallery *::before,
          .field-gallery *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
};
