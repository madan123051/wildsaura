import React, { useState } from 'react';

// ── Custom SVG Icons ─────────────────────────────────────────────────────────

const MarketIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Store awning */}
    <path d="M8 24h48l-4-12H12L8 24z" fill="url(#marketGrad1)" opacity="0.9" />
    <path d="M8 24c0 4 2.67 7 6 7s6-3 6-7" stroke="currentColor" strokeWidth="2" fill="url(#marketGrad2)" opacity="0.6" />
    <path d="M20 24c0 4 2.67 7 6 7s6-3 6-7" stroke="currentColor" strokeWidth="2" fill="url(#marketGrad2)" opacity="0.6" />
    <path d="M32 24c0 4 2.67 7 6 7s6-3 6-7" stroke="currentColor" strokeWidth="2" fill="url(#marketGrad2)" opacity="0.6" />
    <path d="M44 24c0 4 2.67 7 6 7s6-3 6-7" stroke="currentColor" strokeWidth="2" fill="url(#marketGrad2)" opacity="0.6" />
    {/* Store body */}
    <rect x="10" y="31" width="44" height="22" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
    {/* Door */}
    <rect x="26" y="38" width="12" height="15" rx="1.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="36" cy="46" r="1.2" fill="currentColor" opacity="0.6" />
    {/* Window */}
    <rect x="14" y="35" width="8" height="8" rx="1" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1" />
    <rect x="42" y="35" width="8" height="8" rx="1" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1" />
    <defs>
      <linearGradient id="marketGrad1" x1="32" y1="12" x2="32" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c9a84c" />
        <stop offset="1" stopColor="#8b6914" />
      </linearGradient>
      <linearGradient id="marketGrad2" x1="0" y1="24" x2="0" y2="31" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c9a84c" stopOpacity="0.4" />
        <stop offset="1" stopColor="#c9a84c" stopOpacity="0.1" />
      </linearGradient>
    </defs>
  </svg>
);

const DrishyaIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Camera body */}
    <rect x="8" y="20" width="48" height="32" rx="6" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" />
    {/* Flash/viewfinder bump */}
    <rect x="22" y="14" width="14" height="8" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    {/* Lens outer ring */}
    <circle cx="32" cy="36" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="32" cy="36" r="9" fill="url(#drishyaGrad)" opacity="0.3" stroke="currentColor" strokeWidth="1.5" />
    {/* Lens inner */}
    <circle cx="32" cy="36" r="5" fill="url(#drishyaGrad2)" opacity="0.5" />
    <circle cx="32" cy="36" r="2.5" fill="currentColor" opacity="0.2" />
    {/* Lens reflection */}
    <circle cx="29" cy="33" r="1.5" fill="currentColor" opacity="0.3" />
    {/* Button */}
    <circle cx="48" cy="24" r="2" fill="currentColor" opacity="0.3" />
    <defs>
      <radialGradient id="drishyaGrad" cx="32" cy="36" r="9" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c9a84c" />
        <stop offset="1" stopColor="#4a3a10" />
      </radialGradient>
      <radialGradient id="drishyaGrad2" cx="32" cy="36" r="5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f0d68a" />
        <stop offset="1" stopColor="#c9a84c" />
      </radialGradient>
    </defs>
  </svg>
);

const ProStudioIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Film strip left */}
    <rect x="6" y="10" width="12" height="44" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
    {[14, 22, 30, 38, 46].map((y) => (
      <rect key={y} x="8" y={y} width="3" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
    ))}
    {/* Play button / Studio light */}
    <circle cx="36" cy="32" r="18" fill="url(#studioGrad)" opacity="0.15" stroke="currentColor" strokeWidth="2" />
    <circle cx="36" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    {/* Play triangle */}
    <path d="M30 22v20l18-10L30 22z" fill="url(#studioGrad2)" opacity="0.7" />
    {/* Sparkle / star accent */}
    <path d="M52 12l1.5 3 3 1.5-3 1.5L52 21l-1.5-3-3-1.5 3-1.5L52 12z" fill="#c9a84c" opacity="0.6" />
    <path d="M22 50l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="#c9a84c" opacity="0.4" />
    <defs>
      <radialGradient id="studioGrad" cx="36" cy="32" r="18" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c9a84c" />
        <stop offset="1" stopColor="#2a2010" />
      </radialGradient>
      <linearGradient id="studioGrad2" x1="30" y1="22" x2="48" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f0d68a" />
        <stop offset="1" stopColor="#c9a84c" />
      </linearGradient>
    </defs>
  </svg>
);

// ── App Data ─────────────────────────────────────────────────────────────────

