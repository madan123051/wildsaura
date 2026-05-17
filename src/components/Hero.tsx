import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  logoUrl?: string;
  heroImages?: string[];
  onCommunityClick?: () => void;
}

const DEFAULT_HERO = '/photos/tiger-hero.jpg';

const C = {
  natgeoYellow: '#9fcb8f',
  parchment:    '#e8f5e9',
  sage:         '#9fcb8f',
  himalBlue:    '#8DC3D8',
  muted:        'rgba(159,203,143,0.65)',
  bg:           '#0c1e16',
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

            <a href="/marketplace" className="hero-link-btn">
              <ChevronDown size={14} style={{ color: C.natgeoYellow, animation: 'bounce 2s infinite' }} />
              <span className="font-cinzel">Visit Marketplace</span>
            </a>

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

          /* Image on top — show clearly */
          .hero-split-image {
            position: relative;
            min-height: 48vh;
            max-height: 52vh;
            order: -1;
          }
          .hero-image-blend {
            /* bottom gradient on mobile */
            top: auto; left: 0; right: 0; bottom: 0;
            width: 100%; height: 80px;
            background: linear-gradient(to top, ${C.bg}, transparent);
          }

          /* Show meta overlay on bottom of image */
          .hero-meta-mobile {
            display: block;
            position: absolute;
            bottom: 0;
            left: 0; right: 0;
            z-index: 4;
            padding: 0.6rem 1rem 0.5rem;
            background: linear-gradient(to top, ${C.bg} 0%, rgba(12,30,22,0.85) 40%, transparent 100%);
          }
          .hero-meta-mobile .hero-eyebrow {
            font-size: 0.5rem;
            margin-bottom: 0.2rem;
            letter-spacing: 0.18em;
          }
          .hero-meta-mobile .hero-time {
            font-size: 0.55rem;
            margin-bottom: 0;
            gap: 0.35rem;
          }

          /* Hide desktop meta in text section */
          .hero-meta-desktop {
            display: none;
          }

          .hero-split-text {
            width: 100%;
            min-width: unset;
            padding: 0.6rem 1.2rem 2rem;
            margin-top: 0;
            position: relative;
            z-index: 3;
          }

          .hero-title {
            font-size: clamp(1.5rem, 6.5vw, 2rem);
            margin-top: 0;
          }

          .hero-title-bar {
            margin: 0.4rem 0;
          }

          .hero-subtitle {
            font-size: 0.78rem;
            margin-bottom: 1rem;
            line-height: 1.55;
          }

          .hero-cta-row { gap: 0.6rem; }
          .hero-link-btn .font-cinzel { font-size: 0.55rem; }

          .hero-dots {
            bottom: 3.5rem;
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
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px rgba(74,222,128,0.7); }
          50% { opacity: 0.5; transform: scale(0.75); box-shadow: 0 0 3px rgba(74,222,128,0.3); }
        }
      `}</style>
    </>
  );
};
