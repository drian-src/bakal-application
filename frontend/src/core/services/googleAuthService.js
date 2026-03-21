// Google OAuth Integration Service
// This provides utilities for integrating Google Sign-In/Sign-Up

// Load Google API script dynamically
export const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if (window.google) {
      resolve(window.google);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google) {
        resolve(window.google);
      } else {
        reject(new Error('Google library failed to load'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google library'));
    };

    document.head.appendChild(script);
  });
};

// Initialize Google Sign-In
export const initializeGoogleSignIn = (clientId, onSuccess, onError) => {
  if (!clientId) {
    console.error('Google Client ID is required');
    return;
  }

  try {
    if (!window.google) {
      console.error('Google library not loaded');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleSignInResponse(onSuccess, onError)
    });
  } catch (error) {
    console.error('Error initializing Google Sign-In:', error);
    onError?.(error);
  }
};

// Handle Google Sign-In response
const handleGoogleSignInResponse = (onSuccess, onError) => {
  return (response) => {
    if (response.credential) {
      // Decode JWT token
      try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        const googleUserData = JSON.parse(jsonPayload);
        
        onSuccess?.({
          id: googleUserData.sub,
          email: googleUserData.email,
          name: googleUserData.name,
          picture: googleUserData.picture,
          email_verified: googleUserData.email_verified
        });
      } catch (error) {
        console.error('Error decoding Google token:', error);
        onError?.(error);
      }
    } else {
      onError?.(new Error('No credential received from Google'));
    }
  };
};

// Render Google Sign-In button
export const renderGoogleSignInButton = (elementId, options = {}) => {
  try {
    if (!window.google) {
      console.error('Google library not loaded');
      return false;
    }

    const defaultOptions = {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      ...options
    };

    window.google.accounts.id.renderButton(
      document.getElementById(elementId),
      defaultOptions
    );

    return true;
  } catch (error) {
    console.error('Error rendering Google button:', error);
    return false;
  }
};

// Sign out from Google
export const signOutGoogle = () => {
  try {
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
      return true;
    }
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
  return false;
};

export default {
  loadGoogleScript,
  initializeGoogleSignIn,
  renderGoogleSignInButton,
  signOutGoogle
};
