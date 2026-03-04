import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../../../shared';
import { useCart } from '../../../../core/hooks/useCart';
import { getCurrentUser } from '../../../../core/services/authService';
import './HomeHeader.css';

const HomeHeader = ({ hideSearch = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [imageSearchLabel, setImageSearchLabel] = useState('');
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === '/search';
  const { cartCount } = useCart();

  // Get current user and derive display name
  const user = getCurrentUser();
  const displayName = user?.name
    ?? user?.displayName
    ?? user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? null;
  const firstName = displayName ? displayName.split(' ')[0] : null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleBackClick = () => {
    navigate('/home');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleCartClick = () => {
    navigate('/cart');
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    // Browser support check
    if (!SpeechRecognition) {
      setVoiceError(
        'Voice search is not supported in this browser. Please use Chrome or Edge.'
      );
      setTimeout(() => setVoiceError(''), 5000);
      return;
    }

    // FIX: use window.location — NOT React Router's useLocation()
    // React Router's location object has no .protocol or .hostname properties
    const isSecureContext =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      setVoiceError('Voice search requires a secure connection (HTTPS).');
      setTimeout(() => setVoiceError(''), 5000);
      return;
    }

    // ── TOGGLE: if already listening, STOP ──────────────────────────────────
    if (isListening && recognitionRef.current) {
      console.log('[VoiceSearch] Stopping by user request');
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      // Keep whatever partial text was in the search bar
      return;
    }

    // ── START listening ─────────────────────────────────────────────────────
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';          // en-US is universally supported
    recognition.continuous = false;       // stop after first pause in speech
    recognition.interimResults = true;    // ← KEY: fire onresult during speech
    recognition.maxAlternatives = 1;

    // Store instance in ref so we can stop it from outside this function
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError('');
      console.log('[VoiceSearch] Started listening');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Loop through all results to build interim and final strings
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show live interim text in the search bar as the user speaks
      if (interimTranscript) {
        // FIX: Strip trailing punctuation that Chrome speech recognition adds automatically
        setSearchQuery(interimTranscript.replace(/[.,!?;:]+$/, ''));
      }

      // When a final result comes in, submit the search
      if (finalTranscript.trim()) {
        // FIX: Strip trailing punctuation that Chrome speech recognition adds automatically
        // e.g. "CPU." → "CPU", "gaming mouse," → "gaming mouse"
        const cleaned = finalTranscript.trim().replace(/[.,!?;:]+$/, '');
        console.log(`[VoiceSearch] Final: "${cleaned}" (original: "${finalTranscript.trim()}")`);
        setSearchQuery(cleaned);
        setIsListening(false);
        recognitionRef.current = null;
        navigate(`/search?q=${encodeURIComponent(cleaned)}`);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      console.error('[VoiceSearch] Error code:', event.error, '| Message:', event.message);

      const errorMessages = {
        'not-allowed':
          'Microphone access denied. Click the 🔒 icon in your address bar and allow microphone.',
        'no-speech':
          'No speech detected. Please speak clearly and try again.',
        'audio-capture':
          'No microphone found. Please connect a microphone and try again.',
        'network':
          'Network error. Voice search requires an internet connection (audio is processed online).',
        'aborted':
          '', // user stopped — show nothing
        'language-not-supported':
          'Language not supported. Please try again.',
        'service-not-allowed':
          'Voice search blocked. Please allow microphone access in browser settings.',
      };

      const message =
        errorMessages[event.error] !== undefined
          ? errorMessages[event.error]
          : `Voice search error (${event.error}). Please try again.`;

      if (message) {
        setVoiceError(message);
        setTimeout(() => setVoiceError(''), 5000);
      }
    };

    recognition.onend = () => {
      console.log('[VoiceSearch] Recognition ended');
      setIsListening(false);
      recognitionRef.current = null;
    };

    // Start — wrapped in try/catch for browsers that throw synchronously
    try {
      recognition.start();
    } catch (err) {
      console.error('[VoiceSearch] Failed to start:', err);
      setIsListening(false);
      recognitionRef.current = null;
      setVoiceError('Could not start voice search. Please check microphone permissions.');
      setTimeout(() => setVoiceError(''), 5000);
    }
  };

  /**
   * handleImageSearch — opens a file picker, reads the selected image filename,
   * cleans it into a product search query, and navigates to search results.
   * Uses only the browser FileReader API — no package, no server upload.
   *
   * Strategy: extract meaningful words from the filename.
   * e.g. "MSI-GeForce-RTX4090-Gaming-X.jpg" → "MSI GeForce RTX4090 Gaming X"
   * This works well for product photos saved from store pages.
   */
  const handleImageSearch = () => {
    // Create a hidden file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Extract search query from filename
      const rawName = file.name
        .replace(/\.[^/.]+$/, '')      // remove extension (.jpg, .png, etc.)
        .replace(/[-_]/g, ' ')         // replace dashes/underscores with spaces
        .replace(/\s+/g, ' ')          // collapse multiple spaces
        .trim();

      if (!rawName) {
        setVoiceError('Could not extract a search term from this image filename.');
        setTimeout(() => setVoiceError(''), 4000);
        return;
      }

      setImageSearchLabel(rawName);
      setSearchQuery(rawName);
      navigate(`/search?q=${encodeURIComponent(rawName)}`);

      // Cleanup
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  };

  return (
    <header className="home-header">
      <div className="header-container">
        {isSearchPage && (
          <button className="back-button" onClick={handleBackClick} title="Back to Home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        
        <div className="header-logo">
          <Logo size="xlarge" />
        </div>
        
        {!hideSearch && (
          <form className="header-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder={
                isListening
                  ? 'Listening... (click mic to stop)'
                  : 'Search products across all platforms...'
              }
              className="search-input"
              style={{ paddingRight: '88px' }} // make room for mic + photo + search button
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* ── Mic button ── */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              title={isListening ? 'Click to stop listening' : 'Search by voice (click to start)'}
              aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
              style={{
                position: 'absolute',
                right: '74px',           // sits left of the photo button
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                padding: '4px',
                color: isListening ? 'var(--accent-gold, #d4af37)' : '#9ca3af',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-gold, #d4af37)'; }}
              onMouseLeave={e => {
                if (!isListening) e.currentTarget.style.color = '#9ca3af';
              }}
            >
              {/* Mic SVG — animates to pulsing dot when listening */}
              {isListening ? (
                // Recording indicator — filled gold circle
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-gold, #d4af37)">
                  <circle cx="12" cy="12" r="8">
                    <animate attributeName="r" values="8;10;8" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
              ) : (
                // Static mic icon
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="9" y1="22" x2="15" y2="22" />
                </svg>
              )}
            </button>

            {/* ── Photo / Image button ── */}
            <button
              type="button"
              onClick={handleImageSearch}
              title="Search by image"
              aria-label="Image search"
              style={{
                position: 'absolute',
                right: '46px',           // sits left of the gold Search button
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                padding: '4px',
                color: '#9ca3af',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-gold, #d4af37)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
            >
              {/* Minimalist camera/image SVG */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <circle cx="12" cy="13" r="3" />
                <path d="M8 6l1.5-2h5L16 6" />
              </svg>
            </button>

            {/* ── Subtle vertical divider ── */}
            <span className="search-icon-divider" aria-hidden="true" />

            {/* ── Existing Search button — DO NOT CHANGE its className or styles ── */}
            <button type="submit" className="search-button" title="Search">
              Search
            </button>

            {/* ── Voice/image error tooltip ── */}
            {voiceError && (
              <div
                role="alert"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  background: '#1f2937',
                  color: '#f9fafb',
                  fontSize: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  zIndex: 200,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  lineHeight: '1.5',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                {/* Warning icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '1px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>{voiceError}</span>
              </div>
            )}
          </form>
        )}
        
        <div className="header-profile">
          <div className="cart-icon-wrapper" onClick={handleCartClick} title="View Cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>

          {/* Profile pill — avatar + name */}
          <div className="profile-pill" onClick={handleProfileClick} title={displayName ? `${displayName} - View Profile` : 'View Profile'}>
            <div className="profile-avatar">
              <span className="profile-avatar-letter">
                {firstName ? firstName.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            {firstName && (
              <span className="profile-name">{firstName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Screen-reader announcement for voice search state */}
      <span
        role="status"
        aria-live="polite"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {isListening ? 'Listening for your search. Please speak now.' : ''}
      </span>
    </header>
  );
};

export default HomeHeader;