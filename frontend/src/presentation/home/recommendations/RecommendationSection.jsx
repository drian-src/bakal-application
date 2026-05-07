import React, { useRef, useState } from 'react';
import RecommendationCard from './RecommendationCard';
import ProductQuickViewModal from '../../shared/ProductQuickViewModal';
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

  // Ref for the horizontal scroll container
  const scrollRef = useRef(null);

  // State for product quick-view modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const isModalOpen = selectedProduct !== null;

  // Handler for when user clicks a recommendation card
  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  // Handler to close modal
  const handleCloseModal = () => {
    setSelectedProduct(null);
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
        
        /* Custom scrollbar styling */
        .recommendations-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: var(--accent-gold, #d4af37) rgba(212, 175, 55, 0.1);
        }
        
        .recommendations-scroll-container::-webkit-scrollbar {
          height: 12px;
        }
        
        .recommendations-scroll-container::-webkit-scrollbar-track {
          background: linear-gradient(90deg, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.08) 50%, rgba(212, 175, 55, 0.05) 100%);
          border-radius: 10px;
          margin: 0 16px;
        }
        
        .recommendations-scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--accent-gold, #d4af37) 0%, #c29b2a 100%);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
          box-shadow: 0 0 6px rgba(212, 175, 55, 0.3);
          transition: all 0.2s ease;
        }
        
        .recommendations-scroll-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #e5c158 0%, #d4af37 100%);
          background-clip: content-box;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.6);
        }
        
        .recommendations-scroll-container::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #d4af37 0%, #aa8c2a 100%);
          background-clip: content-box;
          box-shadow: 0 0 4px rgba(212, 175, 55, 0.8);
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
      </div>

      {/* Horizontal Scrollable Container with visible scrollbar */}
      <div
        ref={scrollRef}
        className="recommendations-scroll-container"
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          padding: '4px 16px 12px',
          scrollBehavior: 'smooth',
        }}
      >
        {loading ? (
          // Show 4 skeleton cards while loading
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          // Show recommendation cards once loaded
          recommendations.map((rec) => (
              <RecommendationCard key={rec.id ??rec.product?.id}
              product={rec.product}
              explanation={rec.explanation}
              reasonType={rec.reasonType}
              score={rec.score}
              onClick={handleProductClick}
            />
          ))
        )}
      </div>

      {/* Product Quick View Modal — opens when user clicks a recommendation card */}
      <ProductQuickViewModal
        isOpen={isModalOpen}
        product={selectedProduct}
        onClose={handleCloseModal}
      />
    </section>
  );
};

export default RecommendationSection;
