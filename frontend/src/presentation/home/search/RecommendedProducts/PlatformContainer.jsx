import React, { useState } from 'react';
import RecommendedProductCard from './RecommendedProductCard';
import SeeAllModal from './SeeAllModal';

const PlatformContainer = ({ platform, platformId, products, color, query }) => {
  // Defensive check: ensure products is an array
  const safeProducts = Array.isArray(products) ? products : [];
  const [showSeeAll, setShowSeeAll] = useState(false);
  
  const handleSeeAll = () => {
    setShowSeeAll(true);
  };

  return (
    <>
      <div className="platform-container">
        <div className="platform-header" style={{ borderLeftColor: color }}>
          <h3 className="platform-name">{platform}</h3>
          <button
            type="button"
            className="see-all-button"
            title="See All"
            aria-label={`See all results for ${platform}`}
            onClick={handleSeeAll}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>

          </button>
        </div>
        
        <div className="platform-products">
          {safeProducts.map(product => (
            <RecommendedProductCard 
              key={product.id} 
              product={product} 
              platformId={platformId}
            />
          ))}
        </div>
      </div>
      
      {showSeeAll && (
        <SeeAllModal 
          platform={platform}
          platformId={platformId}
          query={query}
          color={color}
          onClose={() => setShowSeeAll(false)}
        />
      )}
    </>
  );
};

export default PlatformContainer;