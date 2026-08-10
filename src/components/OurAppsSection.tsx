import React from 'react';
import { ArrowUpRight, Facebook, HeartHandshake, Instagram, Music2 } from 'lucide-react';

const SOCIAL_CHANNELS = [
  {
    name: 'Facebook',
    eyebrow: 'Connect',
    description: 'Join the wider Wilds Aura community and follow new stories from the field.',
    href: 'https://www.facebook.com/share/1HkdZy1UjZ/?mibextid=wwXIfr',
    Icon: Facebook,
  },
  {
    name: 'Instagram',
    eyebrow: 'Explore',
    description: 'See the latest photographs, short field notes, and behind-the-frame moments.',
    href: 'https://www.instagram.com/wilds_aura?igsh=MTdtcHRjY296c2U4OA%3D%3D&utm_source=qr',
    Icon: Instagram,
  },
  {
    name: 'TikTok',
    eyebrow: 'Watch',
    description: 'Follow quick wildlife encounters, location diaries, and visual stories in motion.',
    href: 'https://www.tiktok.com/@wilds_aura?_r=1&_t=ZS-98lXpum9UVW',
    Icon: Music2,
  },
];

export const OurAppsSection: React.FC = () => (
  <section className="ecosystem-section" aria-labelledby="ecosystem-title">
    <div className="wa-container">
      <div className="ecosystem-section__mission">
        <div>
          <p className="section-kicker"><span>05</span> Conservation</p>
          <h2>Pictures can protect what words alone cannot.</h2>
        </div>
        <div>
          <p>
            Wilds Aura is growing a community around visual storytelling, respect for wildlife, and practical support for animals in Nepal.
          </p>
          <a href="/ngo" className="outline-button">
            <HeartHandshake size={17} aria-hidden="true" /> Support the mission
          </a>
        </div>
      </div>

      <div className="ecosystem-section__header">
        <p>Follow Wilds Aura</p>
        <span>Three channels. One community.</span>
      </div>

      <div className="ecosystem-section__grid">
        {SOCIAL_CHANNELS.map(({ name, eyebrow, description, href, Icon }, index) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="ecosystem-card">
            <span className="ecosystem-card__number">{String(index + 1).padStart(2, '0')}</span>
            <Icon size={24} aria-hidden="true" />
            <p>{eyebrow}</p>
            <h3>{name}</h3>
            <span className="ecosystem-card__description">{description}</span>
            <span className="ecosystem-card__arrow"><ArrowUpRight size={19} aria-hidden="true" /></span>
          </a>
        ))}
      </div>
    </div>
  </section>
);
