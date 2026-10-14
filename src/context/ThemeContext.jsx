import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();

  // Initialize theme from local storage or default to 'light'
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('insta_theme_preference');
      if (saved === 'dark' || saved === 'light') {
        document.documentElement.setAttribute('data-theme', saved);
        return saved;
      }
    } catch (_) {}
    document.documentElement.setAttribute('data-theme', 'light');
    return 'light';
  });

  // Sync with document element and localStorage
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('insta_theme_preference', theme);
    } catch (_) {}
  }, [theme]);

  // Sync from user account whenever user session loads
  useEffect(() => {
    if (user?.theme_preference && (user.theme_preference === 'dark' || user.theme_preference === 'light')) {
      if (user.theme_preference !== theme) {
        setThemeState(user.theme_preference);
        try {
          document.documentElement.setAttribute('data-theme', user.theme_preference);
          localStorage.setItem('insta_theme_preference', user.theme_preference);
        } catch (_) {}
      }
    }
  }, [user?.id, user?.theme_preference]);

  // Persist theme to account and state
  const setTheme = async (newTheme) => {
    if (newTheme !== 'dark' && newTheme !== 'light') return;
    setThemeState(newTheme);

    try {
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('insta_theme_preference', newTheme);
    } catch (_) {}

    // 1. Update local user storage
    try {
      const savedUserStr = localStorage.getItem('insta_app_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        u.theme_preference = newTheme;
        localStorage.setItem('insta_app_user', JSON.stringify(u));
      }
    } catch (e) {
      console.warn('Sync local user theme error:', e);
    }

    // 2. Persist to Supabase Auth User Metadata (follows the user across all devices & browsers)
    try {
      if (supabase?.auth) {
        await supabase.auth.updateUser({
          data: { theme_preference: newTheme }
        });
      }
    } catch (err) {
      console.warn('Sync theme to Supabase Auth metadata:', err);
    }

    // 3. Persist to profiles table in Supabase
    if (user?.id && supabase) {
      try {
        await supabase.from('profiles').update({ theme_preference: newTheme }).eq('id', user.id);
      } catch (err) {
        // Table or column optional
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
