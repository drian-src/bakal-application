import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('bakal_theme') || 'system';
    setTheme(savedTheme);
    setMounted(true);
    applyTheme(savedTheme);

    // Load user's saved preference from backend if authenticated
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.id) {
      loadUserTheme();
    }
  }, []);

  // Apply theme to document
  const applyTheme = (selectedTheme) => {
    const html = document.documentElement;
    let effectiveTheme = selectedTheme;

    // If system, detect actual preference
    if (selectedTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    // Add/remove dark class to html element
    if (effectiveTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Set CSS variable for theme (for non-CSS-variable components)
    html.style.setProperty('--theme-mode', effectiveTheme);
  };

  // Handle system preference changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Load theme preference from backend
  const loadUserTheme = async () => {
    try {
      // Only fetch if user has an auth token (avoid 401 race condition)
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;

      const response = await fetch('/api/user/preferences', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!response.ok) return;

      const data = await response.json();
      const userTheme = data.preferences?.theme_preference || 'system';
      setTheme(userTheme);
      localStorage.setItem('bakal_theme', userTheme);
      applyTheme(userTheme);
    } catch (error) {
      console.warn('[ThemeContext] Failed to load theme preference from backend:', error);
    }
  };

  // Update theme and save to backend
  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('bakal_theme', newTheme);
    applyTheme(newTheme);

    // Sync to backend if user is authenticated
    try {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ theme_preference: newTheme }),
        });
      }
    } catch (error) {
      console.warn('[ThemeContext] Failed to save theme preference to backend:', error);
    }
  };

  const value = {
    theme,
    updateTheme,
    mounted, // Don't render until mounted (avoid hydration mismatch)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
