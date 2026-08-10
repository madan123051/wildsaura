import React, { useState } from 'react';
import { ArrowRight, Camera, Heart, MapPin, Send } from 'lucide-react';
import { saveContactMessage } from '../services/contactService';

interface AboutSectionProps {
  onMapClick?: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onMapClick }) => {
  const [isStoryOpen, setIsStoryOpen] = useState(false);

  return (
    <section id="about" className="photographer-section" aria-labelledby="photographer-title">
      <div className="wa-container">
        <div className="photographer-section__grid">
          <div className="photographer-section__portrait">
            <img
              src="/madan-about.png"
              srcSet="/images/optimized/madan-about-png-280.webp 280w, /madan-about.png 1024w"
              sizes="(max-width: 760px) 100vw, 46vw"
              alt="Madan Shrestha, wildlife and nature photographer"
              width={1024}
              height={1024}
              loading="lazy"
              decoding="async"
            />
            <div className="photographer-section__portrait-note">
              <span>Madan Shrestha</span>
              <span>Nepal ↔ Japan</span>
            </div>
          </div>

          <div className="photographer-section__content">
            <p className="section-kicker"><span>03</span> Behind the lens</p>
            <h2 id="photographer-title">Patience is part of <em>the photograph.</em></h2>
            <p className="photographer-section__lead">
              I’m Madan, a wildlife photographer born in Nepal and based in Japan. I make honest images of animals and landscapes by slowing down, staying curious, and giving the wild the space it deserves.
            </p>

            <blockquote>
              “Photography is 10% skill and 90% patience and respect for nature.”
            </blockquote>

            <div className="photographer-section__facts" aria-label="Photographer details">
              <div><strong>02</strong><span>countries<br />called home</span></div>
              <div><strong>01</strong><span>shared planet<br />worth protecting</span></div>
            </div>

            <div className="photographer-section__actions">
              <button type="button" className="outline-button" onClick={() => setIsStoryOpen((open) => !open)} aria-expanded={isStoryOpen}>
                {isStoryOpen ? 'Close my story' : 'Read my story'} <ArrowRight size={16} aria-hidden="true" />
              </button>
              {onMapClick && (
                <button type="button" className="text-arrow-link" onClick={onMapClick}>
                  <MapPin size={16} aria-hidden="true" /> Explore the photo map
                </button>
              )}
            </div>
          </div>
        </div>

        {isStoryOpen && (
          <div className="photographer-story">
            <div>
              <Camera size={22} aria-hidden="true" />
              <h3>The work</h3>
              <p>
                Every image begins with observation. Sometimes that means hours on a forest trail; sometimes it means returning to the same coast until the weather and light finally meet.
              </p>
            </div>
            <div>
              <Heart size={22} aria-hidden="true" />
              <h3>The purpose</h3>
              <p>
                Wilds Aura uses visual storytelling to build a deeper connection with nature and support a future where animals and their habitats are treated with care.
              </p>
            </div>
          </div>
        )}

        <div className="contact-studio" id="contact">
          <div className="contact-studio__intro">
            <p className="section-kicker"><span>04</span> Contact</p>
            <h2>Let’s make something meaningful.</h2>
            <p>
              Available for editorial assignments, conservation stories, print licensing, and thoughtful collaborations in Nepal, Japan, and beyond.
            </p>
            <a href="mailto:hello@wildsaura.com" className="text-arrow-link">
              hello@wildsaura.com <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
};

const ContactForm: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    setError('');
    try {
      await saveContactMessage(form);
      setForm({ name: '', email: '', message: '' });
      setSent(true);
      window.setTimeout(() => setSent(false), 3500);
    } catch (submitError) {
      console.error('Failed to save message:', submitError);
      setError('The message could not be sent. Please try again or use the email link.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="contact-studio__form" onSubmit={handleSubmit}>
      <div className="contact-studio__row">
        <label>
          <span>Name</span>
          <input
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Your name"
            required
          />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@example.com"
            required
          />
        </label>
      </div>
      <label>
        <span>Tell me about your idea</span>
        <textarea
          rows={5}
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          placeholder="Project, timing, location…"
          required
        />
      </label>
      {error && <p className="contact-studio__error" role="alert">{error}</p>}
      <button type="submit" className="contact-studio__submit" disabled={sending}>
        <span>{sending ? 'Sending…' : sent ? 'Message sent' : 'Send enquiry'}</span>
        <Send size={16} aria-hidden="true" />
      </button>
    </form>
  );
};
