import React from 'react';
import './SearchSummaryHeader.css';

const SearchSummaryHeader = ({ query }) => {
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
          Showing AI-curated recommendations from PCExpress, VillMan, and PCWorx
        </p>
      </div>
    </div>
  );
};

export default SearchSummaryHeader;