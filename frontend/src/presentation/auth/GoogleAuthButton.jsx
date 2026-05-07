import React, { useEffect, useRef } from 'react';
import { useNotification } from '../shared';
import { handleGoogleAuth } from '../../core/services/authService';
import { loadGoogleScript, initializeGoogleSignIn } from '../../core/services/googleAuthService';
import './GoogleAuthButton.css';

const GoogleAuthButton = ({ 
  onSuccess, 
  onError, 
  mode = 'signin',
  disabled = false,
  text = 'Continue with Google'
}) => {
  const { success, error: showError } = useNotification();
  const containerRef = useRef(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || disabled) return;
    initRef.current = true;

    const initGoogleAuth = async () => {
      try {
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

        // Skip initialization if no client ID is configured
        if (!clientId || clientId === 'your_google_client_id_here') {
          return;
        }

        await loadGoogleScript();

        // Set up Google Sign-In callback
        const handleSuccess = (googleUserData) => {
          const result = handleGoogleAuth(googleUserData);
          
          if (result.success) {
            success(result.message);
            onSuccess?.(result.user);
          } else {
            showError(result.message);
            onError?.(result.message);
          }
        };

        const handleError = (error) => {
          console.error('Google auth error:', error);
          onError?.(error);
        };

        initializeGoogleSignIn(clientId, handleSuccess, handleError);
      } catch (error) {
        console.error('Error initializing Google Auth:', error);
      }
    };

    initGoogleAuth();
  }, [disabled, onSuccess, onError, success, showError]);

  const handleClick = () => {
    if (disabled) return;

    // Show message about Google being unconfigured
    if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      showError('Google authentication is not configured. Please use email/password to sign in.');
      return;
    }
  };

  return (
    <div className="google-auth-button-wrapper">
      <button
        type="button"
        className="google-auth-button"
        onClick={handleClick}
        disabled={disabled}
        title="Sign in with Google"
      >
        <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="google-text">{text}</span>
      </button>
      <div ref={containerRef} id="google-sign-in-button" className="google-button-container"></div>
    </div>
  );
};

export default GoogleAuthButton;
