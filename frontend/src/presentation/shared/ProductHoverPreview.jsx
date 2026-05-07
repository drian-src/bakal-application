import React, { useState, useRef, useEffect } from 'react';
import './ProductHoverPreview.css';

/**
 * ProductHoverPreview
 * 
 * Lightweight tooltip-style preview that appears on hover.
 * Shows mini product card with key details.
 * 
 * @param {Object} props
 * @param {Object} props.product - Product data to preview
 * @param {boolean} props.isVisible - Whether to show preview
 * @param {HTMLElement} props.targetRef - Reference to card being hovered
 */
const ProductHoverPreview = ({ product, isVisible, targetRef }) => {
  const previewRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isVisible || !previewRef.current || !targetRef?.current) return;

    // Position preview relative to target card
    const target = targetRef.current;
    const rect = target.getBoundingClientRect();
    
    const previewRect = previewRef.current.getBoundingClientRect();
    
    // Try to position to the right of card, with small gap
    let left = rect.right + 10;
    let top = rect.top;

    // If preview goes off-screen right, position to the left instead
    if (left + previewRect.width > window.innerWidth) {
      left = rect.left - previewRect.width - 10;
    }

    // If preview goes off-screen bottom, adjust top
    if (top + previewRect.height > window.innerHeight) {
      top = window.innerHeight - previewRect.height - 10;
    }

    setPosition({ top, left });
  }, [isVisible, targetRef]);

  if (!isVisible || !product) return null;

  return (
    <div
      ref={previewRef}
      className="product-hover-preview"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Image */}
      <div className="product-hover-image">
        {product.image_url || product.image ? (
          <img
            src={product.image_url || product.image}
            alt={product.title || product.name}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="product-hover-image-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="product-hover-content">
        {/* Platform Badge */}
        {(product.platform || product.store) && (
          <span className="product-hover-badge">
            {product.platform || product.store}
          </span>
        )}

        {/* Title */}
        <h4 className="product-hover-title">
          {product.title || product.name}
        </h4>

        {/* Price */}
        <p className="product-hover-price">
          {typeof (product.price) === 'number'
            ? `₱${product.price.toLocaleString('en-PH')}`
            : 'Price N/A'}
        </p>

        {/* Rating */}
        {product.rating && product.rating > 0 && (
          <div className="product-hover-rating">
            <span>{'★'.repeat(Math.floor(product.rating))}</span>
            <span className="product-hover-rating-value">
              {product.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Match Score */}
        {product._score && product._score > 0 && (
          <div className="product-hover-score">
            Match: {Math.round(product._score * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductHoverPreview;
