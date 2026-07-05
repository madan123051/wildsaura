import React from 'react';
import { ArrowLeft, Shield, BookOpen, Eye, Globe, AlertTriangle, Link, Scale, RefreshCw, Mail } from 'lucide-react';

interface TermsConditionsProps {
  onBack: () => void;
}

const sections = [
  {
    icon: BookOpen,
    title: '1. Introduction',
    content: 'Welcome to Wilds Aura (www.wildsaura.com). This website is owned and operated by Madan. By accessing or using this website, you agree to be bound by these Terms & Conditions. If you disagree with any part, please do not use our website.',
  },
  {
    icon: Shield,
    title: '2. Intellectual Property Rights',
    content: 'All content on this website—including but not limited to photographs, images, text, graphics, logos, and portfolio pieces—is the exclusive property of Wilds Aura and is protected by international copyright laws. All rights are reserved.',
  },
  {
    icon: Eye,
    title: '3. Use of Content',
    content: null,
    bullets: [
      'You may NOT download, copy, reproduce, distribute, modify, display, or use any photographs or content from this website for any personal, commercial, or public purpose without prior written consent from Wilds Aura.',
      'Unauthorized use of images may result in legal action and claims for damages under copyright law.',
      'Viewing and sharing website links is permitted, but always credit Wilds Aura when sharing.',
    ],
  },
  {
    icon: Globe,
    title: '4. Website Use',
    content: 'You agree to use this website only for lawful purposes. You must not:',
    bullets: [
      'Use the site in any way that violates applicable laws.',
      'Attempt to gain unauthorized access to any part of the website.',
      'Upload or transmit any malicious code or harmful material.',
    ],
  },
  {
    icon: Link,
    title: '5. Third-Party Links',
    content: 'Our website may contain links to external sites (e.g., social media). We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites.',
  },
  {
    icon: AlertTriangle,
    title: '6. Limitation of Liability',
    content: 'Wilds Aura shall not be held liable for any direct, indirect, incidental, or consequential damages arising from your use of, or inability to use, this website or its content.',
  },
  {
    icon: Scale,
    title: '7. Governing Law',
    content: 'These Terms shall be governed by and construed in accordance with the laws of Nepal, without regard to its conflict of law provisions.',
  },
  {
    icon: RefreshCw,
    title: '8. Changes to Terms',
    content: 'We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on this page.',
  },
  {
    icon: Mail,
    title: '9. Contact Us',
    content: 'For permission requests or any questions regarding these Terms, please contact us at:',
    contact: 'help@wildsaura.com',
  },
];

export const TermsConditions: React.FC<TermsConditionsProps> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--wa-dark)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="wa-container" style={{ maxWidth: 800 }}>
        {/* Back Button */}
        <button
          onClick={onBack}
          className="btn-gold-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2.5rem',
          }}
        >
          <ArrowLeft size={14} /> Back to Home
        </button>

        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))',
            border: '1px solid rgba(201,168,76,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <Scale size={28} color="#9fcb8f" />
          </div>
          <h1 className="font-cinzel text-gold-gradient" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Terms & Conditions
          </h1>
          <p className="text-wa-muted" style={{ fontSize: '0.8rem', fontFamily: "'Cinzel', serif", letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Last Updated: January 1, 2026
          </p>
          <div className="section-line" style={{ margin: '1rem auto 0' }} />
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                style={{
                  borderRadius: '1rem',
                  padding: '2rem 2.5rem',
                  background: 'linear-gradient(135deg, var(--wa-dark-card), var(--wa-dark-alt))',
                  border: '1px solid var(--wa-border)',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--wa-border)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Icon size={18} color="#9fcb8f" />
                  <h2 className="font-cinzel" style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--wa-gold)', margin: 0 }}>
                    {section.title}
                  </h2>
                </div>

                {section.content && (
                  <p className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.8, margin: 0 }}>
                    {section.content}
                  </p>
                )}

                {section.bullets && (
                  <ul style={{ margin: section.content ? '0.75rem 0 0' : 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {section.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}

                {section.contact && (
                  <a
                    href={`mailto:${section.contact}`}
                    className="text-gold"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.75rem',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    📧 {section.contact}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
