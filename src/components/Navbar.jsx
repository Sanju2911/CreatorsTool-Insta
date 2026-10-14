import React, { useState, useRef, useEffect } from 'react';
import { Plus, LogOut, Settings, ChevronDown, Check, Sun, Moon } from 'lucide-react';
import Instagram from './InstagramIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({
  projects,
  currentProject,
  onSelectProject,
  onOpenNewProject,
  onOpenProfileSettings,
  isProfileSettingsActive
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarSrc = user?.avatar || '';

  return (
    <header className="top-navbar" style={{
      background: 'var(--bg-surface)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-xs)'
    }}>
      {/* LEFT: Brand + Project switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {/* Brand Logo */}
        <button
          onClick={() => onSelectProject(null)}
          title="Back to Accounts Workspace"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            borderRadius: '8px',
            transition: 'opacity 0.15s',
            flexShrink: 0
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Instagram size={18} color="#ffffff" />
          </div>
          <span className="navbar-brand-text" style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap'
          }}>
            InstaManager
          </span>
        </button>

        {/* Divider */}
        {projects && projects.length > 0 && (
          <div className="navbar-divider" style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', flexShrink: 0 }} />
        )}

        {/* Project Switcher Dropdown */}
        {projects && projects.length > 0 && (
          <div style={{ position: 'relative', minWidth: 0 }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="navbar-project-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '4px 9px 4px 5px',
                background: dropdownOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-main)',
                border: '1.5px solid',
                borderColor: dropdownOpen ? 'var(--border-hover)' : 'var(--border-subtle)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                maxWidth: '200px'
              }}
            >
              {/* Avatar */}
              {currentProject?.avatar_url ? (
                <img
                  src={currentProject.avatar_url}
                  alt={currentProject.name}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--brand-primary)', flexShrink: 0 }}
                  onError={e => e.target.style.display = 'none'}
                />
              ) : (
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--brand-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800, color: 'var(--brand-primary)',
                  flexShrink: 0
                }}>
                  {(currentProject?.insta_handle || projects[0]?.insta_handle || 'A').charAt(0).toUpperCase()}
                </div>
              )}

              <span style={{
                fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                @{currentProject?.insta_handle || (projects[0]?.insta_handle || 'Select')}
              </span>
              <ChevronDown
                size={13}
                color="var(--text-muted)"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.18s', flexShrink: 0 }}
              />
            </button>

            {/* Dropdown Panel */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                minWidth: '220px',
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--border-subtle)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                animation: 'fadeInUp 0.18s ease',
                zIndex: 200
              }}>
                <div style={{ padding: '6px' }}>
                  {projects.map(proj => (
                    <button
                      key={proj.id}
                      onClick={() => { onSelectProject(proj); setDropdownOpen(false); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '7px 9px',
                        background: currentProject?.id === proj.id ? (theme === 'dark' ? '#1e2433' : '#fdf2f8') : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s'
                      }}
                    >
                      {proj.avatar_url ? (
                        <img src={proj.avatar_url} alt={proj.name}
                          style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--brand-primary)', flexShrink: 0 }}
                          onError={e => e.target.style.display = 'none'}
                        />
                      ) : (
                        <div style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 800, color: 'var(--brand-primary)', flexShrink: 0
                        }}>
                          {(proj.insta_handle || 'A').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          @{proj.insta_handle}
                        </div>
                        {proj.name && proj.name !== proj.insta_handle && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {proj.name}
                          </div>
                        )}
                      </div>
                      {currentProject?.id === proj.id && (
                        <Check size={13} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px' }}>
                  <button
                    onClick={() => { onOpenNewProject(); setDropdownOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 9px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--brand-primary)',
                      transition: 'background 0.12s'
                    }}
                  >
                    <Plus size={14} />
                    Add New Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Add Account button (only if no projects yet on desktop) */}
        {(!projects || projects.length === 0) && (
          <button onClick={onOpenNewProject} className="clean-btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            <Plus size={14} />
            <span className="navbar-add-btn-text">Add Account</span>
          </button>
        )}

        {/* DARK / LIGHT MODE SWITCH (BESIDE PROFILE - STRICTLY NO ILLUMINATION/AI GLOW) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          id="theme-mode-toggle"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '5px 9px',
            background: theme === 'dark' ? '#1c2230' : '#f1f5f9',
            border: '1.5px solid',
            borderColor: theme === 'dark' ? '#2a3348' : '#e2e8f0',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'background 0.15s ease, border-color 0.15s ease',
            color: theme === 'dark' ? '#cbd5e1' : '#475569',
            boxShadow: 'none', // Strictly NO illumination glow or AI radiant aura
            height: '32px'
          }}
        >
          {theme === 'dark' ? (
            <>
              <Moon size={14} color="#cbd5e1" />
              <span className="navbar-theme-label" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#e2e8f0' }}>Dark</span>
            </>
          ) : (
            <>
              <Sun size={14} color="#f59e0b" />
              <span className="navbar-theme-label" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Light</span>
            </>
          )}
        </button>

        {/* User Profile Button */}
        {user && (
          <>
            <button
              onClick={onOpenProfileSettings}
              title="Profile & Account Settings"
              id="navbar-profile-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '3px 10px 3px 4px',
                background: isProfileSettingsActive ? (theme === 'dark' ? 'rgba(225,48,108,0.15)' : 'rgba(225,48,108,0.07)') : 'var(--bg-main)',
                border: '1.5px solid',
                borderColor: isProfileSettingsActive ? 'var(--brand-primary)' : 'var(--border-subtle)',
                borderRadius: '24px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                height: '32px'
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, color: '#ffffff'
                }}>
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="navbar-profile-name" style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: isProfileSettingsActive ? 'var(--brand-primary)' : 'var(--text-primary)',
                maxWidth: '110px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.name}
              </span>
              <Settings size={12} color={isProfileSettingsActive ? 'var(--brand-primary)' : 'var(--text-muted)'} className="navbar-profile-settings-icon" />
            </button>

            <button
              onClick={logout}
              className="clean-icon-btn navbar-logout-btn"
              title="Log Out"
              aria-label="Log Out"
              style={{
                color: '#ef4444',
                borderColor: theme === 'dark' ? '#3d2024' : '#fee2e2',
                background: theme === 'dark' ? '#201316' : '#fff5f5',
                width: '32px',
                height: '32px',
                padding: '0',
                borderRadius: '8px'
              }}
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
