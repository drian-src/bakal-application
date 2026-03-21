import React, { useRef } from 'react';
import RecommendationCard from './RecommendationCard';
import { useRecommendations } from '../../../core/hooks/useRecommendations';

/**
 * SkeletonCard
 * Local component (not exported) that renders a pulsing placeholder card
 * while recommendations are being fetched.
 * Matches the exact dimensions of RecommendationCard (160px wide).
 */
const SkeletonCard = () => (
  <div
    style={{
      width: '180px',
      flexShrink: 0,
      borderRadius: '10px',
      border: '1.5px solid var(--border-color, #e5e7eb)',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    {[120, 12, 40, 20, 16].map((h, i) => (
      <div
        key={i}
        style={{
          height: `${h}px`,
          borderRadius: '6px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'rec-shimmer 1.4s ease-in-out infinite',
        }}
      />
    ))}
  </div>
);

/**
 * RecommendationSection
 * 
 * Displays a horizontal scrollable section of personalized product recommendations
 * for the logged-in user. Uses the useRecommendations hook for data fetching.
 * 
 * Shows skeleton loading cards during fetch, and returns null if no recommendations
 * exist and loading is complete (invisible section, not a blank container).
 * 
 * @returns {React.ReactElement|null}
 * 
 * @example
 * // In HomePage.jsx:
 * import RecommendationSection from './recommendations/RecommendationSection';
 * 
 * export const HomePage = () => {
 *   return (
 *     <main>
 *       <CategoriesGrid />
 *       <RecommendationSection />  // Renders only if recommendations exist
 *       <Products />
 *     </main>
 *   );
 * };
 */
const RecommendationSection = () => {
  const { recommendations, loading } = useRecommendations(10);

  // Ref for the horizontal scroll container — used by Previous/Next buttons
  const scrollRef = useRef(null);

  // Scroll left by one card width (184px = 180px card + 12px gap - 8px buffer)
  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -184, behavior: 'smooth' });
    }
  };

  // Scroll right by one card width
  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 184, behavior: 'smooth' });
    }
  };

  // Render nothing if loading is complete and no recommendations exist
  if (!loading && recommendations.length === 0) return null;

  return (
    <section style={{ padding: '16px 0' }}>
      {/* Keyframe animation for shimmer effect during loading */}
      <style>{`
        @keyframes rec-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Section Header — title + Previous/Next arrow buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '0 16px',
        }}
      >
        {/* Left: Sparkle icon + section title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="var(--accent-gold, #d4af37)"
          >
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '700',
              color: 'var(--text-primary, #111827)',
            }}
          >
            Personalized Recommended Products
          </h2>
        </div>

        {/* Right: Previous / Next arrow buttons */}
        {!loading && recommendations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Previous (left arrow) button */}
            <button
              onClick={handleScrollLeft}
              aria-label="Scroll recommendations left"
              title="Previous"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1.5px solid var(--border-color, #e5e7eb)',
                background: 'var(--card-bg, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'var(--text-muted, #6b7280)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-gold, #d4af37)';
                e.currentTarget.style.color = 'var(--accent-gold, #d4af37)';
                e.currentTarget.style.background = 'rgba(212,175,55,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)';
                e.currentTarget.style.color = 'var(--text-muted, #6b7280)';
                e.currentTarget.style.background = 'var(--card-bg, #ffffff)';
              }}
            >
              {/* Left chevron SVG */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {/* Next (right arrow) button */}
            <button
              onClick={handleScrollRight}
              aria-label="Scroll recommendations right"
              title="Next"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1.5px solid var(--border-color, #e5e7eb)',
                background: 'var(--card-bg, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'var(--text-muted, #6b7280)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-gold, #d4af37)';
                e.currentTarget.style.color = 'var(--accent-gold, #d4af37)';
                e.currentTarget.style.background = 'rgba(212,175,55,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)';
                e.currentTarget.style.color = 'var(--text-muted, #6b7280)';
                e.currentTarget.style.background = 'var(--card-bg, #ffffff)';
              }}
            >
              {/* Right chevron SVG */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Scrollable Container — ref attached for arrow button control */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          padding: '4px 16px 12px',
          scrollbarWidth: 'none',
          scrollBehavior: 'smooth',
        }}
      >
        {loading ? (
          // Show 4 skeleton cards while loading
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          // Show recommendation cards once loaded
          recommendations.map((rec) => (
            <RecommendationCard
              key={rec.product?.id}
              product={rec.product}
              explanation={rec.explanation}
              reasonType={rec.reasonType}
              score={rec.score}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default RecommendationSection;
