import React from 'react';
import { ArrowUpRight, Facebook, Instagram, Music2 } from 'lucide-react';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';

interface FooterProps {
  logoUrl?: string;
  onTermsClick?: () => void;
  onPrivacyPolicyClick?: () => void;
  onDataDeletionClick?: () => void;
}

const SOCIAL_LINKS = [
  { name: 'Facebook', href: 'https://www.facebook.com/share/1HkdZy1UjZ/?mibextid=wwXIfr', Icon: Facebook },
  { name: 'Instagram', href: 'https://www.instagram.com/wilds_aura?igsh=MTdtcHRjY296c2U4OA%3D%3D&utm_source=qr', Icon: Instagram },
  { name: 'TikTok', href: 'https://www.tiktok.com/@wilds_aura?_r=1&_t=ZS-98lXpum9UVW', Icon: Music2 },
];

export const Footer: React.FC<FooterProps> = ({
  logoUrl,
  onTermsClick,
  onPrivacyPolicyClick,
  onDataDeletionClick,
}) => {
  const legalLinks = [
    { label: 'Terms', href: '/terms', onClick: onTermsClick },
    { label: 'Privacy', href: '/privacy-policy', onClick: onPrivacyPolicyClick },
    { label: 'Data deletion', href: '/data-deletion', onClick: onDataDeletionClick },
  ];
  const optimizedLogoUrl = logoUrl
    ? getOptimizedImageUrl(logoUrl, { width: 160, quality: 88, fit: 'contain' })
    : '';
  const optimizedLogoSrcSet = logoUrl
    ? getOptimizedSrcSet(logoUrl, [96, 128, 160], { quality: 88, fit: 'contain' })
    : undefined;

  return (
    <footer className="editorial-footer">
      <div className="wa-container">
        <div className="editorial-footer__top">
          <div className="editorial-footer__brand">
            <a href="/" aria-label="Wilds Aura home">
              {logoUrl && (
                <img
                  src={optimizedLogoUrl || logoUrl}
                  srcSet={optimizedLogoSrcSet}
                  sizes="52px"
                  alt=""
                  width={52}
                  height={52}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <span><strong>Wilds Aura</strong><small>Photography · Stories · Conservation</small></span>
            </a>
            <p>A visual field journal from Nepal and Japan, made with patience and respect for the wild.</p>
          </div>

          <nav className="editorial-footer__nav" aria-label="Footer navigation">
            <div>
              <p>Explore</p>
              <a href="/photos">Photography</a>
              <a href="/story-grid">Stories</a>
              <a href="/community">Community</a>
              <a href="/about">About</a>
            </div>
            <div>
              <p>Follow</p>
              <a href={SOCIAL_LINKS[0].href} target="_blank" rel="noopener noreferrer">Facebook <ArrowUpRight size={12} /></a>
              <a href={SOCIAL_LINKS[1].href} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={12} /></a>
              <a href={SOCIAL_LINKS[2].href} target="_blank" rel="noopener noreferrer">TikTok <ArrowUpRight size={12} /></a>
              <a href="/ngo">Animal mission</a>
            </div>
            <div>
              <p>Legal</p>
              {legalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={link.onClick ? (event) => {
                    event.preventDefault();
                    link.onClick?.();
                  } : undefined}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        </div>

        <div className="editorial-footer__wordmark" aria-hidden="true">Wilds Aura</div>

        <div className="editorial-footer__bottom">
          <p>© {new Date().getFullYear()} Wilds Aura. All images and stories reserved.</p>
          <p>Made between Nepal and Japan.</p>
          <div className="editorial-footer__socials">
            {SOCIAL_LINKS.map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name}>
                <Icon size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
