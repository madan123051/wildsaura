import React, { useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { Visitor } from '../types';

const ANIMAL_AVATARS = [
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'elephant', emoji: '🐘', label: 'Elephant' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'eagle', emoji: '🦅', label: 'Eagle' },
  { id: 'deer', emoji: '🦌', label: 'Deer' },
];

interface ProfileModalProps {
  isOpen: boolean;
  visitor: Visitor | null;
  onClose: () => void;
  onVisitorUpdate: (updatedVisitor: Visitor) => void;
  onLogout: () => void;
  downloadCount?: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  visitor,
  onClose,
  onVisitorUpdate,
  onLogout,
  downloadCount = 0,
}) => {
  const [nameInput, setNameInput] = useState('');

  if (!isOpen || !visitor) return null;

  const currentAnimal = ANIMAL_AVATARS.find((a) => a.id === visitor.avatarAnimal);
  const initial = visitor.displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(760px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 16,
          background: 'var(--wa-dropdown-bg)',
          border: '1px solid var(--wa-dropdown-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, color: 'var(--wa-gold)', fontSize: '1.2rem' }}>Your Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wa-text)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: currentAnimal ? 'rgba(79,159,98,0.22)' : visitor.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: currentAnimal ? '2rem' : '1.5rem', border: '2px solid rgba(168,216,162,0.55)' }}>
            {currentAnimal?.emoji || initial}
          </div>
          <div>
            <div style={{ color: 'var(--wa-text)', fontWeight: 700 }}>{visitor.displayName}</div>
            <div style={{ color: 'var(--wa-text-muted)', fontSize: '0.9rem' }}>{visitor.email}</div>
            <div style={{ color: 'var(--wa-gold)', fontSize: '0.8rem', marginTop: 4 }}>Login: {visitor.loginMethod}</div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.8rem' }}>
          <div style={{ background: 'var(--wa-label-bg)', border: '1px solid var(--wa-border)', borderRadius: 12, padding: '0.75rem' }}>
            <div style={{ color: 'var(--wa-text-muted)', fontSize: '0.78rem' }}>Downloads</div>
            <div style={{ color: 'var(--wa-gold)', fontSize: '1.2rem', fontWeight: 700 }}>{downloadCount}</div>
          </div>
          <div style={{ background: 'var(--wa-label-bg)', border: '1px solid var(--wa-border)', borderRadius: 12, padding: '0.75rem' }}>
            <div style={{ color: 'var(--wa-text-muted)', fontSize: '0.78rem' }}>Spirit Animal</div>
            <div style={{ color: 'var(--wa-gold)', fontSize: '1.1rem', fontWeight: 700 }}>{currentAnimal?.emoji || '—'} {currentAnimal?.label || 'Not selected'}</div>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--wa-text-muted)', fontSize: '0.78rem', marginBottom: 6 }}>Display name</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={visitor.displayName} style={{ flex: 1, background: 'var(--wa-bg-input)', border: '1px solid var(--wa-border)', borderRadius: 8, padding: '0.5rem 0.65rem', color: 'var(--wa-text)' }} />
            <button onClick={() => { if (nameInput.trim()) { onVisitorUpdate({ ...visitor, displayName: nameInput.trim() }); setNameInput(''); } }} style={{ border: 'none', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 700, background: 'linear-gradient(135deg, #3f7b4a 0%, #9fcb8f 55%, #72aa81 100%)', color: '#062013' }}>Save</button>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div style={{ color: 'var(--wa-text-muted)', fontSize: '0.78rem', marginBottom: 6 }}>Choose spirit animal</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
            {ANIMAL_AVATARS.map((animal) => {
              const selected = visitor.avatarAnimal === animal.id;
              return (
                <button
                  key={animal.id}
                  onClick={() => onVisitorUpdate({ ...visitor, avatarAnimal: animal.id })}
                  style={{
                    padding: '0.65rem 0.35rem',
                    borderRadius: 10,
                    border: selected ? '2px solid var(--wa-gold)' : '1px solid var(--wa-border)',
                    background: selected ? 'rgba(79,159,98,0.25)' : 'var(--wa-bg-input)',
                    color: 'var(--wa-text)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '1.3rem' }}>{animal.emoji}</div>
                  <div style={{ fontSize: '0.72rem' }}>{animal.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            marginTop: '1rem',
            width: '100%',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            color: 'rgba(239,68,68,0.85)',
            padding: '0.7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
};
