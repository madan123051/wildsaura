import React, { useState, useEffect } from 'react';
import { Menu, X, Search, LogOut, Bell, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { Visitor } from '../types';
import { useTheme, Theme } from '../utils/useTheme';

const ANIMAL_AVATARS = [
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'elephant', emoji: '🐘', label: 'Elephant' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'eagle', emoji: '🦅', label: 'Eagle' },
  { id: 'deer', emoji: '🦌', label: 'Deer' },
];

interface HeaderProps {
  onScrollToGallery: () => void;
  logoUrl?: string;
  onSearchClick?: () => void;
  visitor: Visitor | null;
  onVisitorLoginClick: () => void;
  onVisitorLogout: () => void;
  onStoriesClick?: () => void;
  onVisitorUpdate?: (v: Visitor) => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

const THEME_CYCLE: Theme[] = ['system', 'light', 'dark'];

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') return <Sun size={17} />;
  if (theme === 'dark') return <Moon size={17} />;
  return <Monitor size={17} />;
}

function themeLabel(theme: Theme) {
  if (theme === 'light') return 'Light';
  if (theme === 'dark') return 'Dark';
  return 'System';
}

export const Header: React.FC<HeaderProps> = ({
  onScrollToGallery, logoUrl,
  onSearchClick, visitor, onVisitorLoginClick, onVisitorLogout, onStoriesClick, onVisitorUpdate,
  notificationCount = 0, onNotificationClick, isAdmin, onAdminClick,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'Home', href: '#top' },
    { label: 'Gallery', href: '#gallery', onClick: onScrollToGallery },
    { label: 'Stories', href: '#stories', onClick: onStoriesClick },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
    { label: 'Join Community', href: '#join-community' },
  ];

  const getAvatarEmoji = () => {
    if (!visitor?.avatarAnimal) return null;
    return ANIMAL_AVATARS.find(a => a.id === visitor.avatarAnimal)?.emoji;
  };

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        transition: 'all 0.5s',
        background: scrolled
          ? 'var(--wa-nav-bg-scrolled)'
          : 'var(--wa-nav-bg-top)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid var(--wa-dropdown-border)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.18)' : 'none',
      }}
    >
      <div className="wa-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        {/* Left: Logo */}
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          {logoUrl && (
            <img
              src={logoUrl} alt="Wilds Aura"
              style={{ height: 52, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(79,159,98,0.35))' }}
            />
          )}
        </a>

        {/* Right: Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

          {/* ── Theme Toggle ── */}
          <button
            onClick={cycleTheme}
            title={`Theme: ${themeLabel(theme)} — click to switch`}
            style={{
              background: 'none',
              border: '1px solid var(--wa-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--wa-nav-icon)',
              padding: '0.32rem 0.44rem',
              display: 'flex', alignItems: 'center', gap: '0.28rem',
              fontSize: '0.62rem',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.06em',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--wa-border-gold)';
              e.currentTarget.style.color = 'var(--wa-nav-icon-hover)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--wa-border)';
              e.currentTarget.style.color = 'var(--wa-nav-icon)';
            }}
          >
            <ThemeIcon theme={theme} />
          </button>

          {/* Admin Dashboard Icon */}
          {isAdmin && onAdminClick && (
            <button
              onClick={onAdminClick}
              title="Admin Dashboard"
              style={{
                background: 'linear-gradient(135deg, rgba(79,159,98,0.3), rgba(79,159,98,0.1))',
                border: '1px solid rgba(168,216,162,0.4)',
                cursor: 'pointer',
                color: 'var(--wa-gold)',
                padding: '0.35rem',
                borderRadius: '8px',
                transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(79,159,98,0.28)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(79,159,98,0.35)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(79,159,98,0.3), rgba(79,159,98,0.1))'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Settings size={20} />
            </button>
          )}

          {/* Notification Bell */}
          {onNotificationClick && (
            <button
              onClick={onNotificationClick}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--wa-nav-icon)', padding: '0.4rem',
                transition: 'color 0.3s', position: 'relative',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--wa-nav-icon-hover)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--wa-nav-icon)'}
            >
              <Bell size={22} />
              {notificationCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#ef4444', color: '#fff',
                  fontSize: '0.55rem', fontWeight: 700,
                  width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--wa-bg)',
                }}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {onSearchClick && (
            <button
              onClick={onSearchClick}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--wa-nav-icon)', padding: '0.4rem',
                transition: 'color 0.3s',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--wa-nav-icon-hover)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--wa-nav-icon)'}
            >
              <Search size={24} />
            </button>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--wa-nav-icon)', cursor: 'pointer', padding: '0.4rem',
              transition: 'color 0.3s',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--wa-text)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--wa-nav-icon)'}
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div style={{
          background: 'var(--wa-dropdown-bg)', backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--wa-dropdown-border)',
          padding: '1.5rem 2rem',
          animation: 'menuSlideDown 0.3s ease',
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Nav Links */}
            {navItems.map((item) => (
              <a
                key={item.label} href={item.href} className="nav-link"
                onClick={(e) => { if (item.onClick) { e.preventDefault(); item.onClick(); } setMenuOpen(false); }}
                style={{
                  display: 'block', padding: '0.85rem 0',
                  borderBottom: '1px solid var(--wa-dropdown-border)',
                  fontSize: '0.85rem', letterSpacing: '0.1em',
                }}
              >
                {item.label}
              </a>
            ))}

            {/* Visitor area */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--wa-dropdown-border)' }}>
              {visitor ? (
                <div style={{ padding: '0.5rem 0' }}>
                  {/* Profile row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {/* Avatar circle */}
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: getAvatarEmoji() ? 'rgba(79,159,98,0.22)' : visitor.avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: getAvatarEmoji() ? '1.5rem' : '1rem',
                        fontWeight: 700, color: getAvatarEmoji() ? undefined : '#000',
                        border: '2px solid rgba(168,216,162,0.55)',
                        flexShrink: 0,
                      }}
                    >
                      {getAvatarEmoji() || visitor.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingName ? (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <input
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && nameInput.trim() && onVisitorUpdate) {
                                onVisitorUpdate({ ...visitor, displayName: nameInput.trim() });
                                setEditingName(false);
                              }
                            }}
                            autoFocus
                            style={{
                              background: 'var(--wa-bg-input)', border: '1px solid var(--wa-border)',
                              borderRadius: 6, padding: '0.25rem 0.4rem', color: 'var(--wa-text)',
                              fontSize: '0.78rem', flex: 1, outline: 'none', minWidth: 0,
                            }}
                            placeholder="Enter name"
                            onClick={e => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (nameInput.trim() && onVisitorUpdate) {
                                onVisitorUpdate({ ...visitor, displayName: nameInput.trim() });
                              }
                              setEditingName(false);
                            }}
                            style={{ background: 'linear-gradient(135deg, #3f7b4a 0%, #9fcb8f 55%, #72aa81 100%)', border: 'none', borderRadius: 4, color: '#062013', fontSize: '0.65rem', padding: '0.2rem 0.4rem', cursor: 'pointer', fontWeight: 600 }}
                          >Save</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingName(false); }}
                            style={{ background: 'transparent', border: '1px solid var(--wa-border)', borderRadius: 4, color: 'var(--wa-text)', fontSize: '0.65rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                          >✕</button>
                        </div>
                      ) : (
                        <div>
                          <span
                            onClick={(e) => { e.stopPropagation(); setNameInput(visitor.displayName); setEditingName(true); }}
                            style={{ display: 'block', fontSize: '0.82rem', color: 'var(--wa-gold)', fontWeight: 600, cursor: 'pointer' }}
                            title="Tap to edit name"
                          >
                            {visitor.displayName} ✏️
                          </span>
                          {visitor.email && (
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--wa-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {visitor.email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { onVisitorLogout(); setMenuOpen(false); }}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '8px', cursor: 'pointer',
                        color: 'rgba(239,68,68,0.8)', padding: '0.35rem 0.6rem',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.72rem', flexShrink: 0,
                      }}
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>

                  {/* Change Avatar button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAvatarPicker(!showAvatarPicker); }}
                    style={{
                      marginTop: '0.6rem', width: '100%', padding: '0.5rem',
                      background: showAvatarPicker ? 'rgba(79,159,98,0.22)' : 'rgba(79,159,98,0.12)',
                      border: '1px solid rgba(168,216,162,0.3)', borderRadius: '10px',
                      color: 'var(--wa-gold)', cursor: 'pointer', fontSize: '0.78rem',
                      fontWeight: 500, transition: 'all 0.2s', textAlign: 'center',
                    }}
                  >
                    🐾 {showAvatarPicker ? 'Close Avatar Picker' : 'Change Spirit Animal'}
                  </button>

                  {/* Animal Avatar Picker */}
                  {showAvatarPicker && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: '0.5rem', padding: '0.8rem',
                        background: 'var(--wa-label-bg)', borderRadius: '12px',
                        border: '1px solid var(--wa-border)',
                      }}
                    >
                      <p style={{ fontSize: '0.78rem', color: 'var(--wa-text-muted)', marginBottom: '0.6rem', textAlign: 'center', fontWeight: 600 }}>
                        Choose Your Spirit Animal 🐾
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {ANIMAL_AVATARS.map(a => {
                          const isSelected = visitor?.avatarAnimal === a.id;
                          return (
                            <button
                              key={a.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (visitor && onVisitorUpdate) {
                                  const updated = { ...visitor, avatarAnimal: a.id };
                                  onVisitorUpdate(updated);
                                  setShowAvatarPicker(false);
                                }
                              }}
                              style={{
                                padding: '0.6rem 0.3rem', borderRadius: '12px',
                                background: isSelected ? 'rgba(79,159,98,0.28)' : 'var(--wa-bg-input)',
                                border: isSelected ? '2px solid var(--wa-gold)' : '2px solid var(--wa-border)',
                                cursor: 'pointer', fontSize: '1.6rem',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                                transition: 'all 0.2s',
                              }}
                            >
                              <span>{a.emoji}</span>
                              <span style={{ fontSize: '0.6rem', color: isSelected ? 'var(--wa-gold)' : 'var(--wa-text-muted)', fontWeight: isSelected ? 600 : 400 }}>
                                {a.label}
                              </span>
                            </button>
                          );
                        })}</div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { onVisitorLoginClick(); setMenuOpen(false); }}
                  style={{
                    display: 'block', padding: '0.75rem 0', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--wa-gold)', fontFamily: "'Cinzel', serif",
                    fontSize: '0.85rem', letterSpacing: '0.1em',
                  }}
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes menuSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
};
