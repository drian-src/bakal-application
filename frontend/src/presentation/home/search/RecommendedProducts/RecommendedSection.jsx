import React from 'react';
import { STORE_CONFIG } from '@/core/config/storeConfig';
import PlatformContainer from './PlatformContainer';
import './RecommendedProducts.css';

const RecommendedSection = ({ products, query, activePlatform }) => {
  // Ensure products is an object, default to empty object
  const safeProducts = products && typeof products === 'object' ? products : {};
  
  const displayProducts = activePlatform === 'all' 
    ? safeProducts 
    : { [activePlatform]: safeProducts[activePlatform] };

  // Check if we have any products
  const hasProducts = Object.values(displayProducts).some(
    platform => Array.isArray(platform) && platform.length > 0
  );

  // If no products and not loading, show empty state
  if (Object.keys(displayProducts).length === 0 && !hasProducts) {
    return (
      <section className="recommended-section">
        <h2 className="recommended-title">Recommended items for "{query}"</h2>
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <h3>No products found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      </section>
    );
  }

  return (
    <section className="recommended-section">
      <h2 className="recommended-title">Recommended items for "{query}"</h2>
      
      <div className="platform-containers">
        {Object.entries(displayProducts).map(([platformId, platformProducts]) => {
          // Skip if platformProducts is not an array
          if (!Array.isArray(platformProducts)) return null;
          
          const storeConfig = STORE_CONFIG[platformId.toLowerCase()];
          const platformName = storeConfig?.name || platformId;
          const platformColor = storeConfig?.color || '#888888';

          return (
            <PlatformContainer 
              key={platformId}
              platform={platformName} 
              platformId={platformId}
              products={platformProducts} 
              color={platformColor}
              query={query}
            />
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedSection;