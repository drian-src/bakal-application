import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeHeader.css'; // reuse header styles for consistency

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [imageSearchLabel, setImageSearchLabel] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice search is not supported in this browser. Try Chrome or Edge.');
      setTimeout(() => setVoiceError(''), 4000);
      return;
    }

    // Secure context check — Web Speech API requires HTTPS (or localhost)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setVoiceError('Voice search requires a secure connection (HTTPS).');
      setTimeout(() => setVoiceError(''), 5000);
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();

    // FIX 1: Use 'en-US' instead of 'en-PH' — universally supported across all browsers
    // 'en-PH' is not in Chrome's supported language list and causes a generic error
    recognition.lang = 'en-US';

    // FIX 2: Set continuous to false and interimResults to false for reliability
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError('');
      console.log('[VoiceSearch] Started listening');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      const confidence = event.results[0][0].confidence;
      console.log(`[VoiceSearch] Heard: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

      if (transcript) {
        setSearchQuery(transcript);
        navigate(`/search?q=${encodeURIComponent(transcript)}`);
      }
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      console.error('[VoiceSearch] Error code:', event.error, '| Message:', event.message);

      // FIX 3: Map every known error code to a clear user message
      const errorMessages = {
        'not-allowed':      'Microphone access denied. Click the 🔒 icon in your browser bar and allow microphone.',
        'no-speech':        'No speech detected. Please speak closer to the microphone and try again.',
        'audio-capture':    'No microphone found. Please connect a microphone and try again.',
        'network':          'Network error. Voice search requires an internet connection.',
        'aborted':          'Voice search was cancelled.',
        'language-not-supported': 'Language not supported. Please try again.',
        'service-not-allowed':    'Voice search is blocked. Please allow microphone access in your browser settings.',
        'bad-grammar':      'Could not understand. Please try again.',
      };

      const message = errorMessages[event.error]
        || `Voice search error (${event.error}). Please try again.`;

      setVoiceError(message);
      setTimeout(() => setVoiceError(''), 5000);
    };

    recognition.onend = () => {
      console.log('[VoiceSearch] Recognition ended');
      setIsListening(false);
    };

    // FIX 4: Wrap start() in try-catch — some browsers throw synchronously
    try {
      recognition.start();
    } catch (err) {
      console.error('[VoiceSearch] Failed to start:', err);
      setIsListening(false);
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
    <form className="header-search large-search" onSubmit={handleSearch}>
      <input
        type="text"
        placeholder={
          isListening
            ? 'Listening...'
            : 'Search for electronics...'
        }
        className="search-input"
        style={{ paddingRight: '100px' }} // make room for mic + photo + search button on large search
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* ── Mic button ── */}
      <button
        type="button"
        onClick={handleVoiceSearch}
        title={isListening ? 'Listening...' : 'Search by voice'}
        aria-label="Voice search"
        style={{
          position: 'absolute',
          right: '82px',           // sits left of the photo button
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
          right: '54px',           // sits left of the gold Search button
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
  );
};

export default SearchBar;