interface AppInfo {
  name: string;
  tagline: string;
  description: string;
  url: string;
  Icon: React.FC<{ size?: number }>;
  gradient: string;
  accentColor: string;
}

const OUR_APPS: AppInfo[] = [
  {
    name: 'WildSaura Market',
    tagline: 'Shop Nature',
    description: 'Explore premium wildlife prints, nature-inspired merchandise & exclusive photography gear.',
    url: 'https://market.wildsaura.com',
    Icon: MarketIcon,
    gradient: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(139,105,20,0.06) 100%)',
    accentColor: '#c9a84c',
  },
  {
    name: 'Drishya',
    tagline: 'Visual Stories',
    description: 'Immersive photo galleries, curated collections & visual storytelling from the wild.',
    url: 'https://drishya.wildsaura.com',
    Icon: DrishyaIcon,
    gradient: 'linear-gradient(135deg, rgba(76,168,201,0.12) 0%, rgba(20,105,139,0.06) 100%)',
    accentColor: '#4ca8c9',
  },
  {
    name: 'ProStudio',
    tagline: 'Create & Edit',
    description: 'Professional photo & video editing tools, presets, and creative resources for photographers.',
    url: 'https://prostudio.wildsaura.com',
    Icon: ProStudioIcon,
    gradient: 'linear-gradient(135deg, rgba(168,76,201,0.12) 0%, rgba(105,20,139,0.06) 100%)',
    accentColor: '#a84cc9',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export const OurAppsSection: React.FC = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section
      id="our-apps"
      style={{
        padding: '4rem 0 3rem',
        background: 'linear-gradient(180deg, rgba(10,8,5,0) 0%, rgba(10,8,5,0.6) 50%, rgba(10,8,5,0) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative line */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '120px', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
      }} />

      <div className="wa-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p className="font-cinzel" style={{
            fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--wa-gold)', marginBottom: '0.5rem', opacity: 0.7,
          }}>
            ✦ Our Ecosystem ✦
          </p>
          <h2 className="font-cinzel" style={{
            fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
            color: 'var(--wa-cream)',
            fontWeight: 600,
            margin: '0 0 0.5rem',
            letterSpacing: '0.05em',
          }}>
            Explore Our World
          </h2>
          <p style={{
            fontSize: '0.8rem', color: 'rgba(235,230,220,0.5)',
            maxWidth: '400px', margin: '0 auto', lineHeight: 1.6,
          }}>
            Discover more from the WildSaura family — shop, create, and experience nature like never before.
          </p>
        </div>

        {/* App Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {OUR_APPS.map((app, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '1.75rem 1.5rem',
                  borderRadius: '16px',
                  background: isHovered ? app.gradient : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHovered ? `${app.accentColor}40` : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${app.accentColor}15`
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Glow effect on hover */}
                <div style={{
                  position: 'absolute', top: '-50%', right: '-50%',
                  width: '100%', height: '100%',
                  background: `radial-gradient(circle, ${app.accentColor}08 0%, transparent 70%)`,
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.4s',
                  pointerEvents: 'none',
                }} />

                {/* Icon */}
                <div style={{
                  color: isHovered ? app.accentColor : 'rgba(235,230,220,0.4)',
                  transition: 'all 0.4s',
                  marginBottom: '1rem',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                }}>
                  <app.Icon size={44} />
                </div>

                {/* Name & Tagline */}
                <div style={{ marginBottom: '0.6rem' }}>
                  <h3 className="font-cinzel" style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: isHovered ? app.accentColor : 'var(--wa-cream)',
                    margin: '0 0 0.15rem',
                    transition: 'color 0.3s',
                    letterSpacing: '0.03em',
                  }}>
                    {app.name}
                  </h3>
                  <span style={{
                    fontSize: '0.65rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: isHovered ? `${app.accentColor}bb` : 'rgba(235,230,220,0.35)',
                    fontWeight: 600,
                    transition: 'color 0.3s',
                  }}>
                    {app.tagline}
                  </span>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: '0.75rem',
                  lineHeight: 1.6,
                  color: 'rgba(235,230,220,0.5)',
                  margin: '0 0 1rem',
                }}>
                  {app.description}
                </p>

                {/* Visit CTA */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: isHovered ? app.accentColor : 'rgba(235,230,220,0.3)',
                  transition: 'all 0.3s',
                  letterSpacing: '0.08em',
                }}>
                  <span>Visit</span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      transition: 'transform 0.3s',
                      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                    }}
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Bottom decorative line */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '80px', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)',
      }} />
    </section>
  );
};
