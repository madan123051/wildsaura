import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import { getDirectImageUrl, getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';
import './Hero.css';

interface HeroProps {
  onExplore: () => void;
  logoUrl?: string;
  heroImages?: string[];
  onCommunityClick?: () => void;
}

const DEFAULT_HERO_IMAGE = '/photos/tiger-hero.jpg';

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

export const Hero: React.FC<HeroProps> = ({
  onExplore,
  heroImages,
  onCommunityClick,
}) => {
  // Keep the local, preloaded photograph as the initial LCP. Firebase images are
  // available from the pagination, but are not discovered or downloaded until a
  // visitor explicitly selects one.
  const images = useMemo(() => {
    const remoteImages = (heroImages ?? [])
      .filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
      .filter((image) => image !== DEFAULT_HERO_IMAGE);

    return [DEFAULT_HERO_IMAGE, ...Array.from(new Set(remoteImages))];
  }, [heroImages]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImage, setFailedImage] = useState('');
  const [prefersReducedData] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saveData = (window.navigator as NavigatorWithConnection).connection?.saveData;
    return Boolean(saveData || window.matchMedia?.('(prefers-reduced-data: reduce)').matches);
  });
  const currentImage = images[currentIndex] || DEFAULT_HERO_IMAGE;
  const imageWidth = prefersReducedData ? 960 : 1920;
  const imageQuality = prefersReducedData ? 72 : 80;
  const sourceWidths = prefersReducedData
    ? [480, 640, 960]
    : [640, 960, 1280, 1600, 1920];
  const optimizedImage = getOptimizedImageUrl(currentImage, {
    width: imageWidth,
    quality: imageQuality,
    fit: 'cover',
  });
  const optimizedSrcSet = getOptimizedSrcSet(currentImage, sourceWidths, {
    quality: imageQuality,
    fit: 'cover',
  });

  useEffect(() => {
    setCurrentIndex((index) => Math.min(Math.max(index, 0), images.length - 1));
  }, [images.length]);

  return (
    <section id="top" className="editorial-hero" aria-label="Wilds Aura introduction">
      <div className="editorial-hero__media" aria-hidden="true">
        <img
          key={currentImage}
          src={failedImage === currentImage ? getDirectImageUrl(currentImage) : optimizedImage || currentImage}
          srcSet={failedImage === currentImage ? undefined : optimizedSrcSet}
          sizes="100vw"
          alt=""
          width={1133}
          height={768}
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
          fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
          decoding="async"
          onError={() => {
            if (failedImage !== currentImage) setFailedImage(currentImage);
            else setCurrentIndex(0);
          }}
        />
      </div>
      <div className="editorial-hero__wash" />

      <div className="wa-container editorial-hero__inner">
        <div className="editorial-hero__content">
          <p className="editorial-hero__eyebrow">
            <span>The Wilds Aura journal</span>
            <span className="editorial-hero__eyebrow-rule" />
            <span>Nepal · Japan</span>
          </p>

          <h1>
            A little closer
            <span>to the wild.</span>
          </h1>

          <p className="editorial-hero__lede">
            Some moments deserve a second look. Wildlife, quiet landscapes, and the extraordinary details in between — photographed by Madan Shrestha.
          </p>

          <div className="editorial-hero__actions">
            <button type="button" className="editorial-hero__primary" onClick={onExplore}>
              Explore photographs
              <ArrowDown size={17} aria-hidden="true" />
            </button>
            <a
              href="/community"
              className="editorial-hero__secondary"
              onClick={onCommunityClick ? (event) => {
                event.preventDefault();
                onCommunityClick();
              } : undefined}
            >
              Join the community
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="editorial-hero__signature">
            <span className="editorial-hero__signature-rule" />
            <span>Made with patience.<br /><strong>Shared with wonder.</strong></span>
          </div>
        </div>

        <div className="editorial-hero__footer">
          <div className="editorial-hero__location">
            <MapPin size={15} aria-hidden="true" />
            <span>Two homes. One natural world. <strong>Nepal ↔ Japan</strong></span>
          </div>

          {images.length > 1 && (
            <div className="editorial-hero__pagination" aria-label="Featured photographs">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`Show featured photograph ${index + 1}`}
                  aria-current={index === currentIndex ? 'true' : undefined}
                  onClick={() => setCurrentIndex(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="editorial-hero__frame-note" aria-hidden="true"><span>Look a little longer.</span><small>WILDS AURA / FIELD JOURNAL</small></div>

    </section>
  );
};
