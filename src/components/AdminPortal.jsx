import React, { useState, useEffect } from 'react';
import {
  Shield, Lock, UserCheck, Users, Activity, BarChart3, Clock,
  Eye, EyeOff, Check, X, Search, RefreshCw, LogOut, ChevronRight,
  TrendingUp, AlertTriangle, Monitor, Smartphone, Globe, Sparkles,
  FileText, Paintbrush, Film, MessageSquare, KeyRound, ArrowUpRight
} from 'lucide-react';
import { activityTracker } from '../services/activityTracker';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';

export default function AdminPortal() {
  const [adminSession, setAdminSession] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Tab: 'analytics' | 'presence' | 'permissions' | 'timeline'
  const [activeTab, setActiveTab] = useState('analytics');

  // Analytics filter state
  const [selectedProfileEmail, setSelectedProfileEmail] = useState('all');
  const [timeRange, setTimeRange] = useState('7d'); // 'today' | '7d' | '30d'

  // Data states (100% Real data - Zero Dummies)
  const [registeredProfiles, setRegisteredProfiles] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [timelineFilter, setTimelineFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);

  // Check existing admin session
  useEffect(() => {
    const session = activityTracker.getAdminSession();
    if (session) {
      setAdminSession(session);
    }
  }, []);

  const refreshAdminData = async () => {
    const [profiles, presences, projs, perms, logs] = await Promise.all([
      activityTracker.getRegisteredProfiles(),
      activityTracker.getOnlinePresence(),
      dataService.getProjects(),
      activityTracker.getUserPermissions(),
      activityTracker.getActivityTimeline()
    ]);
    setRegisteredProfiles(profiles);
    setOnlineUsers(presences);
    setAllProjects(projs);
    setPermissions(perms);
    setActivityTimeline(logs);
  };

  // Supabase Realtime Channels Subscription
  useEffect(() => {
    if (!adminSession) return;
    refreshAdminData();

    // 1. Supabase Realtime Presence & Broadcast Channel
    const presenceChannel = supabase.channel('admin_live_presence_hub', {
      config: { presence: { key: 'admin_command_center' } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, async () => {
        const presences = await activityTracker.getOnlinePresence();
        setOnlineUsers(presences);
      })
      .on('presence', { event: 'join' }, async () => {
        const presences = await activityTracker.getOnlinePresence();
        setOnlineUsers(presences);
      })
      .on('presence', { event: 'leave' }, async () => {
        const presences = await activityTracker.getOnlinePresence();
        setOnlineUsers(presences);
      })
      .on('broadcast', { event: 'presence_pulse' }, (payload) => {
        if (payload?.payload) {
          const pulse = payload.payload;
          setOnlineUsers(prev => {
            const emailLower = (pulse.user_email || pulse.id || '').toLowerCase();
            const list = [...prev];
            const idx = list.findIndex(u => (u.user_email || u.id || '').toLowerCase() === emailLower);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...pulse, status: pulse.status || 'online' };
            } else {
              list.unshift({ ...pulse, status: pulse.status || 'online' });
            }
            return list;
          });
        }
      })
      .on('broadcast', { event: 'permissions_update' }, async () => {
        const perms = await activityTracker.getUserPermissions();
        setPermissions(perms);
      })
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    // 2. Supabase Postgres Realtime Changes Channel
    const dbChangesChannel = supabase.channel('admin_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, async () => {
        const presences = await activityTracker.getOnlinePresence();
        setOnlineUsers(presences);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_permissions' }, async () => {
        const perms = await activityTracker.getUserPermissions();
        setPermissions(perms);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
        if (payload?.new) {
          setActivityTimeline(prev => [payload.new, ...prev.filter(l => l.id !== payload.new.id)].slice(0, 200));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const profiles = await activityTracker.getRegisteredProfiles();
        setRegisteredProfiles(profiles);
      })
      .subscribe();

    // Secondary fallback poll (every 10s)
    const interval = setInterval(refreshAdminData, 10000);

    return () => {
      clearInterval(interval);
      try { presenceChannel.unsubscribe(); } catch (e) {}
      try { dbChangesChannel.unsubscribe(); } catch (e) {}
    };
  }, [adminSession]);

  // Admin login handler (NO SIGN UP as requested)
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const res = await activityTracker.adminLogin(loginUsername, loginPassword);
    setIsLoggingIn(false);

    if (res.success) {
      setAdminSession(res.session);
    } else {
      setLoginError(res.error || 'Invalid credentials. Access restricted.');
    }
  };

  const handleAdminLogout = () => {
    activityTracker.adminLogout();
    setAdminSession(null);
  };

  // Toggle user project permission (Async Realtime write)
  const handleToggleProjectPermission = async (userEmail, projectHandle) => {
    const current = permissions[userEmail] || { access_level: 'all', allowed_projects: [] };
    let newAllowed = [...(current.allowed_projects || [])];
    const cleanHandle = projectHandle.toLowerCase().replace(/^@/, '');

    if (current.access_level === 'all') {
      newAllowed = allProjects.map(p => p.insta_handle.toLowerCase().replace(/^@/, '')).filter(h => h !== cleanHandle);
    } else {
      if (newAllowed.includes(cleanHandle)) {
        newAllowed = newAllowed.filter(h => h !== cleanHandle);
      } else {
        newAllowed.push(cleanHandle);
      }
    }

    const updated = {
      access_level: 'custom',
      allowed_projects: newAllowed
    };

    const newPerms = await activityTracker.saveUserPermissions(userEmail, updated);
    setPermissions({ ...newPerms });
    setSaveSuccessMsg(`Updated project access for ${userEmail}`);
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const handleSetFullAccess = async (userEmail) => {
    const updated = {
      access_level: 'all',
      allowed_projects: []
    };
    const newPerms = await activityTracker.saveUserPermissions(userEmail, updated);
    setPermissions({ ...newPerms });
    setSaveSuccessMsg(`Granted full access to all projects for ${userEmail}`);
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  // Engagement Metrics for the selected profile and time range
  const metricsData = activityTracker.getEngagementMetrics(selectedProfileEmail, timeRange);

  // Filtered Activity Timeline
  const filteredTimeline = activityTimeline.filter(log => {
    if (timelineFilter !== 'ALL' && log.action_type !== timelineFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (log.user_name || '').toLowerCase().includes(q) ||
        (log.target_title || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.target_project || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DEDICATED ADMIN LOGIN (NO SIGN UP)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!adminSession) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% -20%, #1e1b4b 0%, #090d16 65%, #030712 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '24px',
          padding: '38px 32px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 50px rgba(99, 102, 241, 0.15)',
          color: '#ffffff'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
              marginBottom: '16px'
            }}>
              <Shield size={28} color="#ffffff" />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              <Lock size={11} /> Restricted Admin Portal
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 6px 0' }}>
              Command Center
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              Direct URL access only. Authorized administrative staff.
            </p>
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              color: '#fca5a5',
              fontSize: '0.82rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form (NO SIGN UP) */}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Admin Username or Email
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Master Key / Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                marginTop: '6px',
                padding: '13px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
                transition: 'all 0.15s ease'
              }}
            >
              <KeyRound size={16} />
              <span>{isLoggingIn ? 'Verifying...' : 'Authorize Access'}</span>
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div style={{
            marginTop: '24px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.76rem',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            <span>Configure your administrator privately in your development database.</span>
            
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ADMIN DASHBOARD (LOGGED IN)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>
      {/* Top Admin App Bar */}
      <header style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Left: Brand & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
          }}>
            <Shield size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                InstaCreator OS Admin
              </span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                v2.4 MASTER
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#94a3b8' }}>
              <span>http://localhost:5173/admin</span>
              <span>•</span>
              <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Online Monitoring Active
              </span>
            </div>
          </div>
        </div>

        {/* Center: Main Tabs */}
        <nav style={{
          display: 'flex',
          gap: '4px',
          background: '#1e293b',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid #334155'
        }}>
          {[
            { id: 'analytics', label: 'Engagement Analytics (4 Graphs)', icon: <BarChart3 size={15} /> },
            { id: 'presence', label: 'Online Presence', icon: <Users size={15} /> },
            { id: 'permissions', label: 'Project Permissions', icon: <Lock size={15} /> },
            { id: 'timeline', label: 'Action Timeline', icon: <Activity size={15} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === tab.id ? '#4f46e5' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: Admin Session & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
              {adminSession.full_name}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600 }}>
              {adminSession.role}
            </div>
          </div>

          <button
            onClick={handleAdminLogout}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
            title="Log out of Admin Portal"
          >
            <LogOut size={14} /> Exit Admin
          </button>
        </div>
      </header>

      {/* Save Notification Banner */}
      {saveSuccessMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.3)',
          padding: '10px 24px',
          color: '#86efac',
          fontSize: '0.84rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} /> {saveSuccessMsg}
        </div>
      )}

      {/* Main Container */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '28px 24px' }}>
        {/* ─── TAB 1: 4 ENGAGEMENT ANALYTICS GRAPHS ─────────────────────────── */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Analytics Header & Controls */}
            <div style={{
              background: '#111827',
              borderRadius: '20px',
              border: '1px solid #1f2937',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
                  Profile Engagement Analytics
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                  Live tracking across Online Time, Active Usage, Left Open (Idle), and Creative Actions
                </p>
              </div>

              {/* Controls: Profile Selector & Time Range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Profile:</span>
                  <select
                    value={selectedProfileEmail}
                    onChange={(e) => setSelectedProfileEmail(e.target.value)}
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  >
                    <option value="all">All Real Team Profiles Combined</option>
                    {registeredProfiles.map(p => (
                      <option key={p.email} value={p.email}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Range Pills */}
                <div style={{
                  display: 'flex',
                  gap: '2px',
                  background: '#1e293b',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1px solid #334155'
                }}>
                  {[
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setTimeRange(r.id)}
                      style={{
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: timeRange === r.id ? '#4f46e5' : 'transparent',
                        color: timeRange === r.id ? '#ffffff' : '#94a3b8'
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Top KPI Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '18px'
            }}>
              {/* Card 1: Online Time */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                    1. Total Online Time
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#f8fafc' }}>
                  {metricsData.totals.onlineHours} hrs
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Total session duration connected to app
                </div>
              </div>

              {/* Card 2: Active Using Time */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' }}>
                    2. Active Using Time
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#f8fafc' }}>
                  {metricsData.totals.activeHours} hrs
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Actively typing, clicking & interacting ({Math.round((metricsData.totals.activeHours / (metricsData.totals.onlineHours || 1)) * 100)}% utilization)
                </div>
              </div>

              {/* Card 3: Idle / Left Open Time */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                    3. Left Open / Idle Time
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#f8fafc' }}>
                  {metricsData.totals.idleHours} hrs
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Tab left open in background without input
                </div>
              </div>

              {/* Card 4: Creative Action Time */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase' }}>
                    4. Creative & Action Time
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} />
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#f8fafc' }}>
                  {metricsData.totals.creativeHours} hrs
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Drafting scripts, painting boards ({metricsData.totals.actionsCount} actions)
                </div>
              </div>
            </div>

            {/* ─── THE 4 DEDICATED ANALYTICAL GRAPHS ──────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(540px, 1fr))',
              gap: '24px'
            }}>
              {/* GRAPH 1: ONLINE TIME (Bar + Trend Line Graph) */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 2px 0' }}>
                      Graph 1: Online Time Duration
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                      Daily breakdown of hours connected to workspace
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(56, 189, 248, 0.2)'
                  }}>
                    {metricsData.totals.onlineHours} hrs Total
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="0" y1="180" x2="500" y2="180" stroke="#1f2937" strokeWidth="1" />
                    <line x1="0" y1="120" x2="500" y2="120" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />

                    {(() => {
                      const count = metricsData.daily.length || 1;
                      const maxVal = Math.max(...metricsData.daily.map(d => d.onlineHours), 0.5);
                      const step = 440 / count;
                      const barWidth = Math.max(8, Math.min(36, step * 0.65));

                      return metricsData.daily.map((d, i) => {
                        const x = 30 + i * step + (step - barWidth) / 2;
                        const maxH = 140;
                        const h = d.onlineHours > 0 ? Math.max(4, (d.onlineHours / maxVal) * maxH) : 2;
                        const y = 180 - h;
                        const showLabel = count <= 10 || i % Math.ceil(count / 7) === 0 || i === count - 1;

                        return (
                          <g key={d.day + '-' + i}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={h}
                              rx="5"
                              fill="url(#onlineGrad)"
                            />
                            {showLabel && (
                              <text x={x + barWidth / 2} y="196" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                                {d.day}
                              </text>
                            )}
                            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="800">
                              {d.onlineHours}h
                            </text>
                          </g>
                        );
                      });
                    })()}
                    <defs>
                      <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* GRAPH 2: ACTIVE USAGE TIME (Interactive Engagement Chart) */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 2px 0' }}>
                      Graph 2: Active Usage Time
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                      Time spent typing, clicking, and interacting with features
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#22c55e',
                    background: 'rgba(34, 197, 94, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                  }}>
                    {metricsData.totals.activeHours} hrs Active
                  </span>
                </div>

                {/* SVG Area / Line Chart */}
                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="0" y1="180" x2="500" y2="180" stroke="#1f2937" strokeWidth="1" />
                    <line x1="0" y1="120" x2="500" y2="120" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />

                    {(() => {
                      const count = metricsData.daily.length || 1;
                      const maxVal = Math.max(...metricsData.daily.map(d => d.activeHours), 0.5);
                      const step = 440 / count;
                      const barWidth = Math.max(8, Math.min(36, step * 0.65));

                      return metricsData.daily.map((d, i) => {
                        const x = 30 + i * step + (step - barWidth) / 2;
                        const maxH = 140;
                        const h = d.activeHours > 0 ? Math.max(4, (d.activeHours / maxVal) * maxH) : 2;
                        const y = 180 - h;
                        const showLabel = count <= 10 || i % Math.ceil(count / 7) === 0 || i === count - 1;

                        return (
                          <g key={d.day + '-' + i}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={h}
                              rx="5"
                              fill="url(#activeGrad)"
                            />
                            {showLabel && (
                              <text x={x + barWidth / 2} y="196" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                                {d.day}
                              </text>
                            )}
                            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="800">
                              {d.activeHours}h
                            </text>
                          </g>
                        );
                      });
                    })()}
                    <defs>
                      <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#15803d" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* GRAPH 3: LEFT OPEN (IDLE) TIME */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 2px 0' }}>
                      Graph 3: Time Leaving It Open (Idle)
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                      Tab open in background without user activity
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    {metricsData.totals.idleHours} hrs Idle
                  </span>
                </div>

                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="0" y1="180" x2="500" y2="180" stroke="#1f2937" strokeWidth="1" />
                    <line x1="0" y1="120" x2="500" y2="120" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />

                    {(() => {
                      const count = metricsData.daily.length || 1;
                      const maxVal = Math.max(...metricsData.daily.map(d => d.idleHours), 0.5);
                      const step = 440 / count;
                      const barWidth = Math.max(8, Math.min(36, step * 0.65));

                      return metricsData.daily.map((d, i) => {
                        const x = 30 + i * step + (step - barWidth) / 2;
                        const maxH = 140;
                        const h = d.idleHours > 0 ? Math.max(4, (d.idleHours / maxVal) * maxH) : 2;
                        const y = 180 - h;
                        const showLabel = count <= 10 || i % Math.ceil(count / 7) === 0 || i === count - 1;

                        return (
                          <g key={d.day + '-' + i}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={h}
                              rx="5"
                              fill="url(#idleGrad)"
                            />
                            {showLabel && (
                              <text x={x + barWidth / 2} y="196" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                                {d.day}
                              </text>
                            )}
                            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="800">
                              {d.idleHours}h
                            </text>
                          </g>
                        );
                      });
                    })()}
                    <defs>
                      <linearGradient id="idleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* GRAPH 4: CREATIVE & ACTION TIME */}
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 2px 0' }}>
                      Graph 4: Creative & Action Time
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                      Script drafting, storyboard drawing & team commenting
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#a855f7',
                    background: 'rgba(168, 85, 247, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(168, 85, 247, 0.2)'
                  }}>
                    {metricsData.totals.creativeHours} hrs Creating
                  </span>
                </div>

                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="0" y1="180" x2="500" y2="180" stroke="#1f2937" strokeWidth="1" />
                    <line x1="0" y1="120" x2="500" y2="120" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />

                    {(() => {
                      const count = metricsData.daily.length || 1;
                      const maxVal = Math.max(...metricsData.daily.map(d => d.creativeHours), 0.5);
                      const step = 440 / count;
                      const barWidth = Math.max(8, Math.min(36, step * 0.65));

                      return metricsData.daily.map((d, i) => {
                        const x = 30 + i * step + (step - barWidth) / 2;
                        const maxH = 140;
                        const h = d.creativeHours > 0 ? Math.max(4, (d.creativeHours / maxVal) * maxH) : 2;
                        const y = 180 - h;
                        const showLabel = count <= 10 || i % Math.ceil(count / 7) === 0 || i === count - 1;

                        return (
                          <g key={d.day + '-' + i}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={h}
                              rx="5"
                              fill="url(#creativeGrad)"
                            />
                            {showLabel && (
                              <text x={x + barWidth / 2} y="196" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                                {d.day}
                              </text>
                            )}
                            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#c084fc" fontSize="11" fontWeight="800">
                              {d.creativeHours}h
                            </text>
                          </g>
                        );
                      });
                    })()}
                    <defs>
                      <linearGradient id="creativeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: LIVE ONLINE PRESENCE ─────────────────────────────────── */}
        {activeTab === 'presence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{
              background: '#111827',
              borderRadius: '20px',
              border: '1px solid #1f2937',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Live User Presence
                  </h2>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: isRealtimeActive ? '#4ade80' : '#f59e0b',
                    background: isRealtimeActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: `1px solid ${isRealtimeActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRealtimeActive ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
                    {isRealtimeActive ? 'Realtime Active' : 'Connecting Realtime'}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                  Real-time status of team members currently online or active
                </p>
              </div>

              <button
                onClick={refreshAdminData}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Grid of User Presence Cards */}
            {onlineUsers.length === 0 ? (
              <div style={{
                background: '#111827',
                border: '1px dashed #334155',
                borderRadius: '18px',
                padding: '48px 24px',
                textAlign: 'center',
                color: '#94a3b8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Users size={38} color="#64748b" />
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                  No Active Team Members Online
                </div>
                <div style={{ fontSize: '0.82rem', maxWidth: '440px', lineHeight: '1.5' }}>
                  Live presence tracking shows actual users connected to the platform with active status, current page, and client device info in real time.
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '18px'
              }}>
                {onlineUsers.map(user => {
                  const isOnline = user.status === 'online';
                  const isIdle = user.status === 'idle';

                  return (
                    <div
                      key={user.user_email}
                      style={{
                        background: '#111827',
                        border: isOnline ? '1.5px solid rgba(34, 197, 94, 0.4)' : '1px solid #1f2937',
                        borderRadius: '18px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxShadow: isOnline ? '0 10px 30px rgba(34, 197, 94, 0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative' }}>
                            <img
                              src={user.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                              alt={user.user_name}
                              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: isOnline ? '#22c55e' : isIdle ? '#f59e0b' : '#64748b',
                              border: '2px solid #111827'
                            }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>
                              {user.user_name}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                              {user.user_email}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.15)' : isIdle ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: isOnline ? '#4ade80' : isIdle ? '#fbbf24' : '#94a3b8',
                          border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.3)' : isIdle ? 'rgba(245, 158, 11, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`
                        }}>
                          {isOnline ? '● Online Now' : isIdle ? '○ Idle / Open' : 'Offline'}
                        </span>
                      </div>

                      <div style={{
                        background: '#090d16',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                          <span style={{ color: '#64748b' }}>Active Location:</span>
                          <span style={{ fontWeight: 600, color: '#38bdf8' }}>{user.current_page}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                          <span style={{ color: '#64748b' }}>Device / Client:</span>
                          <span>{user.device_info}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                          <span style={{ color: '#64748b' }}>Last Signal:</span>
                          <span>{new Date(user.last_heartbeat).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: PROJECT ACCESS MATRIX ────────────────────────────────── */}
        {activeTab === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{
              background: '#111827',
              borderRadius: '20px',
              border: '1px solid #1f2937',
              padding: '20px 24px'
            }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
                Project Access Control Matrix
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Set exactly who can see which projects. By default, all projects are visible to everyone unless restricted.
              </p>
            </div>

            {/* User Permissions Table */}
            <div style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '20px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Team Member</th>
                    <th style={{ padding: '14px 20px' }}>Access Mode</th>
                    <th style={{ padding: '14px 20px' }}>Assigned Project Visibility</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                        <Shield size={32} style={{ margin: '0 auto 10px auto', color: '#64748b', display: 'block' }} />
                        <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                          No Registered Team Members Yet
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                          When team creators sign in or join the workspace, they will appear here to configure their project visibility.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    registeredProfiles.map((profile) => {
                      const perm = permissions[profile.email] || { access_level: 'all', allowed_projects: [] };
                      const isAll = perm.access_level === 'all';

                      return (
                        <tr key={profile.email} style={{ borderBottom: '1px solid #1f2937', fontSize: '0.86rem' }}>
                          {/* Member */}
                          <td style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img
                                src={profile.avatar}
                                alt={profile.name}
                                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: 800, color: '#f8fafc' }}>{profile.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{profile.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Mode */}
                          <td style={{ padding: '18px 20px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              background: isAll ? 'rgba(34, 197, 94, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                              color: isAll ? '#4ade80' : '#c084fc',
                              border: `1px solid ${isAll ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`
                            }}>
                              {isAll ? 'Full Access (All Projects)' : 'Custom Allowed Only'}
                            </span>
                          </td>

                          {/* Checkbox pills per project */}
                          <td style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {allProjects.map(proj => {
                                const cleanHandle = proj.insta_handle.toLowerCase().replace(/^@/, '');
                                const isChecked = isAll || (perm.allowed_projects || []).map(p => p.toLowerCase().replace(/^@/, '')).includes(cleanHandle);

                                return (
                                  <button
                                    key={proj.id}
                                    type="button"
                                    onClick={() => handleToggleProjectPermission(profile.email, cleanHandle)}
                                    style={{
                                      border: isChecked ? '1px solid #4f46e5' : '1px solid #334155',
                                      background: isChecked ? 'rgba(79, 70, 229, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                                      color: isChecked ? '#c7d2fe' : '#64748b',
                                      padding: '5px 12px',
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    {isChecked ? <Check size={13} color="#818cf8" /> : <X size={13} />}
                                    <span>@{proj.insta_handle}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Reset to All */}
                          <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                            {!isAll && (
                              <button
                                onClick={() => handleSetFullAccess(profile.email)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  color: '#4ade80',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Reset to Full Access
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: WHOLE ACTION TIMELINE ─────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Timeline Header & Filters */}
            <div style={{
              background: '#111827',
              borderRadius: '20px',
              border: '1px solid #1f2937',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
                  Action Activity Timeline
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                  Complete chronological audit trail of every action across the platform
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '7px 12px 7px 30px',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '160px'
                    }}
                  />
                </div>

                <select
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Actions</option>
                  <option value="VIEW_SCRIPT">View Script</option>
                  <option value="EDIT_SCRIPT">Edit Script</option>
                  <option value="VIEW_STORYBOARD">View Storyboard</option>
                  <option value="EDIT_STORYBOARD">Edit Storyboard</option>
                  <option value="VIEW_REFERENCE">View Reference</option>
                  <option value="COMMENT">Comments</option>
                  <option value="LOGIN">Logins</option>
                  <option value="PERMISSIONS_UPDATE">Permissions</option>
                </select>
              </div>
            </div>

            {/* Timeline Stream */}
            <div style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {filteredTimeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 10px', color: '#94a3b8' }}>
                  <Activity size={32} style={{ margin: '0 auto 10px auto', color: '#64748b', display: 'block' }} />
                  <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                    No Actions Recorded Yet
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    Real platform actions (logins, script edits, storyboard designs, comments) will appear here chronologically as users perform them.
                  </div>
                </div>
              ) : (
                filteredTimeline.map((log) => {
                  const getActionBadgeColor = (type) => {
                    if (type.includes('CREATE')) return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
                    if (type.includes('EDIT')) return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
                    if (type.includes('COMMENT')) return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' };
                    if (type.includes('LOGIN')) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
                    return { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' };
                  };
                  const badge = getActionBadgeColor(log.action_type);

                  return (
                    <div
                      key={log.id}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '14px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={log.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={log.user_name}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                              {log.user_name}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`
                            }}>
                              {log.action_type.replace(/_/g, ' ')}
                            </span>
                            {log.target_project && (
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                on @{log.target_project}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <strong style={{ color: '#ffffff' }}>{log.target_title}:</strong> {log.details}
                          </div>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
