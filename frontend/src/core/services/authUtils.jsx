import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, getAuthToken, logoutUser } from './authService';

/**
 * Validates the stored token against the backend.
 * Returns true if valid, false if expired/invalid.
 * On failure, clears localStorage so the user sees the login page.
 */
const validateTokenWithBackend = async () => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      // Token is expired or invalid — clear it so the user can log in again
      logoutUser();
      return false;
    }
    return true;
  } catch {
    // Backend unreachable — do NOT redirect to home, let user stay on login page
    // But also don't clear the token — they may just be offline temporarily
    return false;
  }
};

/**
 * Protected Route Component - Requires authentication for access
 * Wraps routes that should only be accessible by authenticated users
 */
export const ProtectedRoute = ({ children, requiredAuth = true }) => {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'valid' | 'invalid'

  useEffect(() => {
    const check = async () => {
      if (!isAuthenticated()) {
        setAuthState('invalid');
        return;
      }
      // Validate token with backend before trusting it
      const valid = await validateTokenWithBackend();
      setAuthState(valid ? 'valid' : 'invalid');
    };
    check();
  }, []);

  // Show nothing while checking — prevents flash of wrong content
  if (authState === 'checking') {
    return null;
  }

  // Route requires auth (e.g. /home, /cart) — redirect to login if not valid
  if (requiredAuth && authState === 'invalid') {
    return <Navigate to="/login" replace />;
  }

  // Route requires NO auth (e.g. /login, /signup) — only redirect to home
  // if token is genuinely valid (confirmed by backend), not just present
  if (!requiredAuth && authState === 'valid') {
    return <Navigate to="/home" replace />;
  }

  return children;
};
/**
 * Custom Hook - Get current authentication state
 * Returns current user or null if not authenticated
 */
export const useAuthState = () => {
  const user = getCurrentUser();
  return {
    isAuthenticated: !!user,
    user,
    updateAuth: () => {
      // Trigger re-render by getting fresh user data
      return getCurrentUser();
    },
  };
};

/**
 * Check if user has accessed a specific platform
 * Useful for tracking which platforms user has purchased from
 */
export const canAccessPlatform = (platformName) => {
  const user = getCurrentUser();
  if (!user) return false;

  const accessedPlatforms = user.accessedPlatforms || [];
  return accessedPlatforms.includes(platformName);
};
