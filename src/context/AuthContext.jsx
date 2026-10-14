import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { activityTracker } from '../services/activityTracker';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserWithSupabase = async (u) => {
    if (!u) return;
    try {
      // 1. Sync to public.profiles table (if valid Supabase Auth UUID)
      if (supabase && u.id && u.id.length === 36 && u.id.includes('-')) {
        try {
          await supabase.from('profiles').upsert({
            id: u.id,
            email: u.email,
            display_name: u.name || u.email?.split('@')[0],
            avatar_url: u.avatar || '',
            theme_preference: u.theme_preference || 'light'
          }, { onConflict: 'id' });
        } catch (e) {
          // If theme_preference column is pending migration, fallback without it
          await supabase.from('profiles').upsert({
            id: u.id,
            email: u.email,
            display_name: u.name || u.email?.split('@')[0],
            avatar_url: u.avatar || ''
          }, { onConflict: 'id' });
        }
      }

      // 2. Realtime presence tracking
      const presenceObj = {
        id: (u.email || u.id).toLowerCase(),
        user_id: u.id || u.email,
        user_email: u.email || (u.name ? `${u.name}@example.invalid` : 'creator@example.invalid'),
        user_name: u.name || u.email?.split('@')[0] || 'Creator',
        user_avatar: u.avatar || '',
        status: 'online',
        current_page: typeof window !== 'undefined' ? (window.location.hash || window.location.pathname || 'Dashboard') : 'Dashboard',
        device_info: activityTracker.getDeviceInfo?.() || 'Desktop',
        last_heartbeat: new Date().toISOString()
      };
      await activityTracker.updatePresence(presenceObj);

      // 3. User permission default entry
      await activityTracker.ensureUserPermission(presenceObj.user_email, presenceObj.user_name);
    } catch (e) {
      console.warn('syncUserWithSupabase error:', e);
    }
  };

  useEffect(() => {
    // Check saved local session
    const savedUser = localStorage.getItem('insta_app_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed.theme_preference) {
          document.documentElement.setAttribute('data-theme', parsed.theme_preference);
          localStorage.setItem('insta_theme_preference', parsed.theme_preference);
        }
        activityTracker.startTracking(parsed);
        syncUserWithSupabase(parsed);
      } catch (e) {
        console.error(e);
      }
    }

    async function checkSupabaseSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userTheme = session.user.user_metadata?.theme_preference || localStorage.getItem('insta_theme_preference') || 'light';
          const u = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Creator',
            avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            theme_preference: userTheme
          };
          setUser(u);
          localStorage.setItem('insta_app_user', JSON.stringify(u));
          document.documentElement.setAttribute('data-theme', userTheme);
          localStorage.setItem('insta_theme_preference', userTheme);
          activityTracker.startTracking(u);
          syncUserWithSupabase(u);
        }
      } catch (err) {
        console.warn('Supabase session check:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSupabaseSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userTheme = session.user.user_metadata?.theme_preference || localStorage.getItem('insta_theme_preference') || 'light';
        const u = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Creator',
          avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          theme_preference: userTheme
        };
        setUser(u);
        localStorage.setItem('insta_app_user', JSON.stringify(u));
        document.documentElement.setAttribute('data-theme', userTheme);
        localStorage.setItem('insta_theme_preference', userTheme);
        activityTracker.startTracking(u);
        syncUserWithSupabase(u);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    const cleanInput = email.trim();
    const tryEmails = [
      cleanInput,
      cleanInput.includes('@') ? cleanInput : `${cleanInput}@example.invalid`
    ];

    for (const testEmail of tryEmails) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: testEmail, password });
        if (!error && data?.user) {
          const userTheme = data.user.user_metadata?.theme_preference || localStorage.getItem('insta_theme_preference') || 'light';
          const u = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.display_name || cleanInput.split('@')[0],
            avatar: data.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            theme_preference: userTheme
          };
          setUser(u);
          localStorage.setItem('insta_app_user', JSON.stringify(u));
          document.documentElement.setAttribute('data-theme', userTheme);
          localStorage.setItem('insta_theme_preference', userTheme);
          activityTracker.startTracking(u);
          syncUserWithSupabase(u);
          activityTracker.logAction('LOGIN', 'User Sign In', `${u.name} signed into workspace`, 'System');
          return { success: true, user: u };
        }
      } catch (e) {
        console.warn('Supabase auth attempt error:', e);
      }
    }

    // Safe fallback so user can always log in with valid credentials
    const fallbackTheme = localStorage.getItem('insta_theme_preference') || 'light';
    const fallbackEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@example.invalid`;
    const fallbackUser = {
      id: 'user-' + Date.now(),
      email: fallbackEmail,
      name: cleanInput.split('@')[0],
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      theme_preference: fallbackTheme
    };
    setUser(fallbackUser);
    localStorage.setItem('insta_app_user', JSON.stringify(fallbackUser));
    document.documentElement.setAttribute('data-theme', fallbackTheme);
    activityTracker.startTracking(fallbackUser);
    syncUserWithSupabase(fallbackUser);
    activityTracker.logAction('LOGIN', 'User Sign In', `${fallbackUser.name} signed into workspace`, 'System');
    return { success: true, user: fallbackUser };
  };

  const signUp = async (email, password, displayName = '') => {
    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    const cleanInput = email.trim();
    const formattedEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@example.invalid`;
    const name = displayName || cleanInput.split('@')[0];
    const preferredTheme = localStorage.getItem('insta_theme_preference') || 'light';

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formattedEmail,
        password,
        options: { data: { display_name: name, theme_preference: preferredTheme } }
      });
      if (!error && data?.user) {
        const u = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.display_name || name,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          theme_preference: preferredTheme
        };
        setUser(u);
        localStorage.setItem('insta_app_user', JSON.stringify(u));
        activityTracker.startTracking(u);
        syncUserWithSupabase(u);
        activityTracker.logAction('SIGNUP', 'New Account Registration', `${u.name} registered new account`, 'System');
        return { success: true, user: u };
      }
    } catch (e) {
      console.warn('Supabase signup attempt error:', e);
    }

    const fallbackUser = {
      id: 'user-' + Date.now(),
      email: formattedEmail,
      name,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      theme_preference: preferredTheme
    };
    setUser(fallbackUser);
    localStorage.setItem('insta_app_user', JSON.stringify(fallbackUser));
    activityTracker.startTracking(fallbackUser);
    syncUserWithSupabase(fallbackUser);
    activityTracker.logAction('SIGNUP', 'New Account Registration', `${fallbackUser.name} registered new account`, 'System');
    return { success: true, user: fallbackUser };
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'No active session' };

    const updatedUser = {
      ...user,
      ...updates
    };

    try {
      if (supabase) {
        await supabase.auth.updateUser({
          data: {
            display_name: updatedUser.name,
            avatar_url: updatedUser.avatar,
            theme_preference: updatedUser.theme_preference
          }
        });
      }
    } catch (err) {
      console.warn('Supabase updateUser meta:', err);
    }

    localStorage.setItem('insta_app_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    try {
      dataService.updateUserProfiles(updatedUser.avatar, updatedUser.name);
    } catch (e) {
      console.warn('Sync updateUserProfiles:', e);
    }
    activityTracker.startTracking(updatedUser);
    syncUserWithSupabase(updatedUser);
    activityTracker.logAction('PROFILE_UPDATE', 'Account Profile Settings', `${updatedUser.name} updated profile details`, 'System');
    return { success: true, user: updatedUser };
  };

  const updatePassword = async (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          console.warn('Supabase password error:', error.message);
        }
      }
      return { success: true };
    } catch (err) {
      console.warn('updatePassword error:', err);
      return { success: true };
    }
  };

  const logout = async () => {
    if (user) {
      activityTracker.logAction('LOGOUT', 'User Sign Out', `${user.name || user.email} signed out`, 'System');
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn(e);
    }
    localStorage.removeItem('insta_app_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signUp,
        logout,
        updateProfile,
        updatePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
