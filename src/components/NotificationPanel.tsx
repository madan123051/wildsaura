import React, { useEffect, useRef } from 'react';
import { X, Check, CheckCheck, Trash2, Bell, BellOff } from 'lucide-react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'welcome' | 'system' | 'update' | 'info';
  icon?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const getTypeIcon = (type: AppNotification['type'], icon?: string) => {
  if (icon) return icon;
  switch (type) {
    case 'welcome': return '🙏';
    case 'system': return '⚙️';
    case 'update': return '✨';
    case 'info': return 'ℹ️';
    default: return '🔔';
  }
};

const timeAgo = (ts: number): string => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen, onClose, notifications, onMarkRead, onMarkAllRead, onDelete, onClearAll,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from bell click
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: '72px',
        right: '16px',
        width: 'min(380px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 100px)',
        background: 'rgba(18, 18, 22, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(201, 168, 76, 0.15)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(201,168,76,0.05)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'notifSlideIn 0.25s ease-out',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.2rem',
        borderBottom: '1px solid rgba(201, 168, 76, 0.1)',
        background: 'rgba(201, 168, 76, 0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bell size={18} style={{ color: 'var(--wa-gold)' }} />
          <span style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #c9a84c 0%, #e8d18c 50%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--wa-gold)',
              color: '#000',
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              borderRadius: '10px',
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Mark all read"
              style={{
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '8px',
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: 'var(--wa-gold)',
                fontSize: '0.65rem',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; }}
            >
              <CheckCheck size={12} /> Read All
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'none'; }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem',
      }}>
        {notifications.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1rem',
            gap: '0.8rem',
          }}>
            <BellOff size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontWeight: 500 }}>
              No notifications yet
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.72rem' }}>
              We'll notify you when something happens
            </span>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => { if (!notif.read) onMarkRead(notif.id); }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem',
                margin: '0.25rem 0',
                borderRadius: '12px',
                background: notif.read
                  ? 'rgba(255,255,255,0.02)'
                  : 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)',
                border: notif.read
                  ? '1px solid rgba(255,255,255,0.03)'
                  : '1px solid rgba(201,168,76,0.15)',
                cursor: notif.read ? 'default' : 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = notif.read
                  ? 'rgba(255,255,255,0.04)'
                  : 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.05) 100%)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = notif.read
                  ? 'rgba(255,255,255,0.02)'
                  : 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)';
              }}
            >
              {/* Unread dot */}
              {!notif.read && (
                <div style={{
                  position: 'absolute',
                  top: '0.85rem',
                  left: '0.4rem',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--wa-gold)',
                  boxShadow: '0 0 8px rgba(201,168,76,0.5)',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: notif.read ? 'rgba(255,255,255,0.05)' : 'rgba(201,168,76,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0,
                marginLeft: !notif.read ? '0.3rem' : 0,
              }}>
                {getTypeIcon(notif.type, notif.icon)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: notif.read ? 500 : 700,
                    color: notif.read ? 'rgba(255,255,255,0.6)' : 'var(--wa-gold)',
                    lineHeight: 1.3,
                  }}>
                    {notif.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                    {/* Read indicator */}
                    {notif.read ? (
                      <CheckCheck size={13} style={{ color: 'rgba(201,168,76,0.4)' }} />
                    ) : (
                      <Check size={13} style={{ color: 'var(--wa-gold)' }} />
                    )}
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                      title="Delete notification"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        borderRadius: '4px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p style={{
                  fontSize: '0.73rem',
                  color: notif.read ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)',
                  margin: '0.3rem 0 0',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                }}>
                  {notif.message}
                </p>
                <span style={{
                  fontSize: '0.62rem',
                  color: 'rgba(255,255,255,0.2)',
                  marginTop: '0.3rem',
                  display: 'block',
                }}>
                  {timeAgo(notif.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{
          padding: '0.7rem 1.2rem',
          borderTop: '1px solid rgba(201,168,76,0.08)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <button
            onClick={onClearAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.7rem',
              cursor: 'pointer',
              padding: '0.3rem 0.8rem',
              borderRadius: '6px',
              transition: 'all 0.2s',
              fontWeight: 500,
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none'; }}
          >
            Clear All Notifications
          </button>
        </div>
      )}

      {/* Animation */}
      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
