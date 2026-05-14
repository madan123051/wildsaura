import React, { useState, useCallback } from 'react';
import { X, Mail, Eye, EyeOff, ArrowLeft, Camera } from 'lucide-react';
import { Visitor } from '../types';
import { auth, googleProvider, facebookProvider, appleProvider } from '../firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface VisitorLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (visitor: Visitor) => void;
}

const AVATAR_COLORS = [
  '#3f7b4a', '#9fcb8f', '#8dc3d8', '#4a8f5a',
  '#6aaa7a', '#7bc8a0', '#5da8c5', '#3d6e8f',
  '#a8c9a0', '#4d7a6a',
];

type AuthMode = 'main' | 'email-login' | 'email-signup';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

export const VisitorLogin: React.FC<VisitorLoginProps> = ({ isOpen, onClose, onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const reset = () => {
    setMode('main');
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setLoading(false);
    setSocialLoading(null);
    setShowPassword(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const getAvatarColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const firebaseUserToVisitor = (user: any, method: string): Visitor => ({
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatarColor: getAvatarColor(),
    avatarUrl: user.photoURL || undefined,
    loginMethod: method as any,
  });

  // Social login handler
  const handleSocialLogin = useCallback(async (provider: 'google' | 'facebook' | 'apple') => {
    setSocialLoading(provider);
    setError('');
    try {
      const authProvider = provider === 'google' ? googleProvider
        : provider === 'facebook' ? facebookProvider
        : appleProvider;
      
      const result = await signInWithPopup(auth, authProvider);
      onLogin(firebaseUserToVisitor(result.user, provider));
      reset();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setSocialLoading(null);
        return;
      }
      if (code === 'auth/account-exists-with-different-credential') {
        setError('This email is already linked to another login method.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please contact admin.');
      } else if (code === 'auth/operation-not-allowed') {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login is not enabled yet.`);
      } else {
        setError(err?.message || `${provider} login failed.`);
      }
      setSocialLoading(null);
    }
  }, [onLogin]);

  // Email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin(firebaseUserToVisitor(result.user, 'email'));
      reset();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Try again or sign up.');
      } else if (code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err?.message || 'Login failed.');
      }
      setLoading(false);
    }
  };

  // Email signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !name.trim()) return;
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: name.trim() });
      onLogin(firebaseUserToVisitor({ ...result.user, displayName: name.trim() }, 'email'));
      reset();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('Account already exists. Log in instead?');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError(err?.message || 'Signup failed.');
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 55,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 420,
    background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '20px', padding: '2rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.05)',
    position: 'relative' as const, overflow: 'hidden' as const,
  };

  const socialBtnBase: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    borderRadius: '12px', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
    fontSize: '0.9rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
    marginBottom: '0.75rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '12px', color: '#fff',
    fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const dividerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '1rem',
    margin: '1.25rem 0', color: 'rgba(255,255,255,0.3)',
    fontSize: '0.75rem', letterSpacing: '0.1em',
  };

  const lineStyle: React.CSSProperties = { flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' };

  const goldGradientTop = (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #c9a84c, #e6c35a, #c9a84c)' }} />
  );

  const closeBtn = (
    <button onClick={handleClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
      <X size={20} />
    </button>
  );

  const errorBox = error ? (
    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#e74c3c', marginTop: '0.75rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(231,76,60,0.1)' }}>{error}</p>
  ) : null;

  if (mode === 'main') {
    return (
      <div style={modalStyle} onClick={handleClose}>
        <div onClick={e => e.stopPropagation()} style={cardStyle}>
          {goldGradientTop}
          {closeBtn}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem', background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))', border: '2px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={24} style={{ color: '#c9a84c' }} />
            </div>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.06em', margin: 0 }}>Welcome to Wilds Aura</h2>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.5rem', lineHeight: 1.5 }}>Sign in to like, comment, share & download photos</p>
          </div>
          <button onClick={() => handleSocialLogin('google')} disabled={!!socialLoading} style={{ ...socialBtnBase, background: '#fff', color: '#333', opacity: socialLoading === 'google' ? 0.7 : 1 }}>
            {socialLoading === 'google' ? <span style={{ fontSize: '0.8rem' }}>Connecting...</span> : <><GoogleIcon /><span>Continue with Google</span></>}
          </button>
          <button onClick={() => handleSocialLogin('facebook')} disabled={!!socialLoading} style={{ ...socialBtnBase, background: '#1877F2', color: '#fff', opacity: socialLoading === 'facebook' ? 0.7 : 1 }}>
            {socialLoading === 'facebook' ? <span style={{ fontSize: '0.8rem' }}>Connecting...</span> : <><FacebookIcon /><span>Continue with Facebook</span></>}
          </button>
          <button onClick={() => handleSocialLogin('apple')} disabled={!!socialLoading} style={{ ...socialBtnBase, background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', opacity: socialLoading === 'apple' ? 0.7 : 1 }}>
            {socialLoading === 'apple' ? <span style={{ fontSize: '0.8rem' }}>Connecting...</span> : <><AppleIcon /><span>Continue with Apple</span></>}
          </button>
          <div style={dividerStyle}><div style={lineStyle} /><span>OR</span><div style={lineStyle} /></div>
          <button onClick={() => setMode('email-login')} style={{ ...socialBtnBase, background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', marginBottom: '0.5rem' }}>
            <Mail size={18} /><span>Log in with Email</span>
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.75rem' }}>
            Don't have an account? <span onClick={() => setMode('email-signup')} style={{ color: '#9fcb8f', cursor: 'pointer', textDecoration: 'underline' }}>Sign up</span>
          </p>
          {errorBox}
        </div>
      </div>
    );
  }

  if (mode === 'email-login') {
    return (
      <div style={modalStyle} onClick={handleClose}>
        <div onClick={e => e.stopPropagation()} style={cardStyle}>
          {goldGradientTop}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button onClick={() => { setMode('main'); setError(''); }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}><ArrowLeft size={18} /></button>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.05rem', color: '#fff', letterSpacing: '0.06em', margin: 0 }}>Log In</h2>
          </div>
          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required style={{ ...inputStyle, paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '2px' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {errorBox}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.8rem', background: loading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #c9a84c, #daa520)', color: '#000', fontWeight: 700, border: 'none', borderRadius: '12px', fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '1rem' }}>
              Don't have an account? <span onClick={() => { setMode('email-signup'); setError(''); }} style={{ color: '#9fcb8f', cursor: 'pointer', textDecoration: 'underline' }}>Sign up</span>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Email Signup
  return (
    <div style={modalStyle} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} style={cardStyle}>
        {goldGradientTop}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button onClick={() => { setMode('main'); setError(''); }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}><ArrowLeft size={18} /></button>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.05rem', color: '#fff', letterSpacing: '0.06em', margin: 0 }}>Create Account</h2>
        </div>
        <form onSubmit={handleEmailSignup}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>DISPLAY NAME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={30} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} style={{ ...inputStyle, paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '2px' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {errorBox}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.8rem', background: loading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #c9a84c, #daa520)', color: '#000', fontWeight: 700, border: 'none', borderRadius: '12px', fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '1rem' }}>
            Already have an account? <span onClick={() => { setMode('email-login'); setError(''); }} style={{ color: '#9fcb8f', cursor: 'pointer', textDecoration: 'underline' }}>Log in</span>
          </p>
        </form>
      </div>
    </div>
  );
};
