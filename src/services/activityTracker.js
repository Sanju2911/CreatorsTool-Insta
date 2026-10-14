import { supabase } from './supabase.js';

// Storage keys (v2 - purged of legacy mock/dummy data)
const LOCAL_ADMIN_KEY = 'insta_admin_session_v2';
const LOCAL_PRESENCE_KEY = 'insta_presence_v2';
const LOCAL_ACTIVITY_KEY = 'insta_activity_logs_v2';
const LOCAL_ENGAGEMENT_KEY = 'insta_engagement_metrics_v2';
const LOCAL_PERMISSIONS_KEY = 'insta_user_permissions_v2';

// Seed Admin User (Required credentials for Admin Portal - NO SIGN UP)
export const SEED_ADMINS = []; // Configure administrators privately in the database.

// Clean empty exports - zero mock/dummy data
export const REGISTERED_TEAM_PROFILES = [];
export const INITIAL_ACTIVITY_LOGS = [];

// Helper to generate calendar days list for real analytics
export function getDaysList(timeRange = '7d') {
  const count = timeRange === 'today' ? 1 : timeRange === '30d' ? 30 : 7;
  const days = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayName = count === 1 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({
      dateStr,
      day: dayName,
      date: monthDay
    });
  }
  return days;
}

// Fallback empty metrics structure
export function generateSeedEngagementMetrics() {
  const days = getDaysList('7d');
  return {
    totals: {
      onlineHours: 0,
      activeHours: 0,
      idleHours: 0,
      creativeHours: 0,
      actionsCount: 0
    },
    daily: days.map(d => ({
      day: d.day,
      date: d.date,
      onlineHours: 0,
      activeHours: 0,
      idleHours: 0,
      creativeHours: 0,
      actionsCount: 0
    }))
  };
}

class ActivityTrackerService {
  constructor() {
    this.currentUser = null;
    this.lastUserInteraction = Date.now();
    this.sessionStartTime = Date.now();
    this.isTracking = false;
    this.currentMode = 'active'; // 'active' | 'creative'
    this.activeProject = '';
    this.heartbeatTimer = null;

    // One-time purge of legacy dummy caches
    this.purgeLegacyDummies();
  }

  // Purge any old v1 caches that had fake Sarah, fake Collaborator, or fabricated seed logs
  purgeLegacyDummies() {
    if (typeof window === 'undefined') return;
    try {
      const legacyKeys = [
        'insta_presence_v1',
        'insta_activity_logs_v1',
        'insta_engagement_metrics_v1',
        'insta_user_permissions_v1'
      ];
      legacyKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      // Migrate existing admin session if logged in under v1
      const oldAdmin = localStorage.getItem('insta_admin_session_v1');
      if (oldAdmin && !localStorage.getItem(LOCAL_ADMIN_KEY)) {
        localStorage.setItem(LOCAL_ADMIN_KEY, oldAdmin);
      }
    } catch (e) {}
  }

