import React from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Database,
  Mail,
  MessageCircle,
  Shield,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface PolicyPageProps {
  onBack: () => void;
}

interface PolicySection {
  icon: LucideIcon;
  title: string;
  content?: string;
  bullets?: string[];
}

interface PolicyLayoutProps extends PolicyPageProps {
  title: string;
  subtitle: string;
  updated: string;
  heroIcon: LucideIcon;
  sections: PolicySection[];
}

const supportEmail = 'help@wildsaura.com';

const privacySections: PolicySection[] = [
  {
    icon: Database,
    title: 'What data Wildsaura collects',
    content:
      'Wildsaura collects only the information needed to operate the website, community features, contact forms, moderation, and future social media connector features.',
    bullets: [
      'Basic technical information such as browser, device, page activity, and similar analytics used to keep the website reliable.',
      'Advertising and cookie-related signals used by advertising partners such as Google AdSense when ads are enabled on the website.',
      'Information you choose to submit, including names, email addresses, profile details, messages, comments, community posts, and uploaded media.',
      'Account or profile information connected through supported sign-in or social features, when you choose to use them.',
    ],
  },
  {
    icon: Mail,
    title: 'Contact form data',
    content:
      'When you send a message through the website contact form, Wildsaura may collect your name, email address, message text, submission time, and related metadata needed to reply and keep an internal record.',
  },
  {
    icon: MessageCircle,
    title: 'Comments and community data',
    content:
      'When you comment on photos, stories, videos, or community posts, Wildsaura may collect your display name, comment text, profile/avatar information, post or media reference, timestamp, and moderation status.',
  },
  {
    icon: Users,
    title: 'Instagram and Facebook connector data',
    content:
      'If Wildsaura enables Instagram or Facebook connectors later and you choose to connect an account, Wildsaura may receive connector data allowed by your permissions.',
    bullets: [
      'This may include account or profile identifiers, username or handle, page or profile links, comments, messages, media metadata, and connection status.',
      'Connector data is used only to provide the connected website or community workflow you request, such as viewing, replying, routing, or managing messages and comments.',
      'Wildsaura does not request private social data unless it is required for a feature you choose to connect.',
    ],
  },
  {
    icon: Shield,
    title: 'How data is used',
    bullets: [
      'To respond to contact requests and support messages.',
      'To display and manage comments, community posts, and profile activity.',
      'To support advertising, measurement, and ad quality checks when Google AdSense or similar advertising services are active.',
      'To protect the website from spam, abuse, fraud, and unauthorized access.',
      'To improve website performance, reliability, and visitor experience.',
      'To operate future Instagram or Facebook connector features when a user chooses to connect them.',
    ],
  },
  {
    icon: Mail,
    title: 'Contact us',
    content:
      'For privacy questions, access requests, correction requests, or deletion requests, contact Wildsaura at help@wildsaura.com.',
  },
];

const deletionSections: PolicySection[] = [
  {
    icon: Trash2,
    title: 'Request deletion of your data',
    content:
      'Users can request deletion of personal data associated with Wildsaura website activity, contact messages, comments, community posts, or connected profile information.',
  },
  {
    icon: UserRound,
    title: 'Required information',
    content:
      'To help us find the correct records, include the following information in your deletion request:',
    bullets: [
      'Your name.',
      'Your email address.',
      'Your account, profile, Facebook, Instagram, or community profile link if relevant.',
      'A short description of the data you want deleted, such as contact form message, comment, community post, or connected account data.',
    ],
  },
  {
    icon: Mail,
    title: 'Where to send the request',
    content:
      'Email your deletion request to help@wildsaura.com with the subject line "Data Deletion Request".',
  },
  {
    icon: Clock,
    title: 'Processing time',
    content:
      'Wildsaura will review and process valid deletion requests within a reasonable time, unless retention is required for security, legal, fraud prevention, or abuse prevention reasons.',
  },
  {
    icon: CheckCircle,
    title: 'After deletion',
    content:
      'When a request is completed, Wildsaura may confirm by email. Some cached, backup, or log records may take additional time to expire from operational systems.',
  },
];

const contactStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '0.85rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  textDecoration: 'none',
};

const PolicyLayout: React.FC<PolicyLayoutProps> = ({
  onBack,
  title,
  subtitle,
  updated,
  heroIcon: HeroIcon,
  sections,
}) => (
  <div style={{ minHeight: '100vh', background: 'var(--wa-dark)', paddingTop: '2rem', paddingBottom: '4rem' }}>
    <div className="wa-container" style={{ maxWidth: 860 }}>
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

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))',
            border: '1px solid rgba(201,168,76,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <HeroIcon size={28} color="#9fcb8f" />
        </div>
        <p className="section-subtitle" style={{ marginBottom: '0.5rem' }}>
          {subtitle}
        </p>
        <h1
          className="font-cinzel text-gold-gradient"
          style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}
        >
          {title}
        </h1>
        <p
          className="text-wa-muted"
          style={{ fontSize: '0.8rem', fontFamily: "'Cinzel', serif", letterSpacing: '0.15em', textTransform: 'uppercase' }}
        >
          Last Updated: {updated}
        </p>
        <div className="section-line" style={{ margin: '1rem auto 0' }} />
      </div>

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
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = 'var(--wa-border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Icon size={18} color="#9fcb8f" />
                <h2
                  className="font-cinzel"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--wa-gold)',
                    margin: 0,
                  }}
                >
                  {section.title}
                </h2>
              </div>

              {section.content && (
                <p className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.8, margin: 0 }}>
                  {section.content}
                </p>
              )}

              {section.bullets && (
                <ul
                  style={{
                    margin: section.content ? '0.75rem 0 0' : 0,
                    paddingLeft: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  {section.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx} className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {section.title === 'Contact us' || section.title === 'Where to send the request' ? (
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-gold"
                  style={contactStyle}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.opacity = '1';
                  }}
                >
                  <Mail size={16} /> {supportEmail}
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

export const PrivacyPolicyPage: React.FC<PolicyPageProps> = ({ onBack }) => (
  <PolicyLayout
    onBack={onBack}
    title="Privacy Policy"
    subtitle="Wildsaura Data Practices"
    updated="July 5, 2026"
    heroIcon={Shield}
    sections={privacySections}
  />
);

export const DataDeletionPage: React.FC<PolicyPageProps> = ({ onBack }) => (
  <PolicyLayout
    onBack={onBack}
    title="Data Deletion"
    subtitle="User Data Requests"
    updated="July 5, 2026"
    heroIcon={Trash2}
    sections={deletionSections}
  />
);
