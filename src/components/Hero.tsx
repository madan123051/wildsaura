import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';

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
          src={optimizedImage || currentImage}
          srcSet={optimizedSrcSet}
          sizes="100vw"
          alt=""
          width={1133}
          height={768}
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
          fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
          decoding="async"
        />
      </div>
      <div className="editorial-hero__wash" />

      <div className="wa-container editorial-hero__inner">
        <div className="editorial-hero__content">
          <p className="editorial-hero__eyebrow">
            <span>Wildlife photography</span>
            <span className="editorial-hero__eyebrow-rule" />
            <span>Nepal · Japan</span>
          </p>

          <h1>
            Stories from
            <span>the untamed.</span>
          </h1>

          <p className="editorial-hero__lede">
            An intimate field journal of wildlife, wild places, and the patient moments that connect us to the natural world.
          </p>

          <div className="editorial-hero__actions">
            <button type="button" className="editorial-hero__primary" onClick={onExplore}>
              Explore selected work
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
        </div>

        <div className="editorial-hero__footer">
          <div className="editorial-hero__location">
            <MapPin size={15} aria-hidden="true" />
            <span>Field notes from Nepal to Japan</span>
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

      <style>{`
        .editorial-hero {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          isolation: isolate;
          background: #0a0d0b;
          color: #f5f2e9;
        }
        .editorial-hero__media,
        .editorial-hero__placeholder,
        .editorial-hero__wash {
          position: absolute;
          inset: 0;
        }
        .editorial-hero__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 42%;
        }
        .editorial-hero__wash {
          z-index: 1;
          background:
            linear-gradient(90deg, rgba(6, 9, 7, .92) 0%, rgba(6, 9, 7, .67) 35%, rgba(6, 9, 7, .12) 70%),
            linear-gradient(0deg, rgba(6, 9, 7, .88) 0%, transparent 52%);
          pointer-events: none;
        }
        .editorial-hero__inner {
          position: relative;
          z-index: 2;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-top: 9rem;
          padding-bottom: clamp(2rem, 5vw, 4.5rem);
        }
        .editorial-hero__content {
          width: min(850px, 75vw);
          padding-bottom: clamp(3rem, 8vh, 6rem);
        }
        .editorial-hero__eyebrow {
          display: flex;
          align-items: center;
          gap: .85rem;
          margin: 0 0 1.4rem;
          color: rgba(245, 242, 233, .78);
          font: 600 .75rem/1.2 var(--wa-font-sans);
          letter-spacing: .18em;
          text-transform: uppercase;
        }
        .editorial-hero__eyebrow-rule {
          width: 2.5rem;
          height: 1px;
          background: #d7a866;
        }
        .editorial-hero h1 {
          margin: 0;
          max-width: 900px;
          font-family: var(--wa-font-serif);
          font-size: clamp(4rem, 9vw, 8.4rem);
          font-weight: 500;
          line-height: .82;
          letter-spacing: -.055em;
          text-wrap: balance;
        }
        .editorial-hero h1 span {
          display: block;
          margin-left: clamp(1.75rem, 8vw, 8rem);
          color: #dce6d4;
          font-style: italic;
          font-weight: 400;
        }
        .editorial-hero__lede {
          max-width: 540px;
          margin: clamp(1.8rem, 3vw, 2.8rem) 0 0;
          color: rgba(245, 242, 233, .78);
          font-size: clamp(1rem, 1.25vw, 1.18rem);
          line-height: 1.7;
        }
        .editorial-hero__actions {
          display: flex;
          align-items: center;
          gap: 1.35rem;
          flex-wrap: wrap;
          margin-top: 2rem;
        }
        .editorial-hero__primary,
        .editorial-hero__secondary {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .75rem;
          border-radius: 999px;
          padding: .9rem 1.25rem;
          font: 600 .78rem/1 var(--wa-font-sans);
          letter-spacing: .08em;
          text-transform: uppercase;
          text-decoration: none;
          transition: transform .25s ease, background .25s ease, border-color .25s ease;
        }
        .editorial-hero__primary {
          border: 1px solid #eef2e8;
          background: #eef2e8;
          color: #111612;
          cursor: pointer;
        }
        .editorial-hero__secondary {
          border: 1px solid rgba(245, 242, 233, .35);
          color: #f5f2e9;
        }
        .editorial-hero__primary:hover,
        .editorial-hero__secondary:hover {
          transform: translateY(-2px);
        }
        .editorial-hero__secondary:hover {
          background: rgba(245, 242, 233, .1);
          border-color: rgba(245, 242, 233, .65);
        }
        .editorial-hero__footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 2rem;
          border-top: 1px solid rgba(245, 242, 233, .22);
          padding-top: 1.15rem;
          color: rgba(245, 242, 233, .66);
          font-size: .76rem;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .editorial-hero__location {
          display: inline-flex;
          align-items: center;
          gap: .55rem;
        }
        .editorial-hero__pagination {
          display: flex;
          align-items: center;
          gap: .4rem;
        }
        .editorial-hero__pagination button {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 0;
          border-bottom: 1px solid rgba(245, 242, 233, .25);
          background: transparent;
          color: rgba(245, 242, 233, .55);
          cursor: pointer;
          font: 600 .75rem/1 var(--wa-font-sans);
        }
        .editorial-hero__pagination button[aria-current='true'] {
          border-color: #d7a866;
          color: #fff;
        }
        @media (max-width: 760px) {
          .editorial-hero { min-height: 820px; }
          .editorial-hero__inner { min-height: 820px; padding-top: 7rem; padding-bottom: 1.5rem; }
          .editorial-hero__media img { object-position: 58% center; }
          .editorial-hero__wash {
            background: linear-gradient(0deg, rgba(6, 9, 7, .97) 0%, rgba(6, 9, 7, .66) 44%, rgba(6, 9, 7, .16) 78%);
          }
          .editorial-hero__content { width: 100%; padding-bottom: 3.5rem; }
          .editorial-hero__eyebrow { margin-bottom: 1.15rem; font-size: .75rem; gap: .6rem; }
          .editorial-hero__eyebrow-rule { width: 1.5rem; }
          .editorial-hero h1 { font-size: clamp(3.5rem, 18vw, 5.8rem); line-height: .87; }
          .editorial-hero h1 span { margin-left: 0; }
          .editorial-hero__lede { max-width: 34rem; font-size: .95rem; line-height: 1.6; }
          .editorial-hero__actions { align-items: stretch; gap: .7rem; }
          .editorial-hero__primary, .editorial-hero__secondary { width: 100%; }
          .editorial-hero__footer { align-items: center; }
          .editorial-hero__pagination { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .editorial-hero__primary,
          .editorial-hero__secondary { transition: none; }
        }
      `}</style>
    </section>
  );
};
