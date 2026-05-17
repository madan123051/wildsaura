import React, { useEffect, useRef } from 'react';

// ============================================================
// Google AdSense Ad Unit Component
// ============================================================
// Replace YOUR_PUBLISHER_ID with your actual ca-pub-XXXXXXX
// Replace ad slot numbers with your actual ad unit slot IDs
// ============================================================

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdUnitProps {
  slot: string;           // Ad slot ID from AdSense
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  layout?: string;        // For in-feed/in-article ads
  layoutKey?: string;     // For in-feed ads
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const AD_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'; // ← Replace with your AdSense Publisher ID

const AdUnit: React.FC<AdUnitProps> = ({
  slot,
  format = 'auto',
  layout,
  layoutKey,
  responsive = true,
  className = '',
  style = {}
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
        pushed.current = true;
      }
    } catch (e) {
      console.log('Ad load skipped:', e);
    }
  }, []);

  // Don't show ads in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return (
      <div className={`ad-placeholder ${className}`} style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px dashed rgba(255,255,255,0.2)',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '12px',
        margin: '16px 0',
        ...style
      }}>
        Ad Unit — {slot} ({format})
      </div>
    );
  }

  return (
    <div ref={adRef} className={`ad-container ${className}`} style={{ margin: '16px 0', textAlign: 'center', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(responsive ? { 'data-full-width-responsive': 'true' } : {})}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
      />
    </div>
  );
};

// ============================================================
// Pre-configured Ad Components for easy placement
// ============================================================

// Banner ad — below hero section, between sections
export const BannerAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdUnit
    slot="SLOT_BANNER"
    format="horizontal"
    className={`ad-banner ${className || ''}`}
    style={{ minHeight: '90px', maxHeight: '250px' }}
  />
);

// In-feed ad — inside gallery grid, community feed
export const InFeedAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdUnit
    slot="SLOT_INFEED"
    format="fluid"
    layout="in-feed"
    layoutKey="-6t+ed+2i-1n-4w"
    className={`ad-infeed ${className || ''}`}
  />
);

// In-article ad — inside stories, blog posts
export const InArticleAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdUnit
    slot="SLOT_INARTICLE"
    format="fluid"
    layout="in-article"
    className={`ad-inarticle ${className || ''}`}
  />
);

// Sidebar ad — for desktop sidebars
export const SidebarAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdUnit
    slot="SLOT_SIDEBAR"
    format="vertical"
    className={`ad-sidebar ${className || ''}`}
    style={{ minHeight: '250px' }}
  />
);

// Multiplex ad — related content style, good for end of page
export const MultiplexAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdUnit
    slot="SLOT_MULTIPLEX"
    format="autorelaxed"
    className={`ad-multiplex ${className || ''}`}
  />
);

export default AdUnit;
