import React from 'react';
import PlatformContainer from './PlatformContainer';
import './RecommendedProducts.css';

const RecommendedSection = ({ products, query, activePlatform }) => {
  // Ensure products is an object, default to empty object
  const safeProducts = products && typeof products === 'object' ? products : {};
  
  const displayProducts = activePlatform === 'all' 
    ? safeProducts 
    : { [activePlatform]: safeProducts[activePlatform] };

  return (
    <section className="recommended-section">
      <h2 className="recommended-title">Recommended item for "{query}"</h2>
      
      <div className="platform-containers">
        {Object.entries(displayProducts).map(([platformId, platformProducts]) => {
          // Skip if platformProducts is not an array
          if (!Array.isArray(platformProducts)) return null;
          const platformNames = {
            pcexpress: 'PCExpress',
            villman: 'VillMan',
            pcworx: 'PCWorx'
          };
          const platformColors = {
            pcexpress: '#004080',
            villman: '#008000',
            pcworx: '#800080'
          };

          return (
            <PlatformContainer 
              key={platformId}
              platform={platformNames[platformId]} 
              platformId={platformId}
              products={platformProducts} 
              color={platformColors[platformId]}
            />
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedSection;