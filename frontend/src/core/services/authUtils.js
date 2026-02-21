import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from './authService';

// Protected Route Component
export const ProtectedRoute = ({ children, requiredAuth = true }) => {
  const authenticated = isAuthenticated();
  const currentUser = getCurrentUser();

  if (requiredAuth && !authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredAuth && authenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

// Auth State Hook
export const useAuthState = () => {
  const [authState, setAuthState] = React.useState(() => {
    return {
      isAuthenticated: isAuthenticated(),
      user: getCurrentUser(),
      isLoading: false
    };
  });

  const updateAuthState = React.useCallback(() => {
    setAuthState({
      isAuthenticated: isAuthenticated(),
      user: getCurrentUser(),
      isLoading: false
    });
  }, []);

  return { ...authState, updateAuthState };
};

// Check if user has access to a specific platform
export const canAccessPlatform = (platformName) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  return user.platforms && user.platforms.includes(platformName);
};

export default {
  ProtectedRoute,
  useAuthState,
  canAccessPlatform
};
