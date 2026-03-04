// Authentication Service - Calls real backend API for auth
// This service handles login, registration, and token management

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate email format
export const validateEmail = (email) => {
  return EMAIL_REGEX.test(email) && email.length <= 254;
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
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Login failed',
      };
    }

    // Store JWT token and user info from backend response
    const { user, token } = result.data;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    return {
      success: true,
      message: 'Login successful',
      user,
    };
  } catch (error) {
    console.error('Login error:', error);
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
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: fullName.trim(), email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Registration failed',
        code: 'REGISTRATION_FAILED'
      };
    }

    // Store JWT token and user info from backend response
    const { user, token } = result.data;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    return {
      success: true,
      message: 'Account created successfully! Welcome to Bakàl.',
      code: 'REGISTRATION_SUCCESS',
      user,
    };
  } catch (error) {
    console.error('Registration error:', error);
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
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
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