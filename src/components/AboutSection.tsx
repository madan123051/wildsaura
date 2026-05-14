import React, { useState } from 'react';
import { saveContactMessage } from '../services/contactService';
import { Camera, Mountain, Heart, Globe, MapPin } from 'lucide-react';

interface AboutSectionProps {
  onMapClick?: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onMapClick }) => {
  return (
    <section id="about" className="bg-wa-dark-alt" style={{ padding: '5rem 0 6rem' }}>
      <div className="wa-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p className="section-subtitle">Discover</p>
          <h2 className="section-title">Meet the Photographer</h2>
          <div className="section-line" style={{ margin: '1rem auto 0' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Main Bio Card */}
          <div
            style={{
              position: 'relative',
              borderRadius: '1rem',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--wa-dark-card), var(--wa-dark-alt))',
              border: '1px solid var(--wa-border)',
              padding: '2.5rem',
            }}
          >
            {/* Gold accent line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 3,
              height: '100%',
              background: 'linear-gradient(to bottom, #c9a84c, transparent)',
            }} />

            {/* Profile Photo */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                margin: '0 auto 1rem',
                overflow: 'hidden',
                border: '3px solid rgba(201,168,76,0.5)',
                boxShadow: '0 0 20px rgba(201,168,76,0.15)',
              }}>
                <img
                  src="/madan-about.png"
                  alt="Madan - Wildlife & Nature Photographer"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <p className="section-subtitle" style={{ marginBottom: 0 }}>Behind the Lens</p>
              <h3 className="font-playfair" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Madan</h3>
            </div>

            <p className="text-wa-mid" style={{ fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1.25rem' }}>
              Namaste! I'm Madan, a wildlife and nature photographer with a deep-rooted passion for capturing Earth's untamed beauty. Though my home country is <strong style={{ color: 'var(--wa-text)' }}>Nepal</strong>, I am currently based in <strong style={{ color: 'var(--wa-text)' }}>Japan</strong>—exploring and documenting the wild landscapes of both worlds.
            </p>

            <p className="text-wa-mid" style={{ fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1.25rem' }}>
              My journey began in the breathtaking biodiversity of Nepal—from the towering Himalayas to the dense jungles of Chitwan. Now, living in Japan, my lens has found new stories in the snowy mountains of Nagano, the rugged Pacific coastlines, and the quiet moments where nature meets urban life.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              <span style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'var(--wa-gold)',
              }}>🇳🇵 Nepal</span>
              <span style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'var(--wa-gold)',
              }}>🇯🇵 Japan</span>
              <span style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'var(--wa-gold)',
              }}>Wildlife & Nature</span>
            </div>
          </div>

          {/* Right Column: Mission + Behind the Lens + Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Mission Card */}
            <div
              style={{
                borderRadius: '1rem',
                padding: '2rem 2.5rem',
                background: 'linear-gradient(135deg, var(--wa-dark-card), var(--wa-dark-alt))',
                border: '1px solid var(--wa-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Heart size={18} color="#9fcb8f" />
                <h3 className="font-cinzel" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wa-gold)', margin: 0 }}>
                  My Mission
                </h3>
              </div>
              <p className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.8, marginBottom: '1rem' }}>
                Through Wilds Aura, I aim to do more than just take pictures. I want to:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--wa-text)' }}>Share the untold stories</strong> of wildlife and their habitats—from the Nepali terai to Japanese hot springs.
                </li>
                <li className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--wa-text)' }}>Inspire a deeper connection</strong> with nature, no matter where you are in the world.
                </li>
                <li className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--wa-text)' }}>Promote conservation awareness</strong> through honest, patient visual storytelling.
                </li>
              </ul>
              <p className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.8, marginTop: '1rem' }}>
                Every photograph you see here is the result of hours—sometimes days—of waiting, respecting the wild, and letting the moment unfold naturally. Whether it's a Japanese macaque bathing in a Nagano hot spring or a tiger's silent walk in Nepal, I strive to capture the soul of the wild.
              </p>
            </div>

            {/* Behind the Lens Card */}
            <div
              style={{
                borderRadius: '1rem',
                padding: '2rem 2.5rem',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.05), var(--wa-dark-card))',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Globe size={18} color="#9fcb8f" />
                <h3 className="font-cinzel" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wa-gold)', margin: 0 }}>
                  Behind the Lens
                </h3>
              </div>
              <p className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.8, marginBottom: '0.75rem' }}>
                I believe wildlife photography is <strong style={{ color: 'var(--wa-gold)' }}>10% skill and 90% patience and respect for nature</strong>. When I'm not on an expedition, I spend my time exploring local cafes in Tokyo and planning my next trip back to Nepal.
              </p>
              <p className="text-wa-mid" style={{ fontSize: '0.875rem', lineHeight: 1.8, marginBottom: '1rem' }}>
                Living between two countries has taught me to see nature from different perspectives, and I bring that lens to every frame I capture.
              </p>
              <p className="font-playfair" style={{ fontSize: '1rem', fontStyle: 'italic', color: 'var(--wa-text)', lineHeight: 1.6 }}>
                "Thank you for stopping by. I hope my work reminds you of the wild beauty we share this planet with—whether in the Himalayas or the Japanese Alps."
              </p>
              <p className="font-cinzel text-gold" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', marginTop: '0.75rem' }}>
                — Madan
              </p>
            </div>

            {/* Photo Map Button */}
            {onMapClick && (
              <div
                onClick={onMapClick}
                style={{
                  borderRadius: '1rem',
                  padding: '1.25rem 2.5rem',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.08), var(--wa-dark-card))',
                  border: '1px solid rgba(201,168,76,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.15), var(--wa-dark-card))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.08), var(--wa-dark-card))'; }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(201,168,76,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <MapPin size={22} color="#9fcb8f" />
                </div>
                <div>
                  <h4 className="font-cinzel" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--wa-gold)', letterSpacing: '0.08em', margin: '0 0 0.2rem' }}>
                    📍 PHOTO MAP
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.5)', margin: 0 }}>
                    Explore where each photo was taken around the world
                  </p>
                </div>
              </div>
            )}

            {/* Contact Form */}
            <div
              id="contact"
              style={{
                borderRadius: '1rem',
                padding: '2rem 2.5rem',
                background: 'linear-gradient(135deg, var(--wa-dark-card), var(--wa-dark-alt))',
                border: '1px solid var(--wa-border)',
              }}
            >
              <p className="section-subtitle">Reach Out</p>
              <h3 className="font-cinzel" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
                GET IN TOUCH
              </h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ContactForm: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    try {
      await saveContactMessage({
        name: form.name,
        email: form.email,
        message: form.message,
      });
      setSent(true);
      setForm({ name: '', email: '', message: '' });
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error('Failed to save message:', err);
      alert('Failed to send message. Please try again.');
    }
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label className="font-cinzel text-wa-muted" style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
          Name
        </label>
        <input
          className="wa-input"
          type="text"
          placeholder="Your name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="font-cinzel text-wa-muted" style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
          Email
        </label>
        <input
          className="wa-input"
          type="email"
          placeholder="your@email.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div>
        <label className="font-cinzel text-wa-muted" style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
          Message
        </label>
        <textarea
          className="wa-input"
          placeholder="Your message..."
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          style={{ resize: 'none' }}
        />
      </div>
      <button className="btn-gold" type="submit" disabled={sending} style={{ opacity: sending ? 0.5 : 1 }}>
        {sending ? 'Sending...' : sent ? '✓ Message Sent!' : 'Send Message ›'}
      </button>
    </form>
  );
};
