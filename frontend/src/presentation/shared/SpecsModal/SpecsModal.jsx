import React, { memo } from 'react';
import { X } from 'lucide-react';
import './SpecsModal.css';

/**
 * 🎯 SPECS MODAL COMPONENT
 * Displays product specifications in a modal dialog
 * 
 * Features:
 * - 2-column specs grid layout
 * - Product image and metadata preview
 * - Smooth animations (fade-in, slide-up)
 * - Mobile-responsive (collapses to 1 column)
 * - Graceful handling of missing specs
 * - React.memo for performance optimization
 */

const SpecsModal = memo(({ product, isOpen, onClose }) => {
  if (!isOpen || !product) return null;

  const { title, specs, image_url, brand, sku, name = title } = product;
  
  // Handle case where specs is empty or invalid
  if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div 
          className="modal-content modal-empty" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <button 
              className="modal-close" 
              onClick={onClose}
              aria-label="Close modal"
              title="Close"
            >
              <X size={24} />
            </button>
            <h2>Product Specifications</h2>
          </div>
          <p className="modal-no-specs">No specifications available for this product.</p>
        </div>
      </div>
    );
  }

  const specEntries = Object.entries(specs);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <button 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
          >
            <X size={24} />
          </button>
          <h2>Product Specifications</h2>
        </div>

        {/* Product Info */}
        <div className="modal-product-info">
          {image_url && (
            <img 
              src={image_url} 
              alt={name}
              className="modal-product-image"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/80?text=No+Image';
              }}
            />
          )}
          <div className="modal-product-details">
            <h3>{name}</h3>
            {(brand || sku) && (
              <p className="modal-product-meta">
                {brand && <span className="meta-brand">{brand}</span>}
                {sku && <span className="meta-sku">SKU: {sku}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Specs Grid */}
        <div className="specs-grid">
          {specEntries.map(([key, value]) => (
            <div key={key} className="spec-item">
              <span className="spec-key">{key}:</span>
              <span className="spec-value">{String(value)}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            className="modal-btn-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

SpecsModal.displayName = 'SpecsModal';

export default SpecsModal;
