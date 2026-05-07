import React, { useState } from 'react';
import './CompareBar.css';
import { useCompare } from '../../core/context/CompareContext';
import CompareModal from './CompareModal';

/**
 * CompareBar
 * 
 * Sticky bar at bottom showing products in compare list.
 * Users can remove items and open compare view.
 */
const CompareBar = () => {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const [showCompareModal, setShowCompareModal] = useState(false);

  if (compareList.length === 0) return null;

  return (
    <>
      <div className="compare-bar">
        <div className="compare-bar-content">
          {/* Left: Product thumbnails */}
          <div className="compare-bar-products">
            {compareList.map((product) => (
              <div key={product.id} className="compare-bar-item">
                {/* Thumbnail */}
                <div className="compare-bar-thumbnail">
                  {product.image_url || product.image ? (
                    <img
                      src={product.image_url || product.image}
                      alt={product.title || product.name}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="compare-bar-thumbnail-placeholder">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Title & Store Info */}
                <div className="compare-bar-info">
                  <span className="compare-bar-title">
                    {(product.title || product.name).substring(0, 30)}
                  </span>
                  <span className="compare-bar-store">
                    {product.platform || product.store || 'Store'}
                  </span>
                </div>

                {/* Remove button */}
                <button
                  className="compare-bar-remove"
                  onClick={() => removeFromCompare(product.id)}
                  aria-label="Remove from compare"
                  title="Remove from comparison"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="compare-bar-actions">
            <button
              className="compare-bar-btn primary-btn"
              onClick={() => setShowCompareModal(true)}
            >
              Compare ({compareList.length})
            </button>
            <button
              className="compare-bar-btn secondary-btn"
              onClick={clearCompare}
              title="Clear all"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Compare Modal */}
      <CompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
      />
    </>
  );
};

export default CompareBar;
