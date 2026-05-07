import React from 'react';
import { Sparkles } from 'lucide-react';
import { STORE_CONFIG } from '@/core/config/storeConfig';
import './SearchSummaryHeader.css';

const SearchSummaryHeader = ({ query, stores = [] }) => {
  // Get unique valid stores from config
  const validStores = Object.values(STORE_CONFIG);
  
  return (
    <div className="search-summary-header">
      <div className="summary-container">
        {/* Sparkle Badge - Minimal, top-aligned */}
        <div className="sparkle-badge">
          <Sparkles size={13} strokeWidth={2.5} />
          <span>AI-Curated Results</span>
        </div>

        {/* Main Title - Cleaner, better hierarchy */}
        <h1 className="search-query-title">
          Results for <strong>"{query}"</strong>
        </h1>
        
        {/* Subtitle */}
        <p className="search-subtitle">
          Comparing prices across premium retailers
        </p>

        {/* Store Chips - Improved spacing and hover */}
        <div className="store-chips">
          {validStores.map(store => (
            <div 
              key={store.id}
              className="store-chip"
              style={{ 
                borderColor: store.color,
                backgroundColor: `${store.color}0a`
              }}
              title={`Search in ${store.name}`}
            >
              <span className="store-dot" style={{ backgroundColor: store.color }} />
              <span className="store-name">{store.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchSummaryHeader;