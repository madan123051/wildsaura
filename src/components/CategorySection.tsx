import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Category } from '../types';
import { getDirectImageUrl, getOptimizedImageUrl } from '../utils/imageUrl';

const COLLECTION_SCROLLER_ID = 'collections-scroller';

interface CategorySectionProps {
  categories: Category[];
  onCategoryClick: (key: string) => void;
  loading?: boolean;
}

const CategoryCard: React.FC<{
  category: Category;
  index: number;
  onClick: () => void;
}> = ({ category, index, onClick }) => {
  const imageCandidates = React.useMemo(
    () => Array.from(new Set([category.imageUrl, ...(category.fallbackImageUrls || [])].filter(Boolean).flatMap((url) => {
      const direct = getDirectImageUrl(url);
      // Firebase already serves compressed uploads. Avoid a second proxy request.
      return url.includes('firebasestorage.googleapis.com') ? [direct] :
        [getOptimizedImageUrl(url, { width: 720, quality: 80, fit: 'cover' }), direct];
    }))),
    [category.imageUrl, category.fallbackImageUrls],
  );
  const [candidateIndex, setCandidateIndex] = React.useState(0);
  const [lastWorkingSrc, setLastWorkingSrc] = React.useState('');

  const src = imageCandidates[candidateIndex] || lastWorkingSrc;

  return (
    <button type="button" className={`collection-card${src ? '' : ' collection-card--empty'}`} onClick={onClick}>
      {src ? <img
        src={src}
        sizes="(max-width: 640px) 72vw, (max-width: 1100px) 34vw, 24vw"
        alt=""
        width={720}
        height={900}
        loading="lazy"
        decoding="async"
        onLoad={(event) => {
          // Legacy covers can be only 200px wide. Try the original or another
          // photograph from this collection; keep the small cover as a backup.
          if (event.currentTarget.naturalWidth < 480 &&
            candidateIndex + 1 < imageCandidates.length) {
            setLastWorkingSrc(src);
            setCandidateIndex((index) => index + 1);
          }
        }}
        onError={() => {
          if (candidateIndex >= imageCandidates.length) setLastWorkingSrc('');
          else setCandidateIndex((index) => index + 1);
        }}
      /> : <span className="collection-card__empty-copy">Explore the collection</span>}
      <span className="collection-card__wash" />
      <span className="collection-card__number">{String(index + 1).padStart(2, '0')}</span>
      <span className="collection-card__content">
        <span>{category.label}</span>
        <ArrowRight size={17} aria-hidden="true" />
      </span>
    </button>
  );
};

export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  onCategoryClick,
  loading = false,
}) => {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = React.useState(false);
  const [canScrollForward, setCanScrollForward] = React.useState(false);

  const updateControls = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const canGoBack = scroller.scrollLeft > 1;
    const canGoForward = scroller.scrollLeft < maxScroll - 1;

    setCanScrollBack((current) => current === canGoBack ? current : canGoBack);
    setCanScrollForward((current) => current === canGoForward ? current : canGoForward);
  }, []);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const frame = window.requestAnimationFrame(updateControls);
    const resizeObserver = new ResizeObserver(updateControls);
    resizeObserver.observe(scroller);
    scroller.addEventListener('scroll', updateControls, { passive: true });
    window.addEventListener('resize', updateControls);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scroller.removeEventListener('scroll', updateControls);
      window.removeEventListener('resize', updateControls);
    };
  }, [categories.length, loading, updateControls]);

  const scrollRail = React.useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(280, Math.round(scroller.clientWidth * 0.8)),
      behavior: 'smooth',
    });
  }, []);

  const handleScrollerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollRail(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollRail(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      scrollerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollerRef.current?.scrollTo({
        left: scrollerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="collection-rail" aria-labelledby="collections-title">
      <div className="wa-container collection-rail__header">
        <div>
          <p className="section-kicker"><span>00</span> Collections</p>
          <h2 id="collections-title">Find your wild.</h2>
        </div>
        <div className="collection-rail__header-actions">
          <p>Small details. Wide-open places.<br />Choose a collection and take a closer look.</p>
          <div className="collection-rail__controls" role="group" aria-label="Collection navigation">
            <button
              type="button"
              className="collection-rail__control"
              aria-label="Show previous collections"
              aria-controls={COLLECTION_SCROLLER_ID}
              disabled={!canScrollBack}
              onClick={() => scrollRail(-1)}
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="collection-rail__control"
              aria-label="Show next collections"
              aria-controls={COLLECTION_SCROLLER_ID}
              disabled={!canScrollForward}
              onClick={() => scrollRail(1)}
            >
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        id={COLLECTION_SCROLLER_ID}
        ref={scrollerRef}
        className="collection-rail__scroller"
        role="region"
        aria-label="Collection categories"
        tabIndex={0}
        onKeyDown={handleScrollerKeyDown}
      >
        <div className="collection-rail__track">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div className="collection-card collection-card--loading" key={index}>
                  <span className="skeleton-image" />
                </div>
              ))
            : categories.map((category, index) => (
                <CategoryCard
                  key={`${category.key}:${category.imageUrl}:${category.fallbackImageUrls?.join('|')}`}
                  category={category}
                  index={index}
                  onClick={() => onCategoryClick(category.key)}
                />
              ))}
        </div>
      </div>
    </section>
  );
};
