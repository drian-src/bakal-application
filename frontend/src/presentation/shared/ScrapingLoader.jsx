import { useState, useEffect } from 'react';
import { Search, Cpu, Zap, Loader } from 'lucide-react';

const STORES = [
  { name: 'PCExpress', icon: '🖥️' },
  { name: 'VillMan', icon: '🛒' },
  { name: 'PCWorx', icon: '⚙️' },
];

// Rotating messages shown during scraping — feel dynamic and real
const SCRAPING_MESSAGES = [
  'Scanning product listings...',
  'Comparing prices across stores...',
  'Filtering best matches for you...',
  'Running AI recommendations...',
  'Almost there, fetching final results...',
  'Sorting by relevance and rating...',
];

export default function ScrapingLoader({ query = '', stores = STORES }) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [storeProgress, setStoreProgress] = useState(
    stores.map((s) => ({ ...s, done: false, items: 0 }))
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rotate through status messages every 2.5 seconds
  useEffect(() => {
    const msgInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % SCRAPING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(msgInterval);
  }, []);

  // Simulate per-store progress animation (purely visual — does not affect real data)
  useEffect(() => {
    const timers = stores.map((store, index) => {
      // Each store "completes" at a staggered interval for visual effect
      const delay = 1500 + index * 1800; // 1.5s, 3.3s, 5.1s
      return setTimeout(() => {
        setStoreProgress((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, done: true, items: Math.floor(Math.random() * 30) + 10 }
              : s
          )
        );
      }, delay);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = storeProgress.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / stores.length) * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '48px 24px',
        width: '100%',
      }}
    >
      {/* ── TOP: Animated search icon ── */}
      <div
        style={{
          position: 'relative',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pulsing ring */}
        <div
          style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '2px solid var(--primary, #0a1a3a)',
            opacity: 0.3,
            animation: 'scrapePulse 1.8s ease-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '2px solid var(--primary, #0a1a3a)',
            opacity: 0.15,
            animation: 'scrapePulse 1.8s ease-out infinite 0.4s',
          }}
        />
        {/* Core icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--primary, #0a1a3a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(10,26,58,0.35)',
            animation: 'scrapeIconFloat 3s ease-in-out infinite',
          }}
        >
          <Search size={26} color="white" />
        </div>
      </div>

      {/* ── QUERY DISPLAY ── */}
      <h2
        style={{
          fontSize: 'clamp(18px, 3vw, 24px)',
          fontWeight: '700',
          margin: '0 0 6px',
          color: 'var(--text-dark, #111827)',
          textAlign: 'center',
          letterSpacing: '-0.3px',
        }}
      >
        Searching for{' '}
        <span
          style={{
            color: 'var(--primary, #0a1a3a)',
            background: 'var(--scraping-badge-bg, rgba(10,26,58,0.08))',
            padding: '2px 10px',
            borderRadius: '6px',
          }}
        >
          "{query}"
        </span>
      </h2>

      {/* ── ROTATING STATUS MESSAGE ── */}
      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-light, #6B7280)',
          margin: '0 0 40px',
          textAlign: 'center',
          minHeight: '20px',
          transition: 'opacity 0.4s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <Zap size={13} style={{ color: 'var(--primary, #0a1a3a)' }} />
        {SCRAPING_MESSAGES[currentMessage]}
      </p>

      {/* ── STORE PROGRESS CARDS ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '16px',
          marginBottom: '40px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '560px',
        }}
      >
        {storeProgress.map((store, index) => (
          <div
            key={store.name}
            style={{
              flex: '1',
              minWidth: '140px',
              padding: '16px',
              borderRadius: 'var(--radius-lg, 12px)',
              background: 'var(--bg-white, #fff)',
              border: store.done
                ? `2px solid ${getStoreColor(store.name)}`
                : '2px solid var(--border, #E5E7EB)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: store.done ? 'translateY(-3px)' : 'translateY(0)',
              boxShadow: store.done
                ? `0 4px 20px ${getStoreColor(store.name)}22`
                : 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
              animation: !store.done
                ? `storeSkeleton 1.5s ease-in-out infinite ${index * 0.3}s`
                : 'none',
            }}
          >
            <span style={{ fontSize: '22px' }}>{store.icon}</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: store.done
                  ? getStoreColor(store.name)
                  : 'var(--text-light, #6B7280)',
              }}
            >
              {store.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {store.done ? (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={getStoreColor(store.name)}
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    style={{
                      fontSize: '12px',
                      color: getStoreColor(store.name),
                      fontWeight: '600',
                    }}
                  >
                    {store.items} found
                  </span>
                </>
              ) : (
                <>
                  <Loader
                    size={14}
                    color="var(--text-lighter, #9CA3AF)"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-lighter, #9CA3AF)' }}>
                    Scanning...
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── PROGRESS BAR ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-light, #6B7280)' }}>
            {completedCount} of {stores.length} stores scanned
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-light, #6B7280)' }}>
            {progressPercent}%
          </span>
        </div>
        {/* Track */}
        <div
          style={{
            height: '6px',
            background: 'var(--border, #E5E7EB)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          {/* Fill */}
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, var(--primary, #0a1a3a), var(--primary-dark, #806286))',
              borderRadius: '999px',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px var(--primary, #0a1a3a)',
            }}
          />
        </div>
      </div>

      {/* ── ELAPSED TIME ── */}
      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-lighter, #9CA3AF)',
          margin: '0',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <Cpu size={11} />
        AI processing · {elapsedSeconds}s elapsed
      </p>

      {/* ── SKELETON PREVIEW CARDS (below the loader) ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          marginTop: '48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          opacity: 0.5,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 'var(--radius-lg, 12px)',
              background: 'var(--bg-white, #fff)',
              border: '1px solid var(--border, #E5E7EB)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              animation: `storeSkeleton 1.8s ease-in-out infinite ${i * 0.15}s`,
            }}
          >
            {/* Image placeholder */}
            <div
              style={{
                height: '120px',
                borderRadius: '8px',
                background: 'var(--scraping-skeleton, #f3f4f6)',
              }}
            />
            {/* Title placeholder */}
            <div
              style={{
                height: '12px',
                borderRadius: '6px',
                background: 'var(--scraping-skeleton, #f3f4f6)',
                width: '85%',
              }}
            />
            <div
              style={{
                height: '12px',
                borderRadius: '6px',
                background: 'var(--scraping-skeleton, #f3f4f6)',
                width: '60%',
              }}
            />
            {/* Price placeholder */}
            <div
              style={{
                height: '18px',
                borderRadius: '6px',
                background: 'var(--scraping-skeleton, #f3f4f6)',
                width: '40%',
                marginTop: '4px',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── KEYFRAME STYLES ── */}
      <style>{`
        @keyframes scrapePulse {
          0% { transform: scale(0.95); opacity: 0.4; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes scrapeIconFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes storeSkeleton {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Helper function to get store colors matching the platform colors in the app
function getStoreColor(storeName) {
  const colors = {
    PCExpress: '#004080',
    VillMan: '#008000',
    PCWorx: '#800080',
  };
  return colors[storeName] || '#0a1a3a';
}
