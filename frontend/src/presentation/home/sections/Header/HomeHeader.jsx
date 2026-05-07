import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
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

    if (!SpeechRecognition) {
      setVoiceError(
        'Voice search is not supported in this browser. Please use Chrome or Edge.'
      );
      setTimeout(() => setVoiceError(''), 5000);
      return;
    }

    const isSecureContext =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      setVoiceError('Voice search requires a secure connection (HTTPS).');
      setTimeout(() => setVoiceError(''), 5000);
      return;
    }

    if (isListening && recognitionRef.current) {
      console.log('[VoiceSearch] Stopping by user request');
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError('');
      console.log('[VoiceSearch] Started listening');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setSearchQuery(interimTranscript.replace(/[.,!?;:]+$/, ''));
      }

      if (finalTranscript.trim()) {
        const cleaned = finalTranscript.trim().replace(/[.,!?;:]+$/, '');
        console.log('[VoiceSearch] Final:', cleaned);
        setSearchQuery(cleaned);
        setIsListening(false);
        recognitionRef.current = null;
        navigate(`/search?q=${encodeURIComponent(cleaned)}`);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      console.error('[VoiceSearch] Error:', event.error);

      const errorMessages = {
        'not-allowed': 'Microphone access denied. Click the lock icon and allow microphone.',
        'no-speech': 'No speech detected. Please speak clearly and try again.',
        'audio-capture': 'No microphone found. Please connect a microphone.',
        'network': 'Network error. Voice search requires internet.',
        'aborted': '',
        'language-not-supported': 'Language not supported. Please try again.',
        'service-not-allowed': 'Voice search blocked. Allow microphone in settings.',
      };

      const message = errorMessages[event.error] ?? 'Voice search error occurred.';

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

    try {
      recognition.start();
    } catch (err) {
      console.error('[VoiceSearch] Failed to start:', err);
      setIsListening(false);
      recognitionRef.current = null;
      setVoiceError('Could not start voice search.');
      setTimeout(() => setVoiceError(''), 5000);
    }
  };

  const handleImageSearch = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const rawName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!rawName) {
        setVoiceError('Could not extract search term from filename.');
        setTimeout(() => setVoiceError(''), 4000);
        return;
      }

      setImageSearchLabel(rawName);
      setSearchQuery(rawName);
      navigate(`/search?q=${encodeURIComponent(rawName)}`);

      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  };

  return (
    <header className="home-header">
      <div className="header-container">
        {isSearchPage && (
          <button className="back-button" onClick={handleBackClick} title="Back to Home" aria-label="Back to Home">
            <Home size={24} strokeWidth={1.5} />
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="search-actions">
              <button
                type="button"
                className={`voice-search ${isListening ? 'listening' : ''}`}
                onClick={handleVoiceSearch}
                title={isListening ? 'Click to stop listening' : 'Search by voice'}
                aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
              >
                {isListening ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent-gold, #d4af37)">
                    <circle cx="12" cy="12" r="8">
                      <animate attributeName="r" values="8;10;8" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="9" y1="22" x2="15" y2="22" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className="image-search"
                onClick={handleImageSearch}
                title="Search by image"
                aria-label="Image search"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="14" rx="2" />
                  <circle cx="12" cy="13" r="3" />
                  <path d="M8 6l1.5-2h5L16 6" />
                </svg>
              </button>

              <button type="submit" className="search-button" title="Search">
                Search
              </button>
            </div>

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
              <span className="cart-badge">{cartCount}</span>
            )}
          </div>
          <button
            className="profile-icon"
            onClick={handleProfileClick}
            aria-label="Profile"
            title="Go to profile"
            style={{
              overflow: 'hidden',
              position: 'relative',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Google profile picture — shown when avatarUrl exists */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={firstName ?? 'Profile'}
                style={{
                  width:        '100%',
                  height:       '100%',
                  objectFit:    'cover',
                  borderRadius: '50%',
                  display:      'block',
                }}
                onError={e => {
                  // Google profile picture failed to load (expired URL, network error, etc.)
                  // Hide the broken image and show the initial letter fallback instead
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}

            {/* Initial letter fallback — shown when no avatarUrl OR image fails to load */}
            <span
              style={{
                display: user?.avatarUrl ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                background: 'var(--bg-secondary, #f3f4f6)',
                borderRadius: '50%',
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
              }}
            >
              {firstName ? firstName.charAt(0).toUpperCase() : '?'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
