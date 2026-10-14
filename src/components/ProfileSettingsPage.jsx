import React, { useState, useRef } from 'react';
import {
  ArrowLeft, Camera, Upload, Trash2, Check, Lock, Eye, EyeOff,
  User, Mail, Shield, Sparkles, AlertCircle, Link as LinkIcon,
  KeyRound, CheckCircle2, Sun, Moon
} from 'lucide-react';
import Instagram from './InstagramIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProfileSettingsPage({ onBack, projects = [], onSelectProject }) {
  const { user, updateProfile, updatePassword } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fileInputRef = useRef(null);

  // Handle local image upload via file reader
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setAvatar(dataUrl);
      setProfileError('');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!customAvatarUrl) return;
    setAvatar(customAvatarUrl.trim());
    setCustomAvatarUrl('');
    setShowUrlInput(false);
    setProfileError('');
  };

  const handleRemovePhoto = () => {
    setAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
    setProfileError('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Please provide a valid display name.');
      return;
    }

    setProfileSaving(true);
    const res = await updateProfile({
      name: name.trim(),
      avatar: avatar.trim()
    });
    setProfileSaving(false);

    if (res.success) {
      setProfileSuccess('Profile details and photo updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } else {
      setProfileError(res.error || 'Failed to update profile.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordSaving(true);
    const res = await updatePassword(newPassword);
    setPasswordSaving(false);

    if (res.success) {
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3500);
    } else {
      setPasswordError(res.error || 'Failed to update password.');
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* 1. Header with Back Button */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={onBack}
          className="clean-btn-secondary"
          style={{
            marginBottom: '16px',
            padding: '6px 14px',
            fontSize: '0.84rem',
            borderRadius: 'var(--radius-full)'
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Workspace</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'rgba(225, 48, 108, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e1306c'
          }}>
            <Shield size={18} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Account Settings
          </h1>
        </div>

        <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          Manage your personal profile details, change your profile photo, and update your login password.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 2. CARD 1: PROFILE DETAILS & PHOTO */}
        <div className="clean-card" style={{ padding: '24px 28px', background: '#ffffff' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '22px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7'
            }}>
              <User size={15} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Profile Information & Photo
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Your avatar and display name are visible across scripts, storyboards, and references.
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {profileSuccess && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Avatar Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Avatar Preview */}
              <div style={{ position: 'relative' }}>
                <img
                  src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={name || 'Profile'}
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #ffffff',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
                    background: '#e2e8f0'
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload new image"
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--brand-primary)',
                    border: '2px solid #ffffff',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  <Camera size={14} />
                </button>
              </div>

              {/* Avatar Actions */}
              <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b' }}>
                  Profile Photo
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  Upload a photo from your computer or provide an image link. JPG, PNG, or WebP up to 5MB.
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="clean-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    <Upload size={14} /> Upload Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="clean-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    <LinkIcon size={14} /> {showUrlInput ? 'Hide URL' : 'Image URL'}
                  </button>

                  {avatar && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="clean-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444' }}
                    >
                      <Trash2 size={14} /> Reset
                    </button>
                  )}
                </div>

                {/* Inline URL Input */}
                {showUrlInput && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="url"
                      placeholder="Paste https:// image address..."
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      className="clean-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.82rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="clean-btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Display Name & Email Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Display Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Demo Creator"
                    className="clean-input"
                    style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="clean-input"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      fontSize: '0.9rem',
                      background: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Account login email (managed via auth provider)
                </span>
              </div>
            </div>

            {/* Save Profile Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button
                type="submit"
                disabled={profileSaving}
                className="clean-btn-primary"
                style={{ padding: '9px 20px', fontSize: '0.88rem' }}
              >
                {profileSaving ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <Check size={16} /> Save Profile Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 3. CARD 2: CHANGE PASSWORD */}
        <div className="clean-card" style={{ padding: '24px 28px', background: '#ffffff' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '22px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e1306c'
            }}>
              <KeyRound size={15} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Change Password
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Ensure your account is protected with a secure password (minimum 6 characters).
              </span>
            </div>
          </div>

          {/* Password Feedback Alerts */}
          {passwordSuccess && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="clean-input"
                    style={{ width: '100%', padding: '10px 38px 10px 38px', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
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
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="clean-input"
                    style={{ width: '100%', padding: '10px 38px 10px 38px', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Match / length indicators */}
            {newPassword && (
              <div style={{
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                color: '#64748b'
              }}>
                <span style={{ color: newPassword.length >= 6 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                  {newPassword.length >= 6 ? '✓ 6+ characters' : '✗ Must be at least 6 characters'}
                </span>
                {confirmPassword && (
                  <span style={{ color: newPassword === confirmPassword ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </span>
                )}
              </div>
            )}

            {/* Update Password Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button
                type="submit"
                disabled={passwordSaving || (newPassword.length < 6) || (newPassword !== confirmPassword)}
                className="clean-btn-primary"
                style={{
                  padding: '9px 20px',
                  fontSize: '0.88rem',
                  opacity: (passwordSaving || (newPassword.length < 6) || (newPassword !== confirmPassword)) ? 0.6 : 1
                }}
              >
                {passwordSaving ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <KeyRound size={16} /> Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 3. CARD: THEME & WORKSPACE APPEARANCE (ACCOUNT CONNECTED) */}
        <div className="clean-card" style={{ padding: '24px 28px', background: 'var(--bg-surface)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '18px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)'
            }}>
              {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Theme & Workspace Appearance
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Directly connected to your account. Follows your preference wherever you sign in.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: theme === 'light' ? 'var(--brand-primary)' : 'var(--border-subtle)',
                background: theme === 'light' ? (theme === 'dark' ? 'rgba(225,48,108,0.12)' : '#fff1f6') : 'var(--bg-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0
              }}>
                <Sun size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Light Mode</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Daylight clarity & clean contrast</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: theme === 'dark' ? 'var(--brand-primary)' : 'var(--border-subtle)',
                background: theme === 'dark' ? 'rgba(225,48,108,0.12)' : 'var(--bg-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#161a24',
                border: '1px solid #283244',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                flexShrink: 0
              }}>
                <Moon size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Dark Mode (Matte)</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Matte charcoal, strictly zero AI glow</div>
              </div>
            </button>
          </div>
        </div>

        {/* 4. CARD 3: CONNECTED WORKSPACES */}
        {projects && projects.length > 0 && (
          <div className="clean-card" style={{ padding: '24px 28px', background: 'var(--bg-surface)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '18px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)'
              }}>
                <Instagram size={15} color="var(--brand-primary)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Managed Instagram Accounts ({projects.length})
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Accounts accessible with this session.
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (onSelectProject) onSelectProject(p);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-main)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <img
                    src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={p.name}
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{p.insta_handle}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {p.followers_count || '0'} followers • {p.posts_count || '0'} posts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
