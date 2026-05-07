import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ImageIcon, BookOpen, Globe } from 'lucide-react';
import { ChatMessage, Photo } from '../types';
import { getChatResponse, ChatResponse } from '../utils/aiService';

interface AIChatbotProps {
  photos?: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

interface EnhancedMessage extends ChatMessage {
  wikiSummary?: string;
  animalName?: string;
  suggestedAnimals?: string[];
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ photos = [], onPhotoClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<EnhancedMessage[]>([
    {
      id: 1, sender: 'ai',
      text: "Namaste! 🐾 Main Wilds Aura AI assistant hoon. Aap mujhse English ya Hindi mein baat kar sakte hain! Ask me about any animal or search our gallery!\n\nHello! I'm your wildlife photography assistant. Ask me about any animal — I'll show info + gallery photos! 🦁",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [matchedPhotos, setMatchedPhotos] = useState<Photo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, matchedPhotos]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: EnhancedMessage = {
      id: Date.now(), sender: 'user', text, timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    setMatchedPhotos([]);

    try {
      const galleryInfo = photos.map(p => ({
        title: p.title,
        category: p.category,
        tags: p.tags,
        animalName: p.animalName,
        location: p.location,
      }));

      const response: ChatResponse = await getChatResponse(text, galleryInfo);

      const aiMsg: EnhancedMessage = {
        id: Date.now() + 1, sender: 'ai', text: response.text, timestamp: new Date().toISOString(),
        wikiSummary: response.wikiSummary,
        animalName: response.animalName,
        suggestedAnimals: response.suggestedAnimals,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Find matching photos from gallery
      if (response.matchingPhotoTitles && response.matchingPhotoTitles.length > 0) {
        const matched = photos.filter(p =>
          response.matchingPhotoTitles.some(t => p.title.toLowerCase() === t.toLowerCase())
        );
        setMatchedPhotos(matched);
      } else {
        // Also try to match by searching the user query against tags/names
        const q = text.toLowerCase();
        const tagMatches = photos.filter(p =>
          p.tags?.some(t => t.toLowerCase().includes(q)) ||
          p.animalName?.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)
        );
        if (tagMatches.length > 0) {
          setMatchedPhotos(tagMatches);
        }
      }
    } catch (err) {
      console.warn('AI chat error:', err instanceof Error ? err.message : 'unknown');
      const fallbackMsg: EnhancedMessage = {
        id: Date.now() + 1, sender: 'ai',
        text: "AI se connect nahi ho pa raha 😕 Kisi bhi animal ka naam type karke dekhein!\n\nHaving trouble connecting to AI. Try typing any animal name!",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }

    setIsThinking(false);
  };

  const handleSuggestionClick = (animal: string) => {
    setInput(animal);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 45,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--wa-gold), var(--wa-gold-light))',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(201,168,76,0.4)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            fontSize: '24px',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 32px rgba(201,168,76,0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(201,168,76,0.4)';
          }}
        >
          🐾
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 55,
            width: 400, maxWidth: 'calc(100vw - 48px)',
            height: 560, maxHeight: 'calc(100vh - 100px)',
            borderRadius: '16px', overflow: 'hidden',
            background: 'var(--wa-dark-card)',
            border: '1px solid rgba(201,168,76,0.5)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            animation: 'chatSlideUp 0.3s ease',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '0.85rem 1rem',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
            borderBottom: '1px solid rgba(201,168,76,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={18} style={{ color: 'var(--wa-gold)' }} />
              <div>
                <span className="font-cinzel" style={{ color: 'var(--wa-gold)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Wilds Aura AI
                </span>
                <p style={{ fontSize: '0.6rem', color: 'var(--wa-text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Globe size={9} /> English • Hindi • Gallery Search
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-text-muted)', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((msg) => (
              <div key={msg.id}>
                {/* Message bubble */}
                <div
                  style={{
                    maxWidth: '85%',
                    marginLeft: msg.sender === 'user' ? 'auto' : undefined,
                    padding: '0.65rem 0.85rem',
                    borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.15))'
                      : 'rgba(255,255,255,0.12)',
                    border: msg.sender === 'user'
                      ? '1px solid rgba(201,168,76,0.3)'
                      : '1px solid var(--wa-border)',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    color: 'var(--wa-text)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>

                {/* Wikipedia Summary Card */}
                {msg.wikiSummary && (
                  <div style={{
                    maxWidth: '85%',
                    marginTop: '0.4rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(30,60,30,0.3)',
                    border: '1px solid rgba(80,160,80,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem' }}>
                      <BookOpen size={11} style={{ color: '#6fae6f' }} />
                      <span style={{ fontSize: '0.65rem', color: '#6fae6f', fontWeight: 600, letterSpacing: '0.05em' }}>
                        Wikipedia • {msg.animalName}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.7)', lineHeight: 1.5 }}>
                      {msg.wikiSummary}
                    </p>
                  </div>
                )}

                {/* Suggested Animals */}
                {msg.suggestedAnimals && msg.suggestedAnimals.length > 0 && (
                  <div style={{
                    maxWidth: '85%',
                    marginTop: '0.4rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(201,168,76,0.05)',
                    border: '1px solid rgba(201,168,76,0.15)',
                  }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--wa-gold)', marginBottom: '0.35rem' }}>
                      🔍 Gallery mein available animals:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {msg.suggestedAnimals.map((animal, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(animal)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            background: 'rgba(201,168,76,0.15)',
                            border: '1px solid rgba(201,168,76,0.25)',
                            color: 'var(--wa-gold)',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(201,168,76,0.3)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(201,168,76,0.15)'}
                        >
                          {animal}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div style={{
                alignSelf: 'flex-start', padding: '0.65rem 0.85rem',
                borderRadius: '12px 12px 12px 2px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                fontSize: '0.82rem', color: 'var(--wa-gold)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <Sparkles size={14} style={{ animation: 'spin 2s linear infinite' }} />
                Soch raha hoon... 🤔
              </div>
            )}

            {/* Matched Gallery Photos */}
            {matchedPhotos.length > 0 && (
              <div style={{
                alignSelf: 'flex-start',
                width: '100%',
                padding: '0.5rem',
                borderRadius: '10px',
                background: 'rgba(201,168,76,0.05)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--wa-gold)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ImageIcon size={12} /> 📸 Gallery photos:
                </p>
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
                  {matchedPhotos.slice(0, 6).map(p => (
                    <div
                      key={p.id}
                      onClick={() => { if (onPhotoClick) onPhotoClick(p); }}
                      style={{
                        flexShrink: 0, width: 85, cursor: onPhotoClick ? 'pointer' : 'default',
                        borderRadius: '6px', overflow: 'hidden',
                        border: '1px solid rgba(201,168,76,0.2)',
                        transition: 'transform 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: 60, objectFit: 'cover' }} />
                      <p style={{ fontSize: '0.55rem', color: 'var(--wa-text)', padding: '0.2rem 0.3rem', lineHeight: 1.2 }}>
                        {p.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '0.75rem', borderTop: '1px solid rgba(201,168,76,0.1)',
            display: 'flex', gap: '0.5rem',
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type animal name / जानवर का नाम लिखें..."
              disabled={isThinking}
              style={{
                flex: 1, padding: '0.6rem 0.75rem',
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.35)',
                borderRadius: '8px', color: 'var(--wa-text)', fontSize: '0.82rem',
                outline: 'none', boxSizing: 'border-box',
                opacity: isThinking ? 0.5 : 1,
              }}
            />
            <button
              onClick={handleSend}
              disabled={isThinking}
              style={{
                width: 38, height: 38, borderRadius: '8px',
                background: isThinking ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, var(--wa-gold), var(--wa-gold-light))',
                border: 'none', cursor: isThinking ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={16} style={{ color: '#0f0d0a' }} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};
