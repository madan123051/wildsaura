import React, { useState, useEffect } from 'react';
import { Menu, X, Shield, Search, LogOut } from 'lucide-react';
import { Visitor } from '../types';

interface HeaderProps {
  onScrollToGallery: () => void;
  logoUrl?: string;
  onAdminClick?: () => void;
  isAdmin?: boolean;
  onSearchClick?: () => void;
  visitor: Visitor | null;
  onVisitorLoginClick: () => void;
  onVisitorLogout: () => void;
  onStoriesClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onScrollToGallery, logoUrl, onAdminClick, isAdmin,
  onSearchClick, visitor, onVisitorLoginClick, onVisitorLogout, onStoriesClick,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
  ];

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        transition: 'all 0.5s',
        background: scrolled ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid rgba(235,230,220,0.05)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      <div className="wa-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        {/* Left: Logo + Brand Name */}
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}>
          {logoUrl && (
            <img
              src={logoUrl} alt="Wilds Aura"
              style={{ height: 52, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.3))' }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <span className="font-cinzel" style={{
              fontWeight: 700, letterSpacing: '0.2em', fontSize: '1.15rem',
              background: 'linear-gradient(135deg, #c9a84c 0%, #e8d18c 50%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              WILDS AURA
            </span>
            <span style={{
              fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.6)', fontWeight: 400,
            }}>
              Photography
            </span>
          </div>
        </a>

        {/* Right: Search icon + Hamburger menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Search Icon */}
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(235,230,220,0.6)', padding: '0.4rem',
                transition: 'color 0.3s',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--wa-gold)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(235,230,220,0.6)'}
            >
              <Search size={24} />
            </button>
          )}

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(235,230,220,0.6)', cursor: 'pointer', padding: '0.4rem',
              transition: 'color 0.3s',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'rgba(235,230,220,0.9)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(235,230,220,0.6)'}
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div style={{
          background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(201,168,76,0.1)',
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
                  borderBottom: '1px solid rgba(235,230,220,0.05)',
                  fontSize: '0.85rem', letterSpacing: '0.1em',
                }}
              >
                {item.label}
              </a>
            ))}

            {/* Visitor area */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
              {visitor ? (
                <div style={{ padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: visitor.avatarColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700, color: '#000',
                      border: '2px solid rgba(201,168,76,0.4)',
                      position: 'relative',
                    }}>
                      {visitor.displayName.charAt(0).toUpperCase()}
                      {visitor.loginMethod !== 'email' && (
                        <div style={{
                          position: 'absolute', bottom: -2, right: -2,
                          width: 14, height: 14, borderRadius: '50%',
                          background: visitor.loginMethod === 'google' ? '#fff' : visitor.loginMethod === 'facebook' ? '#1877F2' : '#000',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.5rem', border: '1px solid rgba(0,0,0,0.3)',
                        }}>
                          {visitor.loginMethod === 'google' ? 'G' : visitor.loginMethod === 'facebook' ? 'f' : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--wa-gold)', fontWeight: 600 }}>
                        {visitor.displayName}
                      </span>
                      {visitor.email && (
                        <span style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {visitor.email}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { onVisitorLogout(); setMenuOpen(false); }}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '8px', cursor: 'pointer',
                        color: 'rgba(239,68,68,0.7)', padding: '0.35rem 0.6rem',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.72rem',
                      }}
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
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

            {/* Admin */}
            {onAdminClick && (
              <button
                onClick={() => { onAdminClick(); setMenuOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: isAdmin
                    ? 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))'
                    : 'rgba(255,255,255,0.03)',
                  border: isAdmin ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', padding: '0.6rem 1rem', marginTop: '0.75rem',
                  cursor: 'pointer', width: '100%',
                  color: isAdmin ? 'var(--wa-gold)' : 'rgba(235,230,220,0.5)',
                  fontSize: '0.8rem', fontFamily: "'Cinzel', serif", letterSpacing: '0.1em',
                  transition: 'all 0.3s',
                }}
              >
                <Shield size={16} />
                {isAdmin ? 'Dashboard' : 'Admin Login'}
              </button>
            )}
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
