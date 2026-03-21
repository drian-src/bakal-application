import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * AuthCallback
 *
 * Landing page for the Google OAuth redirect.
 * Flow: Google → backend → GET /auth/callback?token=JWT&user={encoded JSON}
 *
 * This component:
 * 1. Reads `token` and `user` from URL search params
 * 2. Stores them in localStorage using the same keys as authService.js
 * 3. Navigates to /home (replacing history so back button skips this page)
 *
 * On any error: shows a message and redirects to /login after 3 seconds.
 *
 * DO NOT wrap this route in ProtectedRoute — the token doesn't exist in
 * localStorage yet when this page loads, so ProtectedRoute would redirect
 * back to /login before the token can be stored.
 */
const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const errorParam = searchParams.get('error');

    // Case 1 — Backend sent an error param (OAuth failed on backend side)
    if (errorParam) {
      const errorMessages = {
        missing_code:          'Google sign-in was cancelled. Please try again.',
        token_exchange_failed: 'Could not connect with Google. Please try again.',
        email_not_verified:    'Your Google email address is not verified.',
        server_error:          'Something went wrong on our end. Please try again.',
      };
      const message = errorMessages[errorParam] || 'Sign-in failed. Please try again.';
      console.error(`[AuthCallback] OAuth error: ${errorParam}`);
      setError(message);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    // Case 2 — Missing token or user (malformed redirect)
    if (!token || !userParam) {
      console.error('[AuthCallback] Missing token or user param in callback URL');
      setError('Invalid sign-in response. Please try again.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    // Case 3 — Success: store token and user, then navigate to /home
    try {
      const user = JSON.parse(decodeURIComponent(userParam));

      // Use the EXACT same localStorage keys as authService.js:
      // AUTH_TOKEN_KEY = 'authToken'
      // CURRENT_USER_KEY = 'currentUser'
      // These keys are read by isAuthenticated(), getCurrentUser(), getAuthToken()
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(user));

      console.log(`[AuthCallback] Stored token and user: ${user.email}`);

      // Replace history entry so the back button skips /auth/callback
      // (going back from /home should go to the landing page, not back here)
      navigate('/home', { replace: true });

    } catch (parseErr) {
      console.error('[AuthCallback] Failed to parse user param:', parseErr);
      setError('Sign-in response was corrupted. Please try again.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }

  // Empty dependency array: run once on mount only.
  // searchParams and navigate are stable refs — safe to omit from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        gap:            '16px',
        fontFamily:     'var(--font-body, sans-serif)',
        background:     'var(--bg-primary, #ffffff)',
      }}>
        {/* Error card */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '10px',
          padding:       '14px 20px',
          borderRadius:  '8px',
          background:    'rgba(239, 68, 68, 0.08)',
          border:        '1.5px solid #ef4444',
          color:         '#dc2626',
          fontSize:      '14px',
          maxWidth:      '360px',
          textAlign:     'center',
        }}>
          {/* X icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{error}</span>
        </div>

        <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>
          Redirecting to login in 3 seconds...
        </p>
      </div>
    );
  }

  // ── Loading / success state (shown briefly before navigate fires) ─────────
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '100vh',
      gap:            '16px',
      fontFamily:     'var(--font-body, sans-serif)',
      background:     'var(--bg-primary, #ffffff)',
    }}>

      {/* Gold spinner — matches the app's accent color */}
      <div style={{
        width:           '40px',
        height:          '40px',
        border:          '3px solid #e5e7eb',
        borderTopColor:  'var(--accent-gold, #d4af37)',
        borderRadius:    '50%',
        animation:       'authcallback-spin 0.8s linear infinite',
      }} />

      {/* Inline keyframe — scoped name to avoid collision with other spinners */}
      <style>{`
        @keyframes authcallback-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
        Signing you in...
      </p>
    </div>
  );
};

export default AuthCallback;
