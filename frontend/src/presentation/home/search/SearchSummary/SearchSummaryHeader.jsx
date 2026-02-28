import React from 'react';
import './SearchSummaryHeader.css';

const SearchSummaryHeader = ({ query, stores = [] }) => {
  // Format store names dynamically
  const getStoreDescription = () => {
    if (stores.length === 0) return 'multiple stores';
    if (stores.length === 1) return stores[0].name;
    const names = stores.map(s => s.name);
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  };

  return (
    <div className="search-summary-header">
      <div className="summary-container">
        <div className="ai-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          AI-Processed Results
        </div>
        <h1 className="search-query">"{query}"</h1>
        <p className="search-description">
          Showing AI-curated recommendations from {getStoreDescription()}
        </p>
      </div>
    </div>
  );
};

export default SearchSummaryHeader;