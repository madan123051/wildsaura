import React, { useState } from 'react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="bg-wa-dark-alt" style={{ padding: '4rem 0 5rem' }}>
      <div className="wa-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
          {/* Photographer Card */}
          <div
            style={{
              position: 'relative',
              borderRadius: '1rem',
              overflow: 'hidden',
              minHeight: '18rem',
              background: 'linear-gradient(135deg, var(--wa-dark-card), var(--wa-dark-alt))',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 3,
              height: '100%',
              background: 'linear-gradient(to bottom, #c9a84c, transparent)',
            }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '2rem 2.5rem' }}>
              <div>
                <p className="section-subtitle">Meet the</p>
                <h2 className="font-playfair" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Madan</h2>
                <p className="text-wa-mid" style={{ fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '20rem', lineHeight: 1.6 }}>
                  Wildlife &amp; Nature Photographer capturing rare wildlife moments from Nepal and around the world.
                </p>
                <button className="btn-gold-outline">View Full Bio</button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div
            id="contact"
            style={{
              borderRadius: '1rem',
              padding: '2rem 2.5rem',
              background: 'linear-gradient(135deg, var(--wa-dark-card), var(--wa-dark-alt))',
            }}
          >
            <p className="section-subtitle">Reach Out</p>
            <h2 className="font-cinzel" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              GET IN TOUCH
            </h2>
            <ContactForm />
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setForm({ name: '', email: '', message: '' });
      setTimeout(() => setSent(false), 3000);
    }, 1000);
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
