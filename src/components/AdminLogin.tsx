import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface AdminLoginProps {
  logoUrl?: string;
  onLogin: () => void;
  onBack: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ logoUrl, onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      console.error('Admin login error:', err.code);
      if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait and try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0805 0%, #1a1510 50%, #0a0805 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '15%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
          animation: 'float1 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '15%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
          animation: 'float2 10s ease-in-out infinite',
        }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', maxWidth: 420, padding: '2rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Wilds Aura Photography"
              style={{
                height: 120,
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 20px rgba(201,168,76,0.4))',
                marginBottom: '1rem',
              }}
            />
          ) : (
            <h1 className="font-cinzel text-gold-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
              Wilds Aura
            </h1>
          )}
          <p className="font-cinzel" style={{ color: 'rgba(235,230,220,0.4)', fontSize: '0.75rem', letterSpacing: '0.2em' }}>
            Admin Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: '16px',
          padding: '2rem',
          backdropFilter: 'blur(20px)',
        }}>
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="font-cinzel" style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(235,230,220,0.5)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201,168,76,0.4)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                  required
                  autoComplete="email"
                  style={{
                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: '10px', color: 'var(--wa-light)', fontSize: '0.9rem',
                    outline: 'none', transition: 'border-color 0.3s', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="font-cinzel" style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(235,230,220,0.5)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201,168,76,0.4)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '0.75rem 2.75rem 0.75rem 2.75rem',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: '10px', color: 'var(--wa-light)', fontSize: '0.9rem',
                    outline: 'none', transition: 'border-color 0.3s', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(235,230,220,0.3)', padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px',
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
                color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-gold"
              style={{
                width: '100%', padding: '0.85rem', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                opacity: loading || !email || !password ? 0.5 : 1,
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <div style={{
                  width: 20, height: 20, border: '2px solid rgba(0,0,0,0.2)',
                  borderTopColor: '#000', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
              ) : (
                <>
                  <Lock size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Back link */}
          <button
            onClick={onBack}
            style={{
              display: 'block', width: '100%', textAlign: 'center',
              marginTop: '1.25rem', background: 'none', border: 'none',
              color: 'rgba(235,230,220,0.4)', cursor: 'pointer',
              fontSize: '0.8rem', transition: 'color 0.3s',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--wa-gold)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(235,230,220,0.4)'}
          >
            ← Back to Portfolio
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.05); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
