import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from './authService';

/**
 * Protected Route Component - Requires authentication for access
 * Wraps routes that should only be accessible by authenticated users
 */
export const ProtectedRoute = ({ children, requiredAuth = true }) => {
  const authenticated = isAuthenticated();

  // For routes that require authentication (e.g., /home, /profile)
  if (requiredAuth && !authenticated) {
    return <Navigate to="/login" replace />;
  }

  // For routes that should NOT be accessible when authenticated (e.g., /login, /signup)
  if (!requiredAuth && authenticated) {
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
