import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  logoUrl?: string;
  heroImages?: string[];
}

const DEFAULT_HERO = '/photos/tiger-hero.jpg';

export const Hero: React.FC<HeroProps> = ({ onExplore, logoUrl, heroImages }) => {
  const images = heroImages && heroImages.length > 0 ? heroImages : [DEFAULT_HERO];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
        setFade(true);
      }, 600);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section id="top" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      {/* Background Image with fade transition */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <img
          src={images[currentIndex]}
          alt="Wildlife photography"
          style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
            transition: 'opacity 0.6s ease-in-out',
            opacity: fade ? 1 : 0,
          }}
        />
        {/* Cinematic overlays */}
        <div className="cinematic-overlay-left" style={{ position: 'absolute', inset: 0 }} />
        <div className="cinematic-overlay-bottom" style={{ position: 'absolute', inset: 0 }} />
        <div className="cinematic-vignette" style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* Slide indicators */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '0.5rem', zIndex: 5,
        }}>
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setFade(false); setTimeout(() => { setCurrentIndex(idx); setFade(true); }, 300); }}
              style={{
                width: idx === currentIndex ? 24 : 8, height: 8,
                borderRadius: 4, border: 'none', cursor: 'pointer',
                background: idx === currentIndex ? 'var(--wa-gold)' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="wa-container" style={{ position: 'relative', paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '600px' }}>
          <h1 className="font-playfair animate-fade-in-up anim-delay-200" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 700, lineHeight: 1.1, marginBottom: '1.5rem' }}>
            <span style={{ display: 'block', fontStyle: 'italic', fontWeight: 400, fontSize: '0.65em', opacity: 0.9 }}>
              Explore the
            </span>
            <span className="text-gold-gradient">Wonders of World</span>
          </h1>
          <p className="font-inter text-wa-mid animate-fade-in-up anim-delay-400" style={{ fontSize: '1rem', marginBottom: '2.5rem', maxWidth: '400px', lineHeight: 1.7 }}>
            Capturing the wild, one frame at a time.
          </p>
          <div className="animate-fade-in-up anim-delay-600" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-gold" onClick={onExplore}>
              View Gallery
            </button>
            <a
              href="#about"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
              className="text-wa-muted"
            >
              <ChevronDown size={16} style={{ animation: 'bounce 2s infinite' }} />
              <span className="font-cinzel" style={{ fontSize: '0.7rem', letterSpacing: '0.15em' }}>Scroll Down</span>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="animate-fade-in anim-delay-800" style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}>
        <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.5), transparent)' }} />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>
    </section>
  );
};
