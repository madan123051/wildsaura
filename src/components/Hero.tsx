import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, ShoppingBag, Camera, Sparkles } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  logoUrl?: string;
  heroImages?: string[];
  onCommunityClick?: () => void;
}

const DEFAULT_HERO = '/photos/tiger-hero.jpg';

const C = {
  natgeoYellow: '#d4b96e',
  parchment:    '#f7f4e8',
  sage:         '#bfd1b7',
  himalBlue:    '#8DC3D8',
  muted:        'rgba(191,209,183,0.72)',
  bg:           '#08120e',
};

function getNPTDate(): { dateStr: string; timeStr: string } {
  const now = new Date();
  const nptOffset = 5 * 60 + 45;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const npt = new Date(utcMs + nptOffset * 60000);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const day  = DAYS[npt.getDay()];
  const date = npt.getDate();
  const mon  = MONTHS[npt.getMonth()];
  const yr   = npt.getFullYear();
  const hh = npt.getHours();
  const mm  = String(npt.getMinutes()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12  = hh % 12 || 12;
  return {
    dateStr: `${day}, ${date} ${mon} ${yr}`,
    timeStr: `${h12}:${mm} ${ampm} NPT`,
  };
}

export const Hero: React.FC<HeroProps> = ({ onExplore, heroImages, onCommunityClick }) => {
  const images = heroImages && heroImages.length > 0 ? heroImages : [DEFAULT_HERO];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [nptTime, setNptTime] = useState<{ dateStr: string; timeStr: string }>(getNPTDate);
  const [marketOpen, setMarketOpen] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNptTime(getNPTDate()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setFade(true);
      }, 600);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <>
      <section id="top" className="hero-split-section">
        {/* ── LEFT: Text Content (Desktop) ── */}
        <div className="hero-split-text">
          {/* Eyebrow + Time — visible on desktop, hidden on mobile (shown on image instead) */}
          <div className="hero-meta-desktop">
            <div className="hero-accent-line" />
            <div className="hero-eyebrow animate-fade-in-up anim-delay-200">
              <span className="hero-eyebrow-dash" />
              Nature &nbsp;·&nbsp; Stories &nbsp;·&nbsp; Conservation
            </div>
            <div className="hero-time animate-fade-in-up anim-delay-200">
              <span className="hero-live-dot" />
              <span style={{ color: C.natgeoYellow, fontWeight: 700 }}>{nptTime.dateStr}</span>
              <span style={{ color: 'rgba(197,217,181,0.4)' }}>·</span>
              <span>{nptTime.timeStr}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-cinzel hero-title animate-fade-in-up anim-delay-300">
            Nepal's Wild<br />Heritage
          </h1>

          {/* Accent bar */}
          <div className="hero-title-bar animate-fade-in-up anim-delay-300" />

          {/* Subtitle */}
          <p className="hero-subtitle animate-fade-in-up anim-delay-400">
            Beautiful wildlife photos, short stories, and a quiet mission to protect the animals and landscapes of Nepal.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta-row animate-fade-in-up anim-delay-600">
            <button className="btn-gold" onClick={onExplore}>Explore Photos</button>

            <div className="hero-market-wrapper" style={{ position: 'relative' }}>
              <button
                className="hero-link-btn"
                onClick={() => setMarketOpen(!marketOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {marketOpen
                  ? <ChevronUp size={14} style={{ color: C.natgeoYellow }} />
                  : <ChevronDown size={14} style={{ color: C.natgeoYellow, animation: 'bounce 2s infinite' }} />
                }
                <span className="font-cinzel">Visit Marketplace</span>
              </button>

              {marketOpen && createPortal(
                <div className="hero-market-portal">
                  <div
                    className="hero-market-backdrop"
                    onClick={() => setMarketOpen(false)}
                  />
                  <div className="hero-market-dropdown">
                  <button
                    className="hero-market-close"
                    onClick={() => setMarketOpen(false)}
                    aria-label="Close"
                  >✕</button>
                  <p className="hero-market-note">
                    Nepal's stock photography marketplace — buy authentic photos from local photographers, 
                    upload your work through Drishya, or edit with ProStudio.
                  </p>
                  <div className="hero-market-links">
                    <a href="https://market.wildsaura.com" target="_blank" rel="noopener noreferrer" className="hero-market-link">
                      <ShoppingBag size={16} />
                      <div>
                        <span className="hero-market-link-title">Market</span>
                        <span className="hero-market-link-desc">Buy & sell stock photos</span>
                      </div>
                    </a>
                    <a href="https://drishya.wildsaura.com" target="_blank" rel="noopener noreferrer" className="hero-market-link">
                      <Camera size={16} />
                      <div>
                        <span className="hero-market-link-title">Drishya</span>
                        <span className="hero-market-link-desc">Upload & manage your work</span>
                      </div>
                    </a>
                    <a href="https://prostudio.wildsaura.com" target="_blank" rel="noopener noreferrer" className="hero-market-link">
                      <Sparkles size={16} />
                      <div>
                        <span className="hero-market-link-title">ProStudio</span>
                        <span className="hero-market-link-desc">AI photo editing tools</span>
                      </div>
                    </a>
                  </div>
                </div>
                </div>,
                document.body
              )}
            </div>

            <a
              href="/community"
              onClick={onCommunityClick ? (e) => { e.preventDefault(); onCommunityClick(); } : undefined}
              className="hero-link-btn"
            >
              <ChevronDown size={14} style={{ color: C.natgeoYellow, animation: 'bounce 2s infinite' }} />
              <span className="font-cinzel">Join Community</span>
            </a>

            <a href="/ngo" className="btn-gold-outline" style={{ textDecoration: 'none' }}>
              Support Animals
            </a>
          </div>
        </div>

        {/* ── RIGHT: Hero Image ── */}
        <div className="hero-split-image">
          <img
            src={images[currentIndex]}
            alt="Wildlife photography"
            loading="eager"
            fetchPriority="high"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              transition: 'opacity 0.6s ease-in-out',
              opacity: fade ? 1 : 0,
            }}
          />
          {/* Gradient blend */}
          <div className="hero-image-blend" />

          {/* ── Mobile-only: meta overlay on bottom of image ── */}
          <div className="hero-meta-mobile">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dash" />
              Nature &nbsp;·&nbsp; Stories &nbsp;·&nbsp; Conservation
            </div>
            <div className="hero-time">
              <span className="hero-live-dot" />
              <span style={{ color: C.natgeoYellow, fontWeight: 700 }}>{nptTime.dateStr}</span>
              <span style={{ color: 'rgba(197,217,181,0.4)' }}>·</span>
              <span>{nptTime.timeStr}</span>
            </div>
          </div>

          {/* Slide dots */}
          {images.length > 1 && (
            <div className="hero-dots">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFade(false);
                    setTimeout(() => { setCurrentIndex(idx); setFade(true); }, 300);
                  }}
                  className={`hero-dot ${idx === currentIndex ? 'hero-dot-active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`
        /* ── HERO SPLIT LAYOUT ── */
        .hero-split-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          background: ${C.bg};
        }

        /* ── LEFT TEXT PANEL ── */
        .hero-split-text {
          position: relative;
          z-index: 2;
          width: 45%;
          min-width: 380px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 6rem 3rem 3rem 3.5rem;
          background: ${C.bg};
        }

        .hero-accent-line {
          width: 48px; height: 3px;
          background: ${C.natgeoYellow};
          border-radius: 2px;
          margin-bottom: 1.2rem;
        }

        .hero-eyebrow {
          font-family: 'Cinzel', serif;
          font-size: 0.62rem;
          letter-spacing: 0.22em;
          font-weight: 700;
          color: ${C.himalBlue};
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .hero-eyebrow-dash {
          display: inline-block;
          width: 20px; height: 2px;
          background: ${C.natgeoYellow};
          border-radius: 1px;
          flex-shrink: 0;
        }

        .hero-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.8rem;
          font-family: monospace;
          font-size: 0.65rem;
          letter-spacing: 0.04em;
          color: ${C.parchment};
          opacity: 0.8;
        }
        .hero-live-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px rgba(74,222,128,0.7);
          animation: livePulse 1.8s ease-in-out infinite;
          flex-shrink: 0;
        }

        .hero-title {
          margin: 0;
          font-size: clamp(2rem, 3.5vw, 3.2rem);
          line-height: 1.12;
          letter-spacing: 0.03em;
          color: ${C.parchment};
          font-weight: 700;
        }

        .hero-title-bar {
          width: 48px; height: 3px;
          background: ${C.natgeoYellow};
          border-radius: 2px;
          margin: 0.7rem 0;
        }

        .hero-subtitle {
          margin: 0 0 1.6rem 0;
          color: ${C.sage};
          max-width: 28rem;
          line-height: 1.7;
          font-size: 0.9rem;
          font-weight: 400;
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-wrap: wrap;
        }

        .hero-link-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          text-decoration: none;
        }
        .hero-link-btn .font-cinzel {
          font-size: 0.62rem;
          letter-spacing: 0.16em;
          color: ${C.muted};
        }

        /* ── RIGHT IMAGE PANEL ── */
        .hero-split-image {
          position: relative;
          flex: 1;
          min-height: 100vh;
          overflow: hidden;
        }

        .hero-image-blend {
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 120px;
          background: linear-gradient(to right, ${C.bg}, transparent);
          z-index: 1;
          pointer-events: none;
        }

        .hero-dots {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.45rem;
          z-index: 5;
        }
        .hero-dot {
          width: 8px; height: 8px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          background: rgba(159,203,143,0.35);
          transition: all 0.3s;
          padding: 0;
        }
        .hero-dot-active {
          width: 24px;
          background: ${C.natgeoYellow};
        }

        /* ── Mobile meta overlay — HIDDEN on desktop ── */
        .hero-meta-mobile {
          display: none;
        }
        /* ── Desktop meta — VISIBLE on desktop ── */
        .hero-meta-desktop {
          display: block;
        }

        /* ── MOBILE LAYOUT (<768px) ── */
        @media (max-width: 768px) {
          .hero-split-section {
            flex-direction: column;
            min-height: auto;
          }

          /* Image on top — tight fit, no wasted space */
          .hero-split-image {
            position: relative;
            min-height: 0;
            max-height: none;
            height: auto;
            aspect-ratio: 4/3;
            order: -1;
            overflow: hidden;
          }
          .hero-image-blend {
            display: none; /* no side gradient on mobile */
          }

          /* Show meta overlay on bottom of image — tight */
          .hero-meta-mobile {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: absolute;
            bottom: 0;
            left: 0; right: 0;
            z-index: 4;
            padding: 0.3rem 1rem 0.25rem;
            background: linear-gradient(to top, ${C.bg} 0%, rgba(12,30,22,0.7) 50%, transparent 100%);
          }
          .hero-meta-mobile .hero-eyebrow {
            font-size: 0.45rem;
            margin-bottom: 0.1rem;
            letter-spacing: 0.18em;
          }
          .hero-meta-mobile .hero-time {
            font-size: 0.48rem;
            margin-bottom: 0;
            gap: 0.3rem;
          }

          /* Hide desktop meta in text section */
          .hero-meta-desktop {
            display: none;
          }

          .hero-split-text {
            width: 100%;
            min-width: unset;
            padding: 0.4rem 1rem 1.5rem;
            margin-top: -2px; /* seamless merge */
            position: relative;
            z-index: 3;
            background: ${C.bg};
          }

          .hero-title {
            font-size: clamp(1.4rem, 6vw, 1.8rem);
            margin-top: 0;
            margin-bottom: 0.2rem;
          }

          .hero-title-bar {
            margin: 0.4rem 0;
          }

          .hero-subtitle {
            font-size: 0.75rem;
            margin-bottom: 0.6rem;
            line-height: 1.45;
          }

          .hero-cta-row { gap: 0.6rem; }
          .hero-link-btn .font-cinzel { font-size: 0.55rem; }

          .hero-dots {
            bottom: 2.2rem;
          }
        }

        /* ── TABLET (769-1024px) ── */
        @media (min-width: 769px) and (max-width: 1024px) {
          .hero-split-text {
            width: 42%;
            min-width: 320px;
            padding: 5rem 2rem 2.5rem 2.5rem;
          }
          .hero-title {
            font-size: clamp(1.8rem, 3vw, 2.4rem);
          }
        }

        /* ── LARGE DESKTOP (>1400px) ── */
        @media (min-width: 1400px) {
          .hero-split-text {
            padding: 6rem 4rem 3rem 5rem;
          }
          .hero-title {
            font-size: 3.5rem;
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }

        /* ── MARKETPLACE DROPDOWN ── */
        .hero-market-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 9998;
        }
        .hero-market-close {
          position: absolute;
          top: 12px;
          right: 14px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .hero-market-close:hover {
          background: rgba(255,255,255,0.2);
        }
        .hero-market-wrapper {
          position: relative;
        }
        .hero-market-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 9998;
        }
        .hero-market-close {
          position: absolute;
          top: 10px;
          right: 12px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-market-close:hover { background: rgba(255,255,255,0.2); }
        .hero-market-dropdown {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          background: rgba(12, 30, 22, 0.98);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(159, 203, 143, 0.25);
          border-radius: 18px;
          padding: 1.2rem 1rem;
          width: 310px;
          max-width: calc(100vw - 32px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
          animation: dropIn 0.2s ease-out;
        }
        .hero-market-note {
          margin: 0 0 0.7rem 0;
          font-size: 0.7rem;
          line-height: 1.5;
          color: rgba(159, 203, 143, 0.7);
          border-bottom: 1px solid rgba(159, 203, 143, 0.12);
          padding-bottom: 0.6rem;
        }
        .hero-market-links {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .hero-market-link {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.6rem;
          border-radius: 8px;
          text-decoration: none;
          color: #e8f5e9;
          transition: background 0.2s;
        }
        .hero-market-link:hover {
          background: rgba(159, 203, 143, 0.12);
        }
        .hero-market-link svg {
          color: #9fcb8f;
          flex-shrink: 0;
        }
        .hero-market-link div {
          display: flex;
          flex-direction: column;
        }
        .hero-market-link-title {
          font-family: 'Cinzel', serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: #e8f5e9;
        }
        .hero-market-link-desc {
          font-size: 0.6rem;
          color: rgba(159, 203, 143, 0.55);
          margin-top: 0.05rem;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .hero-market-dropdown {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: calc(100vw - 40px);
            max-width: 340px;
            max-height: calc(100vh - 100px);
            padding: 18px 16px 14px;
          }
          .hero-market-note {
            font-size: 11.5px;
            margin-bottom: 10px;
            padding-bottom: 8px;
          }
          .hero-market-link {
            padding: 8px 10px;
          }
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px rgba(74,222,128,0.7); }
          50% { opacity: 0.5; transform: scale(0.75); box-shadow: 0 0 3px rgba(74,222,128,0.3); }
        }
      `}</style>
    </>
  );
};
