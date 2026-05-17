import React, { useEffect, useRef, useState } from 'react';
import { getAdSenseSettings, AdSenseSettings } from '../services/analyticsService';

// ── AdUnit Component — reads Publisher ID + Slot IDs from Firestore ──────
interface AdUnitProps {
  slotType: 'banner' | 'infeed' | 'inarticle' | 'sidebar' | 'multiplex';
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
  className?: string;
}

// Cache settings so we don't fetch every render
let cachedSettings: AdSenseSettings | null = null;
let settingsPromise: Promise<AdSenseSettings> | null = null;

function loadSettings(): Promise<AdSenseSettings> {
  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (!settingsPromise) {
    settingsPromise = getAdSenseSettings().then(s => {
      cachedSettings = s;
      return s;
    });
  }
  return settingsPromise;
}

// Clear cache (call after saving new settings in admin)
export function clearAdSettingsCache() {
  cachedSettings = null;
  settingsPromise = null;
}

const AdUnit: React.FC<AdUnitProps> = ({ slotType, format = 'auto', style, className }) => {
  const adRef = useRef<HTMLModElement>(null);
  const [settings, setSettings] = useState<AdSenseSettings | null>(cachedSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then(s => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || !settings?.enabled || !settings?.publisherId) return;

    const slotMap: Record<string, string> = {
      banner: settings.bannerSlot,
      infeed: settings.inFeedSlot,
      inarticle: settings.inArticleSlot,
      sidebar: settings.sidebarSlot,
      multiplex: settings.multiplexSlot,
    };
    const slotId = slotMap[slotType];
    if (!slotId) return;

    // Don't push ads in development
    if (window.location.hostname === 'localhost') return;

    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.warn('AdSense push failed:', err);
    }
  }, [loaded, settings, slotType]);

  // Not loaded yet or ads disabled
  if (!loaded) return null;
  if (!settings?.enabled || !settings?.publisherId) return null;

  // Dev mode placeholder
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return (
      <div style={{
        padding: '1rem', textAlign: 'center',
        background: 'rgba(201,168,76,0.05)', border: '1px dashed rgba(201,168,76,0.2)',
        borderRadius: '8px', color: 'rgba(201,168,76,0.4)', fontSize: '0.75rem',
        ...style,
      }} className={className}>
        [Ad: {slotType}]
      </div>
    );
  }

  const slotMap: Record<string, string> = {
    banner: settings.bannerSlot,
    infeed: settings.inFeedSlot,
    inarticle: settings.inArticleSlot,
    sidebar: settings.sidebarSlot,
    multiplex: settings.multiplexSlot,
  };
  const slotId = slotMap[slotType];
  if (!slotId) return null;

  return (
    <div style={{ textAlign: 'center', overflow: 'hidden', ...style }} className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={settings.publisherId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

// ── Pre-configured Variants ──────────────────────────────────────────────
export const BannerAd: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <AdUnit slotType="banner" format="auto" style={{ margin: '1.5rem 0', ...style }} />
);

export const InFeedAd: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <AdUnit slotType="infeed" format="fluid" style={{ margin: '0.75rem 0', ...style }} />
);

export const InArticleAd: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <AdUnit slotType="inarticle" format="fluid" style={{ margin: '1rem 0', ...style }} />
);

export const SidebarAd: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <AdUnit slotType="sidebar" format="rectangle" style={style} />
);

export const MultiplexAd: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <AdUnit slotType="multiplex" format="auto" style={{ margin: '2rem 0', ...style }} />
);

export default AdUnit;
