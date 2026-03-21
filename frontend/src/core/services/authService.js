// Authentication Service - Calls real backend API for auth
// This service handles login, registration, and token management

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

// Whitelist of valid email domains (known providers only)
const VALID_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'ymail.com',
  'zoho.com',
  'mailinator.com'
]);

// Email validation - whitelist of known domains only
export const validateEmail = (email) => {
  // Must be a string
  if (typeof email !== 'string') return false;
  
  email = email.trim().toLowerCase();
  
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Check length constraints
  if (email.length > 254) return false;
  
  // Extract domain
  const [localPart, domain] = email.split('@');
  
  // Local part must not exceed 64 chars
  if (localPart.length > 64) return false;
  
  // Domain must be in whitelist
  if (!VALID_EMAIL_DOMAINS.has(domain)) {
    return false;
  }
  
  return true;
};

// Validate password strength
export const validatePassword = (password) => {
  return {
    isValid: password.length >= 8,
    strength: getPasswordStrength(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
};

// Get password strength level
const getPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
  
  if (strength <= 1) return 'weak';
  if (strength <= 2) return 'fair';
  if (strength <= 3) return 'good';
  return 'strong';
};

// Call backend API for login
export const loginUser = async (email, password) => {
  try {
    console.log('[loginUser] Attempting login for:', email);
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    console.log('[loginUser] Response status:', response.status);

    if (!response.ok) {
      console.error('[loginUser] Login failed:', result.message);
      return {
        success: false,
        message: result.message || 'Login failed',
      };
    }

    // Store JWT token and user info from backend response
    const { user, token } = result.data;
    if (!token || !user) {
      console.error('[loginUser] Response missing token or user:', result);
      return {
        success: false,
        message: 'Invalid response from server',
      };
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    console.log('[loginUser] Login successful, token stored');

    return {
      success: true,
      message: 'Login successful',
      user,
    };
  } catch (error) {
    console.error('[loginUser] Network error:', error.message);
    return {
      success: false,
      message: 'Connection error. Please check if backend is running.',
    };
  }
};

// Call backend API for registration
export const registerUser = async (fullName, email, password) => {
  // Client-side validation
  if (!fullName || fullName.trim().length === 0) {
    return {
      success: false,
      message: 'Full name is required.',
      code: 'INVALID_NAME'
    };
  }

  if (!validateEmail(email)) {
    return {
      success: false,
      message: 'Please enter a valid email address.',
      code: 'INVALID_EMAIL'
    };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return {
      success: false,
      message: 'Password must be at least 6 characters long.',
      code: 'INVALID_PASSWORD'
    };
  }

  try {
    console.log('[registerUser] Attempting registration for:', email);
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: fullName.trim(), email, password }),
    });

    const result = await response.json();
    console.log('[registerUser] Response status:', response.status);

    if (!response.ok) {
      console.error('[registerUser] Registration failed:', result.message);
      return {
        success: false,
        message: result.message || 'Registration failed',
        code: 'REGISTRATION_FAILED'
      };
    }

    // Store JWT token and user info from backend response
    const { user, token } = result.data;
    if (!token || !user) {
      console.error('[registerUser] Response missing token or user:', result);
      return {
        success: false,
        message: 'Invalid response from server',
        code: 'REGISTRATION_FAILED'
      };
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    console.log('[registerUser] Registration successful, token stored');

    return {
      success: true,
      message: 'Account created successfully! Welcome to Bakàl.',
      code: 'REGISTRATION_SUCCESS',
      user,
    };
  } catch (error) {
    console.error('[registerUser] Network error:', error.message);
    return {
      success: false,
      message: 'Connection error. Please check if backend is running.',
      code: 'REGISTRATION_FAILED'
    };
  }
};

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (userStr && token) {
      const user = JSON.parse(userStr);

      // Normalize avatar field across two possible formats:
      // - 'avatarUrl'   (camelCase) — set by AuthCallback.jsx from Google OAuth
      // - 'avatar_url'  (snake_case) — may exist in older localStorage entries
      // Components always read user.avatarUrl — never user.avatar_url directly
      return {
        ...user,
        avatarUrl: user.avatarUrl ?? user.avatar_url ?? null,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Clear invalid user credentials (for migration - remove users with invalid email domains)
export const clearInvalidUsers = () => {
  try {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    if (userStr && token) {
      const user = JSON.parse(userStr);
      if (user.email && !validateEmail(user.email)) {
        console.log('[authService] Clearing user with invalid email:', user.email);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        return true; // Cleared invalid user
      }
    }
    return false; // No invalid user to clear
  } catch (error) {
    console.error('Error clearing invalid users:', error);
    return false;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY) !== null;
};

// Get auth token from localStorage
export const getAuthToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// Logout user
export const logoutUser = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  return {
    success: true,
    message: 'Logged out successfully.',
    code: 'LOGOUT_SUCCESS'
  };
};

export default {
  registerUser,
  loginUser,
  getCurrentUser,
  isAuthenticated,
  logoutUser,
  validateEmail,
  validatePassword,
  getAuthToken};