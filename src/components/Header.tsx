import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Aperture,
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  PawPrint,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react';
import { Visitor } from '../types';
import { ANIMAL_AVATARS } from '../constants/avatarConstants';
import { AvatarDisplay } from './AvatarDisplay';

interface HeaderProps {
  onScrollToGallery: () => void;
  logoUrl?: string;
  onLogoClick?: () => void;
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
  onProfileClick?: () => void;
  onCommunityClick?: () => void;
}

const MOBILE_BREAKPOINT = 1080;
const MOBILE_MENU_ID = 'wilds-aura-mobile-menu';

export const Header: React.FC<HeaderProps> = ({
  onScrollToGallery,
  logoUrl,
  onLogoClick,
  onSearchClick,
  visitor,
  onVisitorLoginClick,
  onVisitorLogout,
  onStoriesClick,
  onVisitorUpdate,
  notificationCount = 0,
  onNotificationClick,
  isAdmin,
  onAdminClick,
  onProfileClick,
  onCommunityClick,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false);
    setShowAvatarPicker(false);

    if (restoreFocus) {
      menuButtonRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Gallery', href: '/photos', onClick: onScrollToGallery },
    { label: 'Stories', href: '/story-grid', onClick: onStoriesClick },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Community', href: '/community', onClick: onCommunityClick, featured: true },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const handleDesktopViewport = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
        setShowAvatarPicker(false);
      }
    };

    mediaQuery.addEventListener('change', handleDesktopViewport);
    return () => mediaQuery.removeEventListener('change', handleDesktopViewport);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirstControl = window.requestAnimationFrame(() => {
      const firstControl = menuPanelRef.current?.querySelector<HTMLElement>(focusableSelector);
      firstControl?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== 'Tab' || !menuPanelRef.current) return;

      const panelControls = Array.from(
        menuPanelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);
      const focusable = menuButtonRef.current
        ? [...panelControls, menuButtonRef.current]
        : panelControls;

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFirstControl);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, menuOpen]);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onLogoClick) return;
    event.preventDefault();
    onLogoClick();
    closeMenu();
  };

  const currentPath = typeof window === 'undefined' ? '' : window.location.pathname;

  return (
    <header className={`wa-header ${scrolled || menuOpen ? 'wa-header--solid' : ''}`}>
      <div className="wa-header__inner wa-container">
        <a
          className="wa-header__brand"
          href="/"
          onClick={handleLogoClick}
          aria-label="Wilds Aura Photography — home"
        >
          <span className="wa-header__crest" aria-hidden="true">
            {logoUrl ? (
              <img src={logoUrl} alt="" decoding="async" />
            ) : (
              <Aperture size={22} strokeWidth={1.45} />
            )}
          </span>
          <span className="wa-header__wordmark">
            <strong>Wilds Aura</strong>
            <small>Nature · Stories · Light</small>
          </span>
        </a>

        <nav className="wa-header__desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              className={`wa-header__nav-link ${item.featured ? 'wa-header__nav-link--featured' : ''}`}
              href={item.href}
              aria-current={currentPath === item.href ? 'page' : undefined}
              onClick={(event) => {
                if (item.onClick) {
                  event.preventDefault();
                  item.onClick();
                }
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="wa-header__actions">
          {onSearchClick && (
            <button
              type="button"
              className="wa-header__icon-button"
              onClick={onSearchClick}
              aria-label="Search photographs and stories"
              title="Search"
            >
              <Search aria-hidden="true" size={19} />
            </button>
          )}

          <div className="wa-header__desktop-actions">
            {onNotificationClick && (
              <button
                type="button"
                className="wa-header__icon-button"
                onClick={onNotificationClick}
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
                title="Notifications"
              >
                <Bell aria-hidden="true" size={19} />
                {notificationCount > 0 && (
                  <span className="wa-header__notification-badge" aria-hidden="true">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            )}

            {isAdmin && onAdminClick && (
              <button
                type="button"
                className="wa-header__icon-button wa-header__icon-button--accent"
                onClick={onAdminClick}
                aria-label="Open admin dashboard"
                title="Admin dashboard"
              >
                <Settings aria-hidden="true" size={18} />
              </button>
            )}

            {visitor ? (
              <div className="wa-header__account">
                {onProfileClick ? (
                  <button
                    type="button"
                    className="wa-header__profile-chip"
                    onClick={onProfileClick}
                    aria-label={`Open ${visitor.displayName}'s profile`}
                  >
                    <AvatarDisplay
                      displayName={visitor.displayName}
                      avatarUrl={visitor.avatarUrl}
                      spiritAnimal={visitor.avatarAnimal}
                      avatarColor={visitor.avatarColor}
                      size={30}
                      showBorder={true}
                    />
                    <span>{visitor.displayName.split(' ')[0]}</span>
                  </button>
                ) : (
                  <div className="wa-header__profile-chip wa-header__profile-chip--static">
                    <AvatarDisplay
                      displayName={visitor.displayName}
                      avatarUrl={visitor.avatarUrl}
                      spiritAnimal={visitor.avatarAnimal}
                      avatarColor={visitor.avatarColor}
                      size={30}
                      showBorder={true}
                    />
                    <span>{visitor.displayName.split(' ')[0]}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="wa-header__icon-button wa-header__sign-out"
                  onClick={onVisitorLogout}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut aria-hidden="true" size={17} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="wa-header__sign-in"
                onClick={onVisitorLoginClick}
              >
                Sign in
              </button>
            )}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="wa-header__menu-button"
            onClick={() => {
              if (menuOpen) {
                closeMenu();
              } else {
                setMenuOpen(true);
              }
            }}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls={MOBILE_MENU_ID}
          >
            {menuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="wa-header__mobile-layer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMenu();
          }}
        >
          <section
            ref={menuPanelRef}
            className="wa-header__mobile-panel"
            id={MOBILE_MENU_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <div className="wa-header__mobile-intro">
              <span>Explore the wild</span>
              <p>Photography, field stories, and a community drawn to the natural world.</p>
            </div>

            <nav className="wa-header__mobile-nav" aria-label="Mobile navigation">
              {navItems.map((item, index) => (
                <a
                  key={item.label}
                  className={`wa-header__mobile-link ${item.featured ? 'wa-header__mobile-link--featured' : ''}`}
                  href={item.href}
                  aria-current={currentPath === item.href ? 'page' : undefined}
                  onClick={(event) => {
                    if (item.onClick) {
                      event.preventDefault();
                      item.onClick();
                    }
                    closeMenu();
                  }}
                >
                  <span className="wa-header__mobile-index">{String(index + 1).padStart(2, '0')}</span>
                  <span>{item.label}</span>
                  <ChevronRight aria-hidden="true" size={17} />
                </a>
              ))}
            </nav>

            <div className="wa-header__mobile-tools" aria-label="Quick actions">
              {onSearchClick && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onSearchClick();
                  }}
                >
                  <Search aria-hidden="true" size={18} />
                  <span>Search</span>
                </button>
              )}
              {onNotificationClick && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onNotificationClick();
                  }}
                  aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
                >
                  <span className="wa-header__tool-icon">
                    <Bell aria-hidden="true" size={18} />
                    {notificationCount > 0 && (
                      <span className="wa-header__tool-dot" aria-hidden="true" />
                    )}
                  </span>
                  <span>Alerts</span>
                </button>
              )}
              {isAdmin && onAdminClick && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onAdminClick();
                  }}
                >
                  <Settings aria-hidden="true" size={18} />
                  <span>Admin</span>
                </button>
              )}
            </div>

            <div className="wa-header__visitor-area">
              {visitor ? (
                <>
                  <div className="wa-header__visitor-card">
                    <AvatarDisplay
                      displayName={visitor.displayName}
                      avatarUrl={visitor.avatarUrl}
                      spiritAnimal={visitor.avatarAnimal}
                      avatarColor={visitor.avatarColor}
                      size={48}
                      showBorder={true}
                    />
                    <div className="wa-header__visitor-copy">
                      <small>Welcome back</small>
                      <strong>{visitor.displayName}</strong>
                      {visitor.email && <span>{visitor.email}</span>}
                    </div>
                  </div>

                  <div className="wa-header__visitor-actions">
                    {onProfileClick && (
                      <button
                        type="button"
                        onClick={() => {
                          closeMenu();
                          onProfileClick();
                        }}
                      >
                        <User aria-hidden="true" size={16} />
                        Profile
                      </button>
                    )}
                    <button
                      type="button"
                      className="wa-header__logout-button"
                      onClick={() => {
                        closeMenu();
                        onVisitorLogout();
                      }}
                    >
                      <LogOut aria-hidden="true" size={16} />
                      Sign out
                    </button>
                  </div>

                  {onVisitorUpdate && (
                    <div className="wa-header__avatar-section">
                      <button
                        type="button"
                        className="wa-header__avatar-toggle"
                        onClick={() => setShowAvatarPicker((visible) => !visible)}
                        aria-expanded={showAvatarPicker}
                        aria-controls="wilds-aura-avatar-picker"
                      >
                        <PawPrint aria-hidden="true" size={16} />
                        <span>{showAvatarPicker ? 'Close spirit animal picker' : 'Change spirit animal'}</span>
                        <ChevronRight aria-hidden="true" size={16} />
                      </button>

                      {showAvatarPicker && (
                        <div
                          className="wa-header__avatar-picker"
                          id="wilds-aura-avatar-picker"
                          role="group"
                          aria-label="Choose your spirit animal"
                        >
                          {ANIMAL_AVATARS.map((animal) => {
                            const selected = visitor.avatarAnimal === animal.id;
                            return (
                              <button
                                key={animal.id}
                                type="button"
                                className={selected ? 'is-selected' : ''}
                                aria-pressed={selected}
                                aria-label={`Choose ${animal.label}`}
                                onClick={() => {
                                  onVisitorUpdate({ ...visitor, avatarAnimal: animal.id });
                                  setShowAvatarPicker(false);
                                }}
                              >
                                <span aria-hidden="true">{animal.emoji}</span>
                                <small>{animal.label}</small>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="wa-header__guest-card">
                  <div>
                    <small>Member access</small>
                    <strong>Save what inspires you.</strong>
                    <p>Join the Wilds Aura community and make the collection your own.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      onVisitorLoginClick();
                    }}
                  >
                    Sign in <ChevronRight aria-hidden="true" size={16} />
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <style>{`
        .wa-header {
          position: fixed;
          inset: 0 0 auto;
          z-index: 100;
          color: var(--wa-text);
          background: var(--wa-nav-bg-top);
          border-bottom: 1px solid transparent;
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          transition: background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
        }

        .wa-header--solid {
          background: var(--wa-nav-bg-scrolled);
          border-bottom-color: var(--wa-dropdown-border);
          box-shadow: 0 14px 42px rgba(0, 0, 0, 0.16);
        }

        .wa-header__inner {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(178px, 0.9fr) auto minmax(178px, 0.9fr);
          align-items: center;
          gap: clamp(1rem, 2.4vw, 2.75rem);
          height: 76px;
        }

        .wa-header__brand {
          min-width: 0;
          width: max-content;
          display: inline-flex;
          align-items: center;
          gap: 0.72rem;
          color: var(--wa-text);
          text-decoration: none;
        }

        .wa-header__crest {
          position: relative;
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          display: grid;
          place-items: center;
          overflow: hidden;
          color: var(--wa-gold);
          background: var(--wa-label-bg);
          border: 1px solid var(--wa-border-gold);
          border-radius: 50%;
          box-shadow: inset 0 0 0 4px var(--wa-nav-bg-top);
          transition: transform 220ms ease, border-color 220ms ease;
        }

        .wa-header__crest::after {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid var(--wa-border);
          border-radius: inherit;
          pointer-events: none;
        }

        .wa-header__crest img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          padding: 3px;
        }

        .wa-header__brand:hover .wa-header__crest {
          transform: rotate(-7deg) scale(1.04);
          border-color: var(--wa-gold);
        }

        .wa-header__wordmark {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .wa-header__wordmark strong {
          color: var(--wa-text);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .wa-header__wordmark small {
          margin-top: 0.37rem;
          color: var(--wa-text-muted);
          font-size: 0.51rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .wa-header__desktop-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(0.25rem, 0.65vw, 0.7rem);
        }

        .wa-header__nav-link {
          position: relative;
          padding: 0.55rem clamp(0.38rem, 0.65vw, 0.7rem);
          color: var(--wa-nav-icon);
          font-size: 0.68rem;
          font-weight: 650;
          letter-spacing: 0.105em;
          line-height: 1;
          text-decoration: none;
          text-transform: uppercase;
          white-space: nowrap;
          transition: color 180ms ease;
        }

        .wa-header__nav-link::after {
          content: '';
          position: absolute;
          left: 50%;
          right: 50%;
          bottom: 0.08rem;
          height: 1px;
          background: var(--wa-gold);
          transition: left 180ms ease, right 180ms ease;
        }

        .wa-header__nav-link:hover,
        .wa-header__nav-link[aria-current='page'] {
          color: var(--wa-nav-icon-hover);
        }

        .wa-header__nav-link:hover::after,
        .wa-header__nav-link[aria-current='page']::after {
          left: 0.42rem;
          right: 0.42rem;
        }

        .wa-header__nav-link--featured {
          margin-left: 0.18rem;
          padding: 0.66rem 0.84rem;
          color: var(--wa-gold);
          background: var(--wa-label-bg);
          border: 1px solid var(--wa-border-gold);
          border-radius: 999px;
        }

        .wa-header__nav-link--featured::after {
          display: none;
        }

        .wa-header__nav-link--featured:hover {
          color: var(--wa-text-sharp);
          border-color: var(--wa-gold);
        }

        .wa-header__actions,
        .wa-header__desktop-actions,
        .wa-header__account {
          display: flex;
          align-items: center;
        }

        .wa-header__actions {
          justify-self: end;
          justify-content: flex-end;
          gap: 0.28rem;
        }

        .wa-header__desktop-actions {
          gap: 0.28rem;
        }

        .wa-header__icon-button,
        .wa-header__menu-button {
          position: relative;
          width: 38px;
          height: 38px;
          display: inline-grid;
          place-items: center;
          padding: 0;
          color: var(--wa-nav-icon);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 50%;
          cursor: pointer;
          transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
        }

        .wa-header__icon-button:hover,
        .wa-header__menu-button:hover {
          color: var(--wa-nav-icon-hover);
          background: var(--wa-label-bg);
          border-color: var(--wa-border);
        }

        .wa-header__icon-button--accent {
          color: var(--wa-gold);
          border-color: var(--wa-border-gold);
        }

        .wa-header__notification-badge {
          position: absolute;
          top: 1px;
          right: -2px;
          min-width: 16px;
          height: 16px;
          display: grid;
          place-items: center;
          padding: 0 3px;
          color: #fff;
          background: #c7483f;
          border: 2px solid var(--wa-bg);
          border-radius: 999px;
          font-size: 0.52rem;
          font-weight: 800;
          line-height: 1;
        }

        .wa-header__account {
          gap: 0.18rem;
          margin-left: 0.26rem;
          padding-left: 0.52rem;
          border-left: 1px solid var(--wa-border);
        }

        .wa-header__profile-chip {
          height: 39px;
          max-width: 126px;
          display: flex;
          align-items: center;
          gap: 0.48rem;
          padding: 0.22rem 0.62rem 0.22rem 0.25rem;
          overflow: hidden;
          color: var(--wa-text);
          background: var(--wa-label-bg);
          border: 1px solid var(--wa-border);
          border-radius: 999px;
          cursor: pointer;
          transition: border-color 180ms ease, transform 180ms ease;
        }

        .wa-header__profile-chip > span:last-child {
          overflow: hidden;
          font-size: 0.69rem;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wa-header__profile-chip:hover {
          border-color: var(--wa-border-gold);
          transform: translateY(-1px);
        }

        .wa-header__profile-chip--static {
          cursor: default;
        }

        .wa-header__profile-chip--static:hover {
          border-color: var(--wa-border);
          transform: none;
        }

        .wa-header__sign-out {
          width: 34px;
          height: 34px;
        }

        .wa-header__sign-out:hover {
          color: #d9635a;
        }

        .wa-header__sign-in {
          height: 38px;
          margin-left: 0.32rem;
          padding: 0 0.95rem;
          color: var(--wa-text);
          background: transparent;
          border: 1px solid var(--wa-border-gold);
          border-radius: 999px;
          font-size: 0.69rem;
          font-weight: 750;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease;
        }

        .wa-header__sign-in:hover {
          color: var(--wa-gold);
          background: var(--wa-label-bg);
          border-color: var(--wa-gold);
        }

        .wa-header__menu-button {
          display: none;
          border-color: var(--wa-border);
        }

        .wa-header__mobile-layer {
          position: absolute;
          inset: 100% 0 auto;
          z-index: 1;
          display: flex;
          justify-content: flex-end;
          height: calc(100vh - 68px);
          height: calc(100dvh - 68px);
          background: rgba(3, 9, 6, 0.6);
          -webkit-backdrop-filter: blur(5px);
          backdrop-filter: blur(5px);
          animation: waHeaderFadeIn 180ms ease both;
        }

        .wa-header__mobile-panel {
          width: min(430px, 100%);
          height: 100%;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 1.55rem clamp(1rem, 5vw, 1.7rem) 2.5rem;
          color: var(--wa-text);
          background:
            radial-gradient(circle at 100% 0%, var(--wa-label-bg), transparent 36%),
            var(--wa-dropdown-bg);
          border-left: 1px solid var(--wa-dropdown-border);
          box-shadow: -26px 0 70px rgba(0, 0, 0, 0.24);
          animation: waHeaderPanelIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .wa-header__mobile-intro {
          padding: 0.25rem 0 1.05rem;
          border-bottom: 1px solid var(--wa-dropdown-border);
        }

        .wa-header__mobile-intro > span,
        .wa-header__guest-card small,
        .wa-header__visitor-copy small {
          display: block;
          color: var(--wa-gold);
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .wa-header__mobile-intro p {
          max-width: 330px;
          margin: 0.48rem 0 0;
          color: var(--wa-text-muted);
          font-size: 0.76rem;
          line-height: 1.55;
        }

        .wa-header__mobile-nav {
          padding: 0.48rem 0;
        }

        .wa-header__mobile-link {
          display: grid;
          grid-template-columns: 30px 1fr auto;
          align-items: center;
          gap: 0.48rem;
          min-height: 48px;
          padding: 0.32rem 0.48rem;
          color: var(--wa-text);
          border-bottom: 1px solid var(--wa-border);
          text-decoration: none;
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.075em;
          transition: color 180ms ease, padding-left 180ms ease, background-color 180ms ease;
        }

        .wa-header__mobile-link > svg {
          color: var(--wa-text-muted);
          transition: transform 180ms ease;
        }

        .wa-header__mobile-index {
          color: var(--wa-text-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.54rem;
          letter-spacing: 0.08em;
        }

        .wa-header__mobile-link:hover,
        .wa-header__mobile-link[aria-current='page'] {
          padding-left: 0.7rem;
          color: var(--wa-gold);
          background: var(--wa-label-bg);
        }

        .wa-header__mobile-link:hover > svg {
          transform: translateX(3px);
        }

        .wa-header__mobile-link--featured {
          margin-top: 0.48rem;
          color: var(--wa-gold);
          background: var(--wa-label-bg);
          border: 1px solid var(--wa-border-gold);
          border-radius: 12px;
        }

        .wa-header__mobile-tools {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
          gap: 0.42rem;
          margin-top: 0.95rem;
        }

        .wa-header__mobile-tools > button {
          min-width: 0;
          min-height: 61px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.5rem 0.25rem;
          color: var(--wa-nav-icon);
          background: var(--wa-label-bg);
          border: 1px solid var(--wa-border);
          border-radius: 12px;
          cursor: pointer;
          transition: color 180ms ease, border-color 180ms ease, transform 180ms ease;
        }

        .wa-header__mobile-tools > button:hover {
          color: var(--wa-gold);
          border-color: var(--wa-border-gold);
          transform: translateY(-2px);
        }

        .wa-header__mobile-tools > button > span:last-child {
          overflow: hidden;
          font-size: 0.58rem;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wa-header__tool-icon {
          position: relative;
          display: inline-flex;
        }

        .wa-header__tool-dot {
          position: absolute;
          top: -2px;
          right: -3px;
          width: 6px;
          height: 6px;
          background: #d9635a;
          border: 1px solid var(--wa-bg);
          border-radius: 50%;
        }

        .wa-header__visitor-area {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--wa-dropdown-border);
        }

        .wa-header__visitor-card {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.78rem;
          background: var(--wa-label-bg);
          border: 1px solid var(--wa-border);
          border-radius: 15px;
        }

        .wa-header__visitor-copy {
          min-width: 0;
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 0.2rem;
        }

        .wa-header__visitor-copy strong {
          overflow: hidden;
          color: var(--wa-text);
          font-size: 0.8rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wa-header__visitor-copy > span {
          overflow: hidden;
          color: var(--wa-text-muted);
          font-size: 0.65rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wa-header__visitor-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
          margin-top: 0.56rem;
        }

        .wa-header__visitor-actions > button,
        .wa-header__avatar-toggle {
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.42rem;
          color: var(--wa-text);
          background: transparent;
          border: 1px solid var(--wa-border);
          border-radius: 10px;
          font-size: 0.68rem;
          font-weight: 700;
          cursor: pointer;
          transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease;
        }

        .wa-header__visitor-actions > button:hover,
        .wa-header__avatar-toggle:hover {
          color: var(--wa-gold);
          background: var(--wa-label-bg);
          border-color: var(--wa-border-gold);
        }

        .wa-header__visitor-actions > .wa-header__logout-button:hover {
          color: #d9635a;
          border-color: rgba(217, 99, 90, 0.45);
        }

        .wa-header__avatar-section {
          margin-top: 0.56rem;
        }

        .wa-header__avatar-toggle {
          width: 100%;
          justify-content: flex-start;
          padding: 0 0.72rem;
        }

        .wa-header__avatar-toggle > span {
          flex: 1;
          text-align: left;
        }

        .wa-header__avatar-toggle[aria-expanded='true'] > svg:last-child {
          transform: rotate(90deg);
        }

        .wa-header__avatar-picker {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.4rem;
          margin-top: 0.48rem;
          padding: 0.56rem;
          background: var(--wa-bg-input);
          border: 1px solid var(--wa-border);
          border-radius: 12px;
          animation: waHeaderFadeIn 180ms ease both;
        }

        .wa-header__avatar-picker > button {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.18rem;
          padding: 0.42rem 0.18rem;
          color: var(--wa-text-muted);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 9px;
          cursor: pointer;
        }

        .wa-header__avatar-picker > button:hover,
        .wa-header__avatar-picker > button.is-selected {
          color: var(--wa-gold);
          background: var(--wa-label-bg);
          border-color: var(--wa-border-gold);
        }

        .wa-header__avatar-picker > button > span {
          font-size: 1.25rem;
          line-height: 1;
        }

        .wa-header__avatar-picker > button > small {
          color: inherit;
          font-size: 0.53rem;
        }

        .wa-header__guest-card {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 0.8rem;
          padding: 1rem;
          background: var(--wa-label-bg);
          border: 1px solid var(--wa-border-gold);
          border-radius: 15px;
        }

        .wa-header__guest-card strong {
          display: block;
          margin-top: 0.28rem;
          color: var(--wa-text);
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.76rem;
        }

        .wa-header__guest-card p {
          margin: 0.35rem 0 0;
          color: var(--wa-text-muted);
          font-size: 0.65rem;
          line-height: 1.45;
        }

        .wa-header__guest-card > button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          gap: 0.22rem;
          padding: 0 0.7rem;
          color: var(--wa-bg);
          background: var(--wa-gold);
          border: 0;
          border-radius: 999px;
          font-size: 0.62rem;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          transition: filter 180ms ease, transform 180ms ease;
        }

        .wa-header__guest-card > button:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .wa-header a:focus-visible,
        .wa-header button:focus-visible {
          outline: 2px solid var(--wa-gold);
          outline-offset: 3px;
        }

        @keyframes waHeaderFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes waHeaderPanelIn {
          from { opacity: 0; transform: translateX(22px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 1230px) {
          .wa-header__wordmark small {
            display: none;
          }

          .wa-header__inner {
            grid-template-columns: minmax(145px, 0.8fr) auto minmax(145px, 0.8fr);
            gap: 0.8rem;
          }

          .wa-header__profile-chip > span:last-child {
            display: none;
          }

          .wa-header__profile-chip {
            padding-right: 0.25rem;
          }
        }

        @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
          .wa-header__inner {
            display: flex;
            justify-content: space-between;
            height: 68px;
          }

          .wa-header__desktop-nav,
          .wa-header__desktop-actions {
            display: none;
          }

          .wa-header__menu-button {
            display: inline-grid;
          }

          .wa-header__actions {
            gap: 0.18rem;
          }
        }

        @media (max-width: 520px) {
          .wa-header__wordmark strong {
            font-size: 0.8rem;
            letter-spacing: 0.1em;
          }

          .wa-header__crest {
            width: 36px;
            height: 36px;
            flex-basis: 36px;
          }

          .wa-header__brand {
            gap: 0.55rem;
          }

          .wa-header__icon-button,
          .wa-header__menu-button {
            width: 36px;
            height: 36px;
          }

          .wa-header__mobile-layer {
            background: var(--wa-dropdown-bg);
          }

          .wa-header__mobile-panel {
            border-left: 0;
          }
        }

        @media (max-width: 370px) {
          .wa-header__wordmark small {
            display: none;
          }

          .wa-header__guest-card {
            grid-template-columns: 1fr;
          }

          .wa-header__guest-card > button {
            width: max-content;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-header *,
          .wa-header *::before,
          .wa-header *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </header>
  );
};
