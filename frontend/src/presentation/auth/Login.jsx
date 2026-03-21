import React, { useState, useEffect } from 'react';
import AuthLayout from '../layouts/AuthLayout';
import { Logo } from '../shared';
import './Auth.css';

/**
 * Login — Google-only sign-in page.
 *
 * Clicking "Continue with Google" redirects the browser to the backend
 * OAuth route (GET /api/auth/google), which redirects to Google's consent
 * screen. After consent, Google → backend → /auth/callback → /home.
 *
 * Email/password login has been removed. Do not re-add it.
 *
 * Error handling: if the backend OAuth flow fails, it redirects back to
 * /login?error=<code>. This component reads that param on mount and shows
 * a user-friendly message.
 */
const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  // Read error param from URL on mount
  // Backend sets this on OAuth failure: /login?error=token_exchange_failed
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');

    if (errorParam) {
      const errorMessages = {
        missing_code:          'Sign-in was cancelled. Please try again.',
        token_exchange_failed: 'Could not connect with Google. Please try again.',
        email_not_verified:    'Your Google email address is not verified.',
        server_error:          'Something went wrong on our end. Please try again.',
      };
      setError(errorMessages[errorParam] || 'Sign-in failed. Please try again.');

      // Clean the URL so refreshing the page doesn't re-show the error
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setError('');
    // Full page redirect to backend — backend handles OAuth flow from here
    // VITE_API_URL is defined in frontend/.env as http://localhost:3000/api
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <AuthLayout>

      {/* Header — reuses existing Auth.css classes */}
      <div className="auth-header">
        <div className="auth-logo">
          <Logo size="xlarge" />
        </div>
        <h1 className="auth-title">Welcome to Bakàl</h1>
        <p className="auth-subtitle">
          Sign in with your Google account to start shopping smarter
        </p>
      </div>

      {/* Form area — reuses existing .auth-form class */}
      <div className="auth-form">

        {/* Error message — reuses existing .auth-error class */}
        {error && (
          <div className="auth-error">
            <span>✕</span> {error}
          </div>
        )}

        {/* ── Google Sign-In Button ─────────────────────────────────── */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'center',
            gap:         '12px',
            width:       '100%',
            padding:     '12px 24px',
            borderRadius: '8px',
            border:      '1.5px solid #e5e7eb',
            background:  isLoading ? '#f9fafb' : '#ffffff',
            color:       '#374151',
            fontSize:    '15px',
            fontWeight:  '600',
            cursor:      isLoading ? 'not-allowed' : 'pointer',
            transition:  'all 0.2s ease',
            boxShadow:   '0 1px 3px rgba(0,0,0,0.08)',
            fontFamily:  'var(--font-body, sans-serif)',
          }}
          onMouseEnter={e => {
            if (!isLoading) {
              e.currentTarget.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.12)';
              e.currentTarget.style.borderColor = '#d1d5db';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow   = '0 1px 3px rgba(0,0,0,0.08)';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          {isLoading ? (
            /* Loading spinner while redirecting to Google */
            <div style={{
              width:          '20px',
              height:         '20px',
              border:         '2px solid #e5e7eb',
              borderTopColor: '#4285f4',
              borderRadius:   '50%',
              animation:      'login-spin 0.7s linear infinite',
              flexShrink:     0,
            }} />
          ) : (
            /* Official Google "G" logo — exact brand colors, do not change */
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}

          <span>{isLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Scoped keyframe — named 'login-spin' to avoid collision with other
            @keyframes spin declarations elsewhere in the app */}
        <style>{`
          @keyframes login-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Legal note */}
        <p style={{
          textAlign:  'center',
          fontSize:   '12px',
          color:      '#9ca3af',
          margin:     '16px 0 0',
          lineHeight: '1.5',
        }}>
          By signing in, you agree to our Terms of Service.<br />
          We only use your Google account to identify you.
        </p>

      </div>
    </AuthLayout>
  );
};

export default Login;