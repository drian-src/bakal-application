import React from 'react';
import PlatformContainer from './PlatformContainer';
import './RecommendedProducts.css';

const RecommendedSection = ({ products, query, activePlatform }) => {
  // Ensure products is an object, default to empty object
  const safeProducts = products && typeof products === 'object' ? products : {};
  
  console.log('[RecommendedSection] Received products:', products);
  console.log('[RecommendedSection] Safe products:', safeProducts);
  console.log('[RecommendedSection] Product keys:', Object.keys(safeProducts));
  console.log('[RecommendedSection] Active platform:', activePlatform);
  
  const displayProducts = activePlatform === 'all' 
    ? safeProducts 
    : { [activePlatform]: safeProducts[activePlatform] };
  
  console.log('[RecommendedSection] Display products:', displayProducts);

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
              query={query}
            />
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedSection;