import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ImageIcon, Globe, ChevronRight } from 'lucide-react';
import { ChatMessage, Photo } from '../types';
import { getChatResponse, ChatResponse } from '../utils/aiService';

interface AIChatbotProps {
  photos?: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

interface EnhancedMessage extends ChatMessage {
  animalName?: string;
  suggestedAnimals?: string[];
  matchedPhotos?: Photo[];
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ photos = [], onPhotoClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<EnhancedMessage[]>([
    {
      id: 1, sender: 'ai',
      text: "Namaste! 🐾 Main Wilds Aura AI assistant hoon. Animal ka naam bhejo, main gallery mein available photos turant dikhata hoon.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick suggestion chips
  const quickChips = ['🐯 Tiger', '🦍 Chimpanzee', '🦁 Lion', '🦅 Eagle'];

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isThinking) return;

    const userMsg: EnhancedMessage = {
      id: Date.now(), sender: 'user', text, timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const galleryInfo = photos.map(p => ({
        title: p.title,
        category: p.category,
        tags: p.tags,
        animalName: p.animalName,
        location: p.location,
      }));

      const response: ChatResponse = await getChatResponse(text, galleryInfo);

      // Find matching photos — strict title match only, max 4
      let matched: Photo[] = [];
      if (response.matchingPhotoTitles && response.matchingPhotoTitles.length > 0) {
        matched = photos.filter(p =>
          response.matchingPhotoTitles.some(t => 
            p.title.toLowerCase().trim() === t.toLowerCase().trim()
          )
        ).slice(0, 4);
      }

      // If AI didn't return matches, do a smart search (but limited to 4)
      if (matched.length === 0) {
        const q = text.toLowerCase().trim();
        // Only match if query is specific enough (3+ chars)
        if (q.length >= 3) {
          const scored = photos
            .map(p => {
              let score = 0;
              // Exact animal name match = highest
              if (p.animalName?.toLowerCase() === q) score += 10;
              // Animal name contains query
              else if (p.animalName?.toLowerCase().includes(q)) score += 5;
              // Title contains query
              if (p.title.toLowerCase().includes(q)) score += 3;
              // Tag match
              if (p.tags?.some(t => t.toLowerCase() === q)) score += 4;
              else if (p.tags?.some(t => t.toLowerCase().includes(q))) score += 2;
              return { photo: p, score };
            })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
          matched = scored.map(x => x.photo);
        }
      }

      const aiMsg: EnhancedMessage = {
        id: Date.now() + 1, sender: 'ai', text: response.text, timestamp: new Date().toISOString(),
        animalName: response.animalName,
        suggestedAnimals: response.suggestedAnimals,
        matchedPhotos: matched,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn('AI chat error:', err instanceof Error ? err.message : 'unknown');
      const fallbackMsg: EnhancedMessage = {
        id: Date.now() + 1, sender: 'ai',
        text: "AI se connect nahi ho pa raha 😕 Thodi der mein try karein!\n\nHaving trouble connecting. Please try again in a moment!",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }

    setIsThinking(false);
  };

  const handleSuggestionClick = (animal: string) => {
    handleSend(animal);
  };

  const handleChipClick = (chip: string) => {
    // Remove emoji prefix
    const text = chip.replace(/^[^\w\s]+\s*/, '').trim();
    handleSend(text);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 95,
            width: 70, height: 70, borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), rgba(201,168,76,0.92))',
            border: '2px solid rgba(255,255,255,0.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 36px rgba(0,0,0,0.65), 0 0 0 4px rgba(201,168,76,0.35)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            fontSize: '28px', color: '#062013',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 14px 40px rgba(0,0,0,0.75), 0 0 0 6px rgba(201,168,76,0.45)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 36px rgba(0,0,0,0.65), 0 0 0 4px rgba(201,168,76,0.35)';
          }}
          aria-label="Open AI Chatbot"
          title="Open AI Chatbot"
        >
          🦁
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 55,
            width: 400, maxWidth: 'calc(100vw - 48px)',
            height: 580, maxHeight: 'calc(100vh - 100px)',
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
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
            borderBottom: '1px solid rgba(201,168,76,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(201,168,76,0.3)',
                fontSize: '16px',
              }}>🦁</div>
              <div>
                <span className="font-cinzel" style={{ color: 'var(--wa-gold)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Wilds Aura AI
                </span>
                <p style={{ fontSize: '0.6rem', color: 'var(--wa-text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Globe size={9} /> Wildlife Expert • English • Hindi
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {messages.map((msg) => (
              <div key={msg.id}>
                {/* Message bubble */}
                <div
                  style={{
                    maxWidth: '88%',
                    marginLeft: msg.sender === 'user' ? 'auto' : undefined,
                    padding: '0.6rem 0.8rem',
                    borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.15))'
                      : 'rgba(255,255,255,0.08)',
                    border: msg.sender === 'user'
                      ? '1px solid rgba(201,168,76,0.3)'
                      : '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    color: 'var(--wa-text)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>

                {/* Matched Gallery Photos — nice card grid */}
                {msg.matchedPhotos && msg.matchedPhotos.length > 0 && (
                  <div style={{
                    maxWidth: '88%',
                    marginTop: '0.4rem',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.15)',
                  }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--wa-gold)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                      <ImageIcon size={11} /> Gallery mein photos ({msg.matchedPhotos.length})
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: msg.matchedPhotos.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                      gap: '0.35rem',
                    }}>
                      {msg.matchedPhotos.map(p => (
                        <div
                          key={p.id}
                          onClick={() => { if (onPhotoClick) onPhotoClick(p); }}
                          style={{
                            cursor: onPhotoClick ? 'pointer' : 'default',
                            borderRadius: '8px', overflow: 'hidden',
                            border: '1px solid rgba(201,168,76,0.2)',
                            transition: 'transform 0.2s, border-color 0.2s',
                            position: 'relative',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)';
                            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                          }}
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            style={{
                              width: '100%',
                              height: msg.matchedPhotos!.length === 1 ? 120 : 75,
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                          <div style={{
                            padding: '0.25rem 0.4rem',
                            background: 'rgba(0,0,0,0.6)',
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                          }}>
                            <p style={{
                              fontSize: '0.58rem', color: 'rgba(255,255,255,0.9)',
                              lineHeight: 1.2, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {p.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {onPhotoClick && (
                      <p style={{ fontSize: '0.55rem', color: 'var(--wa-text-muted)', marginTop: '0.3rem', textAlign: 'center' }}>
                        Tap to view full photo
                      </p>
                    )}
                  </div>
                )}

                {/* Suggested Animals */}
                {msg.suggestedAnimals && msg.suggestedAnimals.length > 0 && (
                  <div style={{
                    maxWidth: '88%',
                    marginTop: '0.4rem',
                    padding: '0.4rem 0.65rem',
                    borderRadius: '10px',
                    background: 'rgba(201,168,76,0.05)',
                    border: '1px solid rgba(201,168,76,0.15)',
                  }}>
                    <p style={{ fontSize: '0.62rem', color: 'var(--wa-gold)', marginBottom: '0.3rem', fontWeight: 600 }}>
                      🔍 Ye animals gallery mein hain:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {msg.suggestedAnimals.map((animal, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(animal)}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            background: 'rgba(201,168,76,0.12)',
                            border: '1px solid rgba(201,168,76,0.25)',
                            color: 'var(--wa-gold)',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '0.2rem',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(201,168,76,0.25)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(201,168,76,0.12)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          {animal} <ChevronRight size={10} />
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
                alignSelf: 'flex-start', padding: '0.6rem 0.8rem',
                borderRadius: '12px 12px 12px 2px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(201,168,76,0.2)',
                fontSize: '0.82rem', color: 'var(--wa-gold)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <Sparkles size={14} style={{ animation: 'spin 2s linear infinite' }} />
                Thinking... 🤔
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chips (only show at start) */}
          {messages.length <= 1 && !isThinking && (
            <div style={{
              padding: '0 0.75rem 0.5rem',
              display: 'flex', gap: '0.3rem', flexWrap: 'wrap',
            }}>
              {quickChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(chip)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '16px',
                    background: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    color: 'var(--wa-gold)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(201,168,76,0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '0.6rem 0.75rem', borderTop: '1px solid rgba(201,168,76,0.1)',
            display: 'flex', gap: '0.5rem',
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Ask about any animal... 🐾"
              disabled={isThinking}
              style={{
                flex: 1, padding: '0.55rem 0.75rem',
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '10px', color: 'var(--wa-text)', fontSize: '0.82rem',
                outline: 'none', boxSizing: 'border-box',
                opacity: isThinking ? 0.5 : 1,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'}
            />
            <button
              onClick={() => handleSend()}
              disabled={isThinking || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: '10px',
                background: (isThinking || !input.trim()) 
                  ? 'rgba(201,168,76,0.2)' 
                  : 'linear-gradient(135deg, var(--wa-gold), var(--wa-gold-light))',
                border: 'none', 
                cursor: (isThinking || !input.trim()) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              <Send size={16} style={{ color: (isThinking || !input.trim()) ? 'rgba(6,32,19,0.4)' : '#062013' }} />
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
