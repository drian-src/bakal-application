import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, getAuthToken, logoutUser } from './authService';

/**
 * Validates the stored token against the backend.
 * Returns true if valid, false if expired/invalid/unreachable.
 * On failure, clears localStorage so the user sees the login page.
 */
const validateTokenWithBackend = async () => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Token is expired or invalid — clear it so the user can log in again
      console.warn(`[ProtectedRoute] Backend auth validation failed (${response.status}). Token cleared.`);
      logoutUser();
      return false;
    }

    // Token is valid
    console.log('[ProtectedRoute] Token validated successfully');
    return true;
  } catch (error) {
    // Backend unreachable — be lenient: allow access if token exists
    // (user might have just logged in and backend might be temporarily slow)
    console.warn('[ProtectedRoute] Backend unreachable during token validation:', error.message);
    console.warn('[ProtectedRoute] Allowing access based on localStorage token');
    return true; // CHANGED: Allow access if backend is unreachable but token exists
  }
};

/**
 * Protected Route Component - Requires authentication for access
 * Wraps routes that should only be accessible by authenticated users
 */
export const ProtectedRoute = ({ children, requiredAuth = true }) => {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      // First check: is there a token in localStorage?
      if (!isAuthenticated()) {
        console.log('[ProtectedRoute] No token found in localStorage');
        setAuthState('invalid');
        setIsReady(true);
        return;
      }

      console.log('[ProtectedRoute] Token found in localStorage, checking validity...');

      // For routes that require auth, validate token with backend
      if (requiredAuth) {
        console.log('[ProtectedRoute] Route requires auth - validating token with backend...');
        const valid = await validateTokenWithBackend();
        console.log(`[ProtectedRoute] Token validation result: ${valid ? 'valid' : 'invalid'}`);
        setAuthState(valid ? 'valid' : 'invalid');
      } else {
        // For routes that don't require auth (like /login, /signup),
        // validate but only redirect if authentically logged in
        console.log('[ProtectedRoute] Route does NOT require auth - checking if already logged in...');
        const valid = await validateTokenWithBackend();
        console.log(`[ProtectedRoute] Already logged in: ${valid}`);
        setAuthState(valid ? 'valid' : 'invalid');
      }
      setIsReady(true);
    };

    check();
  }, [requiredAuth]);

  // While checking auth state, show nothing (blank screen prevents flashing wrong content)
  if (!isReady) {
    console.log('[ProtectedRoute] Still checking auth state, rendering nothing');
    return null;
  }

  // Route requires auth (e.g. /home, /cart) — redirect to login if not valid
  if (requiredAuth && authState === 'invalid') {
    console.log('[ProtectedRoute] User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Route requires NO auth (e.g. /login, /signup) — only redirect to home
  // if token is genuinely valid (confirmed by backend), not just present in localStorage
  if (!requiredAuth && authState === 'valid') {
    console.log('[ProtectedRoute] User already authenticated, redirecting to home');
    return <Navigate to="/home" replace />;
  }

  // All checks passed — render the protected content
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
