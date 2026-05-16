import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  logoUrl?: string;
  heroImages?: string[];
  onCommunityClick?: () => void;
}

const DEFAULT_HERO = '/photos/tiger-hero.jpg';

// WA Nature of Nepal palette
const C = {
  natgeoYellow: '#9fcb8f',
  parchment:    '#e8f5e9',   // WA light — title
  sage:         '#9fcb8f',   // WA moss — body text
  himalBlue:    '#8DC3D8',   // Himalayan sky — eyebrow
  muted:        'rgba(159,203,143,0.65)', // WA moss muted
};

// Nepal Standard Time = UTC+5:45
function getNPTDate(): { dateStr: string; timeStr: string } {
  const now = new Date();
  // NPT offset: +5 hours 45 minutes
  const nptOffset = 5 * 60 + 45; // minutes
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

  // Tick every second
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
    <section id="top" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>

      {/* Background image + overlays */}
      <div style={{ position: 'absolute', inset: 0 }}>
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
        <div className="cinematic-overlay-left" style={{ position: 'absolute', inset: 0, opacity: 0.68 }} />
        <div className="cinematic-overlay-bottom" style={{ position: 'absolute', inset: 0, opacity: 0.62 }} />
        <div className="cinematic-vignette" style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* Slide dots */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '5rem', left: '50%',
          transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 5,
        }}>
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setFade(false);
                setTimeout(() => { setCurrentIndex(idx); setFade(true); }, 300);
              }}
              style={{
                width: idx === currentIndex ? 24 : 8, height: 8,
                borderRadius: 4, border: 'none', cursor: 'pointer',
                background: idx === currentIndex ? C.natgeoYellow : 'rgba(159,203,143,0.35)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Hero content */}
      <div className="wa-container" style={{ position: 'relative', zIndex: 6, paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '620px' }}>

          {/* Glass card with NatGeo top rule */}
          <div
            className="animate-fade-in-up anim-delay-200"
            style={{
              marginBottom: '1.25rem',
              padding: '1.1rem 1.2rem 1rem',
              borderRadius: '0 0 14px 14px',
              background: 'rgba(2, 8, 5, 0.52)',
              border: '1px solid rgba(63,123,74,0.22)',
              borderTop: `4px solid ${C.natgeoYellow}`,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          >
            {/* Eyebrow — Himalayan sky blue */}
            <div style={{
              marginBottom: '0.55rem',
              fontFamily: "'Cinzel', serif",
              fontSize: '0.65rem',
              letterSpacing: '0.22em',
              fontWeight: 700,
              color: C.himalBlue,
              textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              flexWrap: 'wrap',
            }}>
              <span style={{ display: 'inline-block', width: 24, height: 2, background: C.natgeoYellow, borderRadius: 1, flexShrink: 0 }} />
              Nature &nbsp;·&nbsp; Stories &nbsp;·&nbsp; Conservation
            </div>

            {/* Live Nepal Date & Time bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              marginBottom: '0.7rem',
              fontFamily: 'monospace',
              fontSize: '0.68rem',
              letterSpacing: '0.04em',
              color: C.parchment,
              opacity: 0.82,
            }}>
              {/* Pulsing green dot */}
              <span style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px rgba(74,222,128,0.7)',
                animation: 'livePulse 1.8s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ color: C.natgeoYellow, fontWeight: 700 }}>{nptTime.dateStr}</span>
              <span style={{ color: 'rgba(197,217,181,0.5)' }}>·</span>
              <span>{nptTime.timeStr}</span>
            </div>

            {/* Main title — warm parchment */}
            <h1
              className="font-cinzel"
              style={{
                margin: 0,
                fontSize: 'clamp(1.8rem, 4.2vw, 2.75rem)',
                lineHeight: 1.18,
                letterSpacing: '0.03em',
                color: C.parchment,
                textShadow: '0 3px 20px rgba(0,0,0,0.9)',
                fontWeight: 700,
              }}
            >
              Nepal's Wild Heritage
            </h1>

            {/* NatGeo yellow accent underline */}
            <div style={{
              width: 52, height: 3,
              background: C.natgeoYellow,
              borderRadius: 2,
              margin: '0.65rem 0',
            }} />

            {/* Card subtitle — sage green */}
            <p style={{
              margin: 0,
              color: C.sage,
              maxWidth: '34rem',
              lineHeight: 1.7,
              fontSize: '0.92rem',
              fontWeight: 400,
            }}>
              Beautiful wildlife photos, short stories, and a quiet mission to protect the animals and landscapes of Nepal.
            </p>
          </div>

          {/* Secondary paragraph — muted sage */}
          <p
            className="animate-fade-in-up anim-delay-400"
            style={{
              color: C.muted,
              marginBottom: '1.4rem',
              lineHeight: 1.8,
              fontSize: '0.88rem',
            }}
          >
            WildSaura connects photographers, nature lovers, and conservationists. Every photo you explore or purchase helps protect Nepal's wildlife.
          </p>

          {/* CTA buttons */}
          <div
            className="animate-fade-in-up anim-delay-600"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
          >
            <button className="btn-gold" onClick={onExplore}>Explore Photos</button>

            <a
              href="/marketplace"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
            >
              <ChevronDown size={14} style={{ color: C.natgeoYellow, animation: 'bounce 2s infinite' }} />
              <span
                className="font-cinzel"
                style={{ fontSize: '0.68rem', letterSpacing: '0.16em', color: C.muted }}
              >
                Visit Marketplace
              </span>
            </a>

            <a
              href="/community"
              onClick={onCommunityClick ? (e) => { e.preventDefault(); onCommunityClick(); } : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
            >
              <ChevronDown size={14} style={{ color: C.natgeoYellow, animation: 'bounce 2s infinite' }} />
              <span
                className="font-cinzel"
                style={{ fontSize: '0.68rem', letterSpacing: '0.16em', color: C.muted }}
              >
                Join Community
              </span>
            </a>

            <a
              href="/ngo"
              className="btn-gold-outline"
              style={{ textDecoration: 'none' }}
            >
              Support Animals
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="animate-fade-in anim-delay-800"
        style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}
      >
        <div style={{
          width: 1, height: 48,
          background: `linear-gradient(to bottom, transparent, ${C.natgeoYellow}66, transparent)`,
        }} />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px rgba(74,222,128,0.7); }
          50% { opacity: 0.5; transform: scale(0.75); box-shadow: 0 0 3px rgba(74,222,128,0.3); }
        }
      `}</style>
    </section>
  );
};
