import React from 'react';
import RecommendedProductCard from './RecommendedProductCard';

const PlatformContainer = ({ platform, platformId, products, color }) => {
  // Defensive check: ensure products is an array
  const safeProducts = Array.isArray(products) ? products : [];
  
  return (
    <div className="platform-container">
      <div className="platform-header" style={{ borderLeftColor: color }}>
        <h3 className="platform-name">{platform}</h3>
        <span className="product-count">Top {Math.min(5, safeProducts.length)} Results</span>
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
  );
};

export default PlatformContainer;