import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { fetchEnabledSelfAds, SelfAd } from '../services/selfAdService';

// ── Self-Ad Popup — shows on site load, dismisses per session ────────
const SelfAdPopup: React.FC = () => {
  const [ad, setAd] = useState<SelfAd | null>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem('selfAdDismissed');
    if (dismissed) return;

    let shown = false;

    const showPopup = () => {
      if (shown) return;
      shown = true;
      window.removeEventListener('scroll', onScroll);
      fetchEnabledSelfAds().then(ads => {
        if (ads.length > 0) {
          const topPriority = ads[0].priority;
          const topAds = ads.filter(a => a.priority === topPriority);
          const picked = topAds[Math.floor(Math.random() * topAds.length)];
          setAd(picked);
          setVisible(true);
        }
      });
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = window.scrollY / scrollable;
      if (progress >= 0.3) showPopup();
    };

    const timer = window.setTimeout(showPopup, 5000);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleClose = () => {
    setClosing(true);
    sessionStorage.setItem('selfAdDismissed', 'true');
    setTimeout(() => {
      setVisible(false);
      setAd(null);
    }, 300);
  };

  const handleClick = () => {
    if (ad?.linkUrl) {
      window.open(ad.linkUrl, '_blank', 'noopener');
    }
    handleClose();
  };

  if (!visible || !ad) return null;

  const popup = (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: closing ? 'selfAdFadeOut 0.3s ease' : 'selfAdFadeIn 0.4s ease',
      }}
    >
      <style>{`
        @keyframes selfAdFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes selfAdFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes selfAdSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
          borderRadius: '16px',
          border: '1px solid rgba(201,168,76,0.3)',
          maxWidth: '420px', width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(201,168,76,0.1)',
          animation: closing ? 'selfAdFadeOut 0.3s ease' : 'selfAdSlideUp 0.5s ease 0.1s both',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: '8px', right: '8px', zIndex: 10,
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(201,168,76,0.8)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>

        {/* Ad Image */}
        {ad.imageUrl && (
          <div style={{ position: 'relative', width: '100%', maxHeight: '240px', overflow: 'hidden' }}>
            <img
              src={ad.imageUrl}
              alt={ad.title}
              style={{
                width: '100%', height: '240px',
                objectFit: 'cover', display: 'block',
              }}
            />
            {/* Gradient overlay at bottom of image */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
              background: 'linear-gradient(transparent, #1a1a2e)',
            }} />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: ad.imageUrl ? '0.75rem 1.25rem 1.25rem' : '1.5rem 1.25rem' }}>
          {/* Sponsored tag */}
          <div style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: '10px',
            background: 'rgba(201,168,76,0.15)', color: '#c9a84c',
            fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.5px',
            textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            ✦ Promoted
          </div>

          {/* Title */}
          <h3 style={{
            margin: '0 0 0.4rem', color: '#fff',
            fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3,
          }}>
            {ad.title}
          </h3>

          {/* Description */}
          {ad.description && (
            <p style={{
              margin: '0 0 1rem', color: 'rgba(255,255,255,0.65)',
              fontSize: '0.85rem', lineHeight: 1.5,
            }}>
              {ad.description}
            </p>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {ad.linkUrl && (
              <button
                onClick={handleClick}
                style={{
                  flex: 1, padding: '0.65rem 1rem',
                  background: 'linear-gradient(135deg, #c9a84c, #b8943f)',
                  border: 'none', borderRadius: '10px',
                  color: '#1a1a2e', fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(201,168,76,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {ad.linkText || 'Visit Now'} →
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                padding: '0.65rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', color: 'rgba(255,255,255,0.5)',
                fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render via Portal to appear above everything
  return ReactDOM.createPortal(popup, document.body);
};

export default SelfAdPopup;