  // Helper to read currently logged in user
  getSavedAppUser() {
    try {
      const raw = localStorage.getItem('insta_app_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  getDeviceInfo() {
    if (typeof navigator === 'undefined') return 'Desktop Browser';
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'Mobile Device';
    if (/macintosh/i.test(ua)) return 'macOS Desktop';
    if (/windows/i.test(ua)) return 'Windows Desktop';
    if (/linux/i.test(ua)) return 'Linux Desktop';
    return 'Desktop Browser';
  }

  // Initialize tracking for active user session with Supabase Realtime
  startTracking(user) {
    if (!user) return;
    this.currentUser = user;
    this.sessionStartTime = Date.now();
    this.lastUserInteraction = Date.now();

    // Initialize or refresh Supabase Realtime Presence Channel
    this.initRealtimePresence(user);

    // Always send an immediate heartbeat signal
    this.sendHeartbeat();

    if (this.isTracking) return;
    this.isTracking = true;

    // Attach interaction & visibility listeners
    if (typeof window !== 'undefined') {
      const markActive = () => {
        const wasIdle = (Date.now() - this.lastUserInteraction) > 60000;
        this.lastUserInteraction = Date.now();
        if (wasIdle) {
          this.sendHeartbeat();
        }
      };
      window.addEventListener('mousemove', markActive, { passive: true });
      window.addEventListener('keydown', markActive, { passive: true });
      window.addEventListener('click', markActive, { passive: true });
      window.addEventListener('scroll', markActive, { passive: true });

      // Live tab visibility tracking
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.lastUserInteraction = Date.now();
          this.sendHeartbeat();
        } else {
          // Tab hidden - send updated idle heartbeat
          this.sendHeartbeat();
        }
      });

      // Periodic heartbeat every 10s for high realtime accuracy
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
      }, 10000);
    }
  }

  // Realtime Presence Socket
  initRealtimePresence(user) {
    if (!user || (!user.email && !user.id)) return;
    const userKey = (user.email || user.id).toLowerCase();

    try {
      if (!this.presenceChannel) {
        this.presenceChannel = supabase.channel('insta_live_presence', {
          config: { presence: { key: userKey } }
        });

        this.presenceChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.presenceChannel.track({
              id: userKey,
              user_id: user.id || userKey,
              user_email: user.email || userKey,
              user_name: user.name || user.email?.split('@')[0] || userKey,
              user_avatar: user.avatar || '',
              status: 'online',
              current_page: typeof window !== 'undefined' ? (window.location.hash || window.location.pathname || 'Dashboard') : 'Dashboard',
              device_info: this.getDeviceInfo(),
              last_heartbeat: new Date().toISOString()
            });
          }
        });
      }
    } catch (e) {
      console.warn('Realtime presence channel init:', e);
    }
  }

  setCreativeMode(isCreative = true) {
    this.currentMode = isCreative ? 'creative' : 'active';
  }

  setActiveProject(handle) {
    if (handle) {
      this.activeProject = handle;
      this.sendHeartbeat();
    }
  }

  // Heartbeat to update online presence & real engagement
  sendHeartbeat() {
    const user = this.currentUser || this.getSavedAppUser();
    if (!user || (!user.email && !user.id)) return;

    const now = Date.now();
    const idleSeconds = Math.round((now - this.lastUserInteraction) / 1000);
    const isDocHidden = typeof document !== 'undefined' && document.hidden;
    const isIdle = idleSeconds > 60 || isDocHidden;
    const status = isIdle ? 'idle' : 'online';

    const currentPage = (typeof window !== 'undefined'
      ? (window.location.hash || window.location.pathname || 'Dashboard')
      : 'Dashboard');

    const presencePayload = {
      id: (user.email || user.id).toLowerCase(),
      user_id: user.id || user.email || 'creator',
      user_email: user.email || (user.name ? `${user.name}@example.invalid` : 'creator@example.invalid'),
      user_name: user.name || user.email?.split('@')[0] || 'Creator',
      user_avatar: user.avatar || '',
      status: status,
      current_page: currentPage,
      device_info: this.getDeviceInfo(),
      last_heartbeat: new Date().toISOString()
    };

    // 1. Update presence (local + Supabase + Realtime)
    this.updatePresence(presencePayload);

    // 2. Accumulate genuine engagement time: 10-second slice (0.166 minutes)
    this.recordEngagementHeartbeat(
      presencePayload.user_email,
      presencePayload.user_name,
      presencePayload.user_avatar,
      isIdle,
      this.currentMode === 'creative',
      0.17
    );
  }

  async updatePresence(presenceObj) {
    if (!presenceObj || !presenceObj.user_email) return;
    try {
      // Local presence storage cache
      const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      list = list.filter(p => !this.isDummyEmail(p.user_email));

      const idx = list.findIndex(p => p.user_email?.toLowerCase() === presenceObj.user_email?.toLowerCase());
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...presenceObj };
      } else {
        list.push(presenceObj);
      }
      localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(list));

      // 1. Supabase database upsert
      await supabase.from('user_presence').upsert(presenceObj, { onConflict: 'id' });

      // 2. Supabase Realtime channel track & broadcast pulse
      if (this.presenceChannel) {
        try {
          this.presenceChannel.track(presenceObj);
          this.presenceChannel.send({
            type: 'broadcast',
            event: 'presence_pulse',
            payload: presenceObj
          });
        } catch (err) {}
      }
    } catch (e) {
      console.warn('updatePresence sync error:', e);
    }
  }

  // ─── REAL ENGAGEMENT TRACKING STORE ───────────────────────────────────────

  getEngagementStore() {
    try {
      const raw = localStorage.getItem(LOCAL_ENGAGEMENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Clean out any dummy emails
          delete parsed['creator@example.invalid'];
          delete parsed['creator@example.invalid'];
          return parsed;
        }
      }
    } catch (e) {}
    return {};
  }

  saveEngagementStore(store) {
    try {
      localStorage.setItem(LOCAL_ENGAGEMENT_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  // Record a 15-second heartbeat slice into engagement metrics
  recordEngagementHeartbeat(email, name, avatar, isIdle, isCreative, minutes = 0.25) {
    if (!email || this.isDummyEmail(email)) return;
    const store = this.getEngagementStore();
    const userKey = email.toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (!store[userKey]) {
      store[userKey] = {
        user_name: name,
        user_email: email,
        avatar: avatar,
        days: {}
      };
    }

    if (!store[userKey].days[dateStr]) {
      store[userKey].days[dateStr] = {
        onlineMinutes: 0,
        activeMinutes: 0,
        idleMinutes: 0,
        creativeMinutes: 0,
        actionsCount: 0
      };
    }

    const day = store[userKey].days[dateStr];
    day.onlineMinutes = Math.round((day.onlineMinutes + minutes) * 100) / 100;

    if (isIdle) {
      day.idleMinutes = Math.round((day.idleMinutes + minutes) * 100) / 100;
    } else {
      day.activeMinutes = Math.round((day.activeMinutes + minutes) * 100) / 100;
      if (isCreative) {
        day.creativeMinutes = Math.round((day.creativeMinutes + minutes) * 100) / 100;
      }
    }

    this.saveEngagementStore(store);

    // Async sync to Supabase engagement_metrics
    try {
      supabase.from('engagement_metrics').upsert([{
        id: `${userKey}_${dateStr}`,
        user_email: email,
        user_name: name,
        date_str: dateStr,
        online_minutes: Math.round(day.onlineMinutes),
        active_using_minutes: Math.round(day.activeMinutes),
        idle_open_minutes: Math.round(day.idleMinutes),
        creative_action_minutes: Math.round(day.creativeMinutes),
        actions_count: day.actionsCount,
        updated_at: new Date().toISOString()
      }]).catch(() => {});
    } catch (e) {}
  }

  // Record an action (e.g. script edit, storyboard draw, idea created)
  recordEngagementAction(email, name) {
    if (!email || this.isDummyEmail(email)) return;
    const store = this.getEngagementStore();
    const userKey = email.toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0];

    if (!store[userKey]) {
      store[userKey] = {
        user_name: name,
        user_email: email,
        avatar: '',
        days: {}
      };
    }

    if (!store[userKey].days[dateStr]) {
      store[userKey].days[dateStr] = {
        onlineMinutes: 0,
        activeMinutes: 0,
        idleMinutes: 0,
        creativeMinutes: 0,
        actionsCount: 0
      };
    }

    store[userKey].days[dateStr].actionsCount += 1;
    this.saveEngagementStore(store);

    // Sync to Supabase
    try {
      const day = store[userKey].days[dateStr];
      supabase.from('engagement_metrics').upsert([{
        id: `${userKey}_${dateStr}`,
        user_email: email,
        user_name: name,
        date_str: dateStr,
        online_minutes: Math.round(day.onlineMinutes),
        active_using_minutes: Math.round(day.activeMinutes),
        idle_open_minutes: Math.round(day.idleMinutes),
        creative_action_minutes: Math.round(day.creativeMinutes),
        actions_count: day.actionsCount,
        updated_at: new Date().toISOString()
      }]).catch(() => {});
    } catch (e) {}
  }

  // Check if an email is a legacy dummy
  isDummyEmail(email) {
    if (!email) return false;
    const clean = String(email).trim().toLowerCase();
    return clean === 'creator@example.invalid' || clean === 'creator@example.invalid';
  }

  // ─── ACTION TIMELINE & LOGGING ────────────────────────────────────────────

  // Log user action into timeline
  logAction(actionType, targetTitle, details, targetProject = '') {
    let user = this.currentUser;
    if (!user) user = this.getSavedAppUser();
    if (!user) {
      const admin = this.getAdminSession();
      if (admin) {
        user = {
          id: admin.id,
          email: admin.email,
          name: admin.full_name || admin.username || 'Admin',
          avatar: admin.avatar_url || ''
        };
      }
    }
    if (!user) {
      user = { id: 'creator', name: 'Creator', email: 'creator@workspace.com' };
    }

    const newLog = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      user_id: user.id || user.email,
      user_name: user.name || user.email?.split('@')[0] || 'Creator',
      user_avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      action_type: actionType,
      target_title: targetTitle || 'Action',
      target_project: targetProject || this.activeProject || 'Workspace',
      details: details || '',
      created_at: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem(LOCAL_ACTIVITY_KEY);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      // Filter out legacy dummy items
      list = list.filter(l => !this.isDummyEmail(l.user_email) && !['Sarah', 'Collaborator'].includes(l.user_name));

      list.unshift(newLog);
      // Cap at 200 logs
      if (list.length > 200) list = list.slice(0, 200);
      localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(list));

      supabase.from('activity_logs').insert([newLog]).catch(() => {});
    } catch (e) {
      // ignore
    }

    // Also increment real action counter in engagement metrics
    this.recordEngagementAction(user.email, user.name);

    return newLog;
  }

  // ─── ADMIN AUTHENTICATION ─────────────────────────────────────────────────

  async adminLogin(usernameOrEmail, password) {
    const cleanUser = String(usernameOrEmail).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Check seed admins & Supabase
    const matched = SEED_ADMINS.find(
      a => (a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanUser) && a.password === cleanPass
    );

    if (matched) {
      const session = {
        id: matched.id,
        username: matched.username,
        email: matched.email,
        full_name: matched.full_name,
        role: matched.role,
        avatar_url: matched.avatar_url,
        login_time: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(session));
      this.logAction('LOGIN', 'Admin Portal Access', 'Admin successfully authenticated to command center', 'Admin');
      return { success: true, session };
    }

    // Attempt Supabase admin_users check
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .or(`username.eq.${cleanUser},email.eq.${cleanUser}`)
        .eq('password', cleanPass)
        .single();

      if (!error && data) {
        const session = {
          id: data.id,
          username: data.username,
          email: data.email,
          full_name: data.full_name,
          role: data.role || 'Super Admin',
          avatar_url: data.avatar_url,
          login_time: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(session));
        this.logAction('LOGIN', 'Admin Portal Access', 'Admin successfully authenticated to command center', 'Admin');
        return { success: true, session };
      }
    } catch (e) {
      // fallback
    }

    return { success: false, error: 'Invalid admin username or password.' };
  }

  getAdminSession() {
    try {
      const raw = localStorage.getItem(LOCAL_ADMIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  adminLogout() {
    localStorage.removeItem(LOCAL_ADMIN_KEY);
  }

  // ─── REAL REGISTERED PROFILES (NO DUMMIES) ────────────────────────────────

  async ensureUserPermission(userEmail, userName = '') {
    if (!userEmail || this.isDummyEmail(userEmail)) return;
    const cleanEmail = userEmail.toLowerCase();
    try {
      const { data } = await supabase.from('user_permissions').select('id').eq('id', cleanEmail).maybeSingle();
      if (!data) {
        await supabase.from('user_permissions').upsert({
          id: cleanEmail,
          user_email: userEmail,
          user_name: userName || userEmail.split('@')[0],
          access_level: 'all',
          allowed_projects: []
        }, { onConflict: 'id' });
      }
    } catch (e) {}
  }

  async getRegisteredProfiles() {
    const profileMap = new Map();

    // 1. Try Supabase Auth Users directly via RPC
    try {
      const { data: authUsers, error: aErr } = await supabase.rpc('get_auth_users');
      if (!aErr && Array.isArray(authUsers)) {
        authUsers.forEach(u => {
          if (u.email && !this.isDummyEmail(u.email)) {
            profileMap.set(u.email.toLowerCase(), {
              id: u.id,
              email: u.email,
              name: u.display_name || u.email.split('@')[0],
              avatar: u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
              role: 'Auth Account'
            });
          }
        });
      }
    } catch (e) {}

    // 2. Fetch from Supabase profiles table
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          if (p.email && !this.isDummyEmail(p.email)) {
            const emailLower = p.email.toLowerCase();
            const existing = profileMap.get(emailLower) || {};
            profileMap.set(emailLower, {
              id: p.id || emailLower,
              email: p.email,
              name: p.display_name || existing.name || p.email.split('@')[0],
              avatar: p.avatar_url || existing.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
              role: 'Team Creator'
            });
          }
        });
      }
    } catch (e) {}

    // 3. Fetch from user_presence table (anyone who connected)
    try {
      const { data, error } = await supabase.from('user_presence').select('*');
      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          if (p.user_email && !this.isDummyEmail(p.user_email)) {
            const emailLower = p.user_email.toLowerCase();
            const existing = profileMap.get(emailLower) || {};
            profileMap.set(emailLower, {
              id: p.user_id || emailLower,
              email: p.user_email,
              name: p.user_name || existing.name || p.user_email.split('@')[0],
              avatar: p.user_avatar || existing.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
              role: 'Team Creator'
            });
          }
        });
      }
    } catch (e) {}

    // 4. Fetch from user_permissions table
    try {
      const { data, error } = await supabase.from('user_permissions').select('*');
      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          if (p.user_email && !this.isDummyEmail(p.user_email)) {
            const emailLower = p.user_email.toLowerCase();
            const existing = profileMap.get(emailLower) || {};
            profileMap.set(emailLower, {
              id: emailLower,
              email: p.user_email,
              name: p.user_name || existing.name || p.user_email.split('@')[0],
              avatar: existing.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
              role: 'Team Member'
            });
          }
        });
      }
    } catch (e) {}

    // 5. Current active user from localStorage
    const savedUser = this.getSavedAppUser();
    if (savedUser && savedUser.email && !this.isDummyEmail(savedUser.email)) {
      const emailLower = savedUser.email.toLowerCase();
      const existing = profileMap.get(emailLower) || {};
      profileMap.set(emailLower, {
        id: savedUser.id || emailLower,
        email: savedUser.email,
        name: savedUser.name || existing.name || savedUser.email.split('@')[0],
        avatar: savedUser.avatar || existing.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
        role: 'Active Creator'
      });
    }

    // 6. Guarantee both active accounts from user workspace are present
    const defaultAccounts = [];
    defaultAccounts.forEach(acc => {
      const lower = acc.email.toLowerCase();
      const nameMatch = Array.from(profileMap.values()).some(p => p.name?.toLowerCase() === acc.name.toLowerCase());
      if (!profileMap.has(lower) && !nameMatch) {
        profileMap.set(lower, {
          id: lower,
          email: acc.email,
          name: acc.name,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
          role: 'Team Creator'
        });
      }
    });

    return Array.from(profileMap.values());
  }

  // ─── REAL ONLINE PRESENCE (WHO IS PRESENTLY ONLINE) ───────────────────────

  async getOnlinePresence() {
    const presenceMap = new Map();

    // 1. Fetch from Supabase user_presence table
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .order('last_heartbeat', { ascending: false });
      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          if (p.user_email && !this.isDummyEmail(p.user_email)) {
            presenceMap.set(p.user_email.toLowerCase(), p);
          }
        });
      }
    } catch (e) {}

    // 2. Merge Supabase Realtime Channel presence state (if connected)
    if (this.presenceChannel) {
      try {
        const state = this.presenceChannel.presenceState();
        Object.entries(state).forEach(([key, list]) => {
          if (Array.isArray(list) && list[0]) {
            const p = list[0];
            const emailLower = (p.user_email || key).toLowerCase();
            if (!this.isDummyEmail(emailLower)) {
              presenceMap.set(emailLower, {
                ...presenceMap.get(emailLower),
                ...p,
                status: p.status || 'online'
              });
            }
          }
        });
      } catch (e) {}
    }

    // 3. Merge local presence store
    try {
      const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(p => {
            if (p.user_email && !this.isDummyEmail(p.user_email)) {
              const emailLower = p.user_email.toLowerCase();
              if (!presenceMap.has(emailLower)) {
                presenceMap.set(emailLower, p);
              }
            }
          });
        }
      }
    } catch (e) {}

    // Compute status based on REAL heartbeat timestamps
    const now = Date.now();
    const result = Array.from(presenceMap.values()).map(p => {
      const lastTime = p.last_heartbeat ? new Date(p.last_heartbeat).getTime() : 0;
      const diff = now - lastTime;
      let status = p.status || 'offline';

      if (diff > 5 * 60 * 1000) {
        status = 'offline';
      } else if (diff > 90 * 1000) {
        status = 'idle';
      } else {
        status = 'online';
      }
      return { ...p, status };
    });

    // Ensure both active accounts show their live presence card
    const defaultAccounts = [];
    defaultAccounts.forEach(acc => {
      const lower = acc.email.toLowerCase();
      const existing = result.find(r => r.user_email?.toLowerCase() === lower || r.user_name?.toLowerCase() === acc.name.toLowerCase());
      if (!existing) {
        result.push({
          id: lower,
          user_id: lower,
          user_email: acc.email,
          user_name: acc.name,
          user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
          status: 'online',
          current_page: 'Dashboard',
          device_info: 'Desktop Chrome',
          last_heartbeat: new Date().toISOString()
        });
      }
    });

    // Sort: online first, then idle, then offline
    result.sort((a, b) => {
      const order = { online: 0, idle: 1, offline: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

    return result;
  }

  // ─── REAL ACTIVITY TIMELINE ───────────────────────────────────────────────

  async getActivityTimeline() {
    let logs = [];

    // 1. Fetch from Supabase activity_logs table
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && Array.isArray(data) && data.length > 0) {
        logs = data.filter(l => !this.isDummyEmail(l.user_email) && !['Sarah', 'Collaborator'].includes(l.user_name));
      }
    } catch (e) {}

    // 2. Merge with local activity logs
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVITY_KEY);
      if (raw) {
        const localLogs = JSON.parse(raw);
        if (Array.isArray(localLogs)) {
          const idSet = new Set(logs.map(l => l.id));
          localLogs.forEach(l => {
            if (!idSet.has(l.id) && !this.isDummyEmail(l.user_email) && !['Sarah', 'Collaborator'].includes(l.user_name)) {
              logs.push(l);
              idSet.add(l.id);
            }
          });
        }
      }
    } catch (e) {}

    // Sort descending by created_at
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return logs;
  }

  // ─── PROJECT ACCESS PERMISSIONS ───────────────────────────────────────────

  getLocalPermissions() {
    let perms = {};
    try {
      const raw = localStorage.getItem(LOCAL_PERMISSIONS_KEY);
      if (raw) perms = JSON.parse(raw);
    } catch (e) {}
    delete perms['creator@example.invalid'];
    delete perms['creator@example.invalid'];
    return perms;
  }

  async getUserPermissions() {
    let perms = this.getLocalPermissions();

    // Fetch from Supabase user_permissions
    try {
      const { data, error } = await supabase.from('user_permissions').select('*');
      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          if (p.user_email && !this.isDummyEmail(p.user_email)) {
            perms[p.user_email] = {
              access_level: p.access_level || 'all',
              allowed_projects: p.allowed_projects || []
            };
          }
        });
      }
    } catch (e) {}

    return perms;
  }

  async saveUserPermissions(userEmail, permissions) {
    if (!userEmail) return {};
    const all = this.getLocalPermissions();
    all[userEmail] = permissions;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_PERMISSIONS_KEY, JSON.stringify(all));
      }
    } catch (e) {}

    this.logAction(
      'PERMISSIONS_UPDATE',
      `Updated Access for ${userEmail}`,
      permissions.access_level === 'all'
        ? 'Granted full access to all projects'
        : `Restricted to: ${permissions.allowed_projects.join(', ') || 'None'}`,
      'Admin'
    );

    try {
      await supabase.from('user_permissions').upsert({
        id: userEmail.toLowerCase(),
        user_email: userEmail,
        access_level: permissions.access_level,
        allowed_projects: permissions.allowed_projects,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      // Broadcast permission change to Realtime channel
      if (this.presenceChannel) {
        this.presenceChannel.send({
          type: 'broadcast',
          event: 'permissions_update',
          payload: { userEmail, permissions }
        });
      }
    } catch (e) {
      console.warn('saveUserPermissions upsert error:', e);
    }

    return all;
  }

  // Check if a user is permitted to see a given project
  isProjectAllowed(userEmail, projectHandle) {
    if (!userEmail) return true; // Default all visible
    let perms = {};
    try {
      const raw = localStorage.getItem(LOCAL_PERMISSIONS_KEY);
      if (raw) perms = JSON.parse(raw);
    } catch (e) {}
    const userPerm = perms[userEmail];
    if (!userPerm || userPerm.access_level === 'all') return true;
    const clean = String(projectHandle).toLowerCase().replace(/^@/, '');
    return (userPerm.allowed_projects || []).some(p => p.toLowerCase().replace(/^@/, '') === clean);
  }

  // ─── REAL PROFILE ENGAGEMENT ANALYTICS (THE 4 GRAPHS) ────────────────────

  getEngagementMetrics(userEmail = 'all', timeRange = '7d') {
    const store = this.getEngagementStore();
    const daysList = getDaysList(timeRange);

    // If a specific real user was selected
    if (userEmail && userEmail !== 'all') {
      const userKey = userEmail.toLowerCase();
      const userData = store[userKey];

      const daily = daysList.map(d => {
        const record = userData?.days?.[d.dateStr] || {
          onlineMinutes: 0,
          activeMinutes: 0,
          idleMinutes: 0,
          creativeMinutes: 0,
          actionsCount: 0
        };
        const onlineH = Math.round((record.onlineMinutes / 60) * 10) / 10;
        const activeH = Math.round((record.activeMinutes / 60) * 10) / 10;
        const idleH = Math.round((record.idleMinutes / 60) * 10) / 10;
        const creativeH = Math.round((record.creativeMinutes / 60) * 10) / 10;

        return {
          day: d.day,
          date: d.date,
          onlineHours: onlineH,
          activeHours: activeH,
          idleHours: idleH,
          creativeHours: creativeH,
          actionsCount: record.actionsCount || 0
        };
      });

      const totalOnline = Math.round(daily.reduce((acc, d) => acc + d.onlineHours, 0) * 10) / 10;
      const totalActive = Math.round(daily.reduce((acc, d) => acc + d.activeHours, 0) * 10) / 10;
      const totalIdle = Math.round(daily.reduce((acc, d) => acc + d.idleHours, 0) * 10) / 10;
      const totalCreative = Math.round(daily.reduce((acc, d) => acc + d.creativeHours, 0) * 10) / 10;
      const totalActions = daily.reduce((acc, d) => acc + d.actionsCount, 0);

      return {
        user_name: userData?.user_name || userEmail,
        user_email: userEmail,
        avatar: userData?.avatar || '',
        totals: {
          onlineHours: totalOnline,
          activeHours: totalActive,
          idleHours: totalIdle,
          creativeHours: totalCreative,
          actionsCount: totalActions
        },
        daily
      };
    }

    // Aggregate across ALL real users in store
    const users = Object.values(store);

    const aggDaily = daysList.map(d => {
      let onlineMins = 0;
      let activeMins = 0;
      let idleMins = 0;
      let creativeMins = 0;
      let actions = 0;

      users.forEach(u => {
        const rec = u?.days?.[d.dateStr];
        if (rec) {
          onlineMins += rec.onlineMinutes || 0;
          activeMins += rec.activeMinutes || 0;
          idleMins += rec.idleMinutes || 0;
          creativeMins += rec.creativeMinutes || 0;
          actions += rec.actionsCount || 0;
        }
      });

      return {
        day: d.day,
        date: d.date,
        onlineHours: Math.round((onlineMins / 60) * 10) / 10,
        activeHours: Math.round((activeMins / 60) * 10) / 10,
        idleHours: Math.round((idleMins / 60) * 10) / 10,
        creativeHours: Math.round((creativeMins / 60) * 10) / 10,
        actionsCount: actions
      };
    });

    const totalOnline = Math.round(aggDaily.reduce((acc, d) => acc + d.onlineHours, 0) * 10) / 10;
    const totalActive = Math.round(aggDaily.reduce((acc, d) => acc + d.activeHours, 0) * 10) / 10;
    const totalIdle = Math.round(aggDaily.reduce((acc, d) => acc + d.idleHours, 0) * 10) / 10;
    const totalCreative = Math.round(aggDaily.reduce((acc, d) => acc + d.creativeHours, 0) * 10) / 10;
    const totalActions = aggDaily.reduce((acc, d) => acc + d.actionsCount, 0);

    return {
      user_name: 'All Real Team Profiles',
      user_email: 'all',
      avatar: '',
      totals: {
        onlineHours: totalOnline,
        activeHours: totalActive,
        idleHours: totalIdle,
        creativeHours: totalCreative,
        actionsCount: totalActions
      },
      daily: aggDaily
    };
  }
}

export const activityTracker = new ActivityTrackerService();
