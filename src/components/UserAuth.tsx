import React, { useState, useEffect } from 'react';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  loginWithFacebook,
  loginWithApple,
  getCurrentUser,
} from '../services/authService';
import { createUserProfile, getUserProfile, emailExists } from '../services/userProfileService';
import './UserAuth.css';

interface UserAuthProps {
  onAuthSuccess?: (user: any) => void;
  onClose?: () => void;
}

export const UserAuth: React.FC<UserAuthProps> = ({ onAuthSuccess, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [spiritAnimal, setSpiritAnimal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const spiritAnimals = [
    '🦁 Lion - Strength',
    '🦅 Eagle - Vision',
    '🐘 Elephant - Wisdom',
    '🐯 Tiger - Power',
    '🦌 Deer - Grace',
    '🦉 Owl - Knowledge',
    '🐺 Wolf - Loyalty',
    '🦊 Fox - Cunning',
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email || !password || !displayName) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const exists = await emailExists(email);
      if (exists) {
        setError('Email already registered');
        setLoading(false);
        return;
      }

      // Register user
      const user = await registerWithEmail(email, password, displayName);

      // Create user profile
      const loginMethod = 'email';
      await createUserProfile(user.uid, email, displayName, loginMethod);

      setSuccess('Registration successful! You can now log in.');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        setSpiritAnimal('');
      }, 2000);

      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const user = await loginWithEmail(email, password);
      setSuccess('Login successful!');
      
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }

      // Clear form
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setLoading(true);

    try {
      let user;
      if (provider === 'google') {
        user = await loginWithGoogle();
      } else if (provider === 'facebook') {
        user = await loginWithFacebook();
      } else {
        user = await loginWithApple();
      }

      // Check if user profile exists, if not create one
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        const displayName = user.displayName || 'User';
        await createUserProfile(
          user.uid,
          user.email || '',
          displayName,
          provider as any,
          user.photoURL || undefined
        );
      }

      setSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful!`);
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || `${provider} login failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{mode === 'login' ? '🔐 Login' : '📝 Register'}</h2>
          <p>{mode === 'login' ? 'Welcome back!' : 'Join our community'}</p>
        </div>

        {error && <div className="auth-alert error">{error}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {/* Email */}
          <div className="auth-form-group">
            <label>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          {/* Display Name (Register only) */}
          {mode === 'register' && (
            <div className="auth-form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>
          )}

          {/* Spirit Animal (Register only) */}
          {mode === 'register' && (
            <div className="auth-form-group">
              <label>Your Spirit Animal 🐾</label>
              <select
                value={spiritAnimal}
                onChange={(e) => setSpiritAnimal(e.target.value)}
                disabled={loading}
              >
                <option value="">Select an animal...</option>
                {spiritAnimals.map((animal) => (
                  <option key={animal} value={animal}>
                    {animal}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Password */}
          <div className="auth-form-group">
            <label>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          {/* Confirm Password (Register only) */}
          {mode === 'register' && (
            <div className="auth-form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        {/* Social Login Buttons */}
        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <div className="social-buttons">
          <button
            type="button"
            className="social-button google"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            title="Login with Google"
          >
            🔵 Google
          </button>
          <button
            type="button"
            className="social-button facebook"
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading}
            title="Login with Facebook"
          >
            👥 Facebook
          </button>
          <button
            type="button"
            className="social-button apple"
            onClick={() => handleSocialLogin('apple')}
            disabled={loading}
            title="Login with Apple"
          >
            🍎 Apple
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              <p>Don't have an account?</p>
              <button
                type="button"
                className="toggle-button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setSuccess('');
                }}
              >
                Register here
              </button>
            </>
          ) : (
            <>
              <p>Already have an account?</p>
              <button
                type="button"
                className="toggle-button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
              >
                Login here
              </button>
            </>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default UserAuth;
