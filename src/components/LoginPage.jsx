import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import Instagram from './InstagramIcon';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await login(email.trim(), password);
        if (!result.success && result.error) {
          setErrorMsg(result.error);
        }
      } else {
        const result = await signUp(email.trim(), password, displayName.trim());
        if (!result.success && result.error) {
          setErrorMsg(result.error);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Background Decorative Glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '560px',
        height: '320px',
        background: 'radial-gradient(ellipse at center, rgba(225, 48, 108, 0.12) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'var(--brand-primary, linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 25px -5px rgba(225, 48, 108, 0.35)',
            border: '2px solid rgba(255, 255, 255, 0.8)'
          }}>
            <Instagram size={34} color="#ffffff" />
          </div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em'
          }}>
            InstaManager
          </h1>
          <p style={{
            fontSize: '0.92rem',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            Instagram Workflow Studios & Content Management
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 35px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
          padding: '32px 28px',
          overflow: 'hidden'
        }}>
          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              style={{
                padding: '9px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                background: mode === 'login' ? '#ffffff' : 'transparent',
                color: mode === 'login' ? '#0f172a' : '#64748b',
                boxShadow: mode === 'login' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
              style={{
                padding: '9px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                background: mode === 'signup' ? '#ffffff' : 'transparent',
                color: mode === 'signup' ? '#0f172a' : '#64748b',
                boxShadow: mode === 'signup' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#b91c1c',
              fontSize: '0.84rem',
              fontWeight: 500,
              marginBottom: '18px',
              lineHeight: 1.4
            }}>
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Display Name (Only in Sign Up Mode) */}
            {mode === 'signup' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px'
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    fontSize: '0.92rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155'
                }}>
                  Password
                </label>
                {mode === 'login' && (
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Min. 6 characters
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 38px',
                    fontSize: '0.92rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#e1306c', cursor: 'pointer' }}
                />
                Remember me on this browser
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="clean-btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '8px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(225, 48, 108, 0.28)'
              }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Secure session authentication & live database sync</span>
          </div>
        </div>

        {/* Feature Highlights beneath Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '24px',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <span>✦ Live Instagram Scraper</span>
          <span>•</span>
          <span>✦ Video Reference Studio</span>
          <span>•</span>
          <span>✦ Script & Storyboard Studio</span>
        </div>
      </div>
    </div>
  );
}
