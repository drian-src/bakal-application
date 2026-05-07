import React from 'react';
import './ProductQuickViewModal.css';
import { useCompare } from '../../core/context/CompareContext';

/**
 * ProductQuickViewModal
 * 
 * Modal dialog for quick product preview.
 * Displays product details without leaving the app.
 * User can view details, proceed to external product page, or add to compare.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Object} props.product - Product data
 * @param {string} props.product.title - Product title
 * @param {number} props.product.price - Product price
 * @param {string} props.product.image_url - Product image
 * @param {string} props.product.product_url - Link to product page
 * @param {string} props.product.platform - Store name
 * @param {number} props.product.rating - Product rating
 * @param {string} props.explanation - Why it was recommended
 * @param {Function} props.onClose - Close modal callback
 */
const ProductQuickViewModal = ({ isOpen, product, explanation, onClose }) => {
  const { addToCompare, isInCompare, canAddMore } = useCompare();
  if (!isOpen || !product) return null;

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="product-modal-close" onClick={onClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="product-modal-content">
          {/* Product Image */}
          <div className="product-modal-image-container">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="product-modal-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="product-modal-image-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="product-modal-details">
            {/* Platform Badge */}
            {product.platform && (
              <span className="product-modal-platform-badge">
                {product.platform}
              </span>
            )}

            {/* Title */}
            <h2 className="product-modal-title">{product.title}</h2>

            {/* Price */}
            <p className="product-modal-price">
              {typeof product.price === 'number'
                ? `₱${product.price.toLocaleString('en-PH')}`
                : 'Price N/A'}
            </p>

            {/* Rating (if available) */}
            {product.rating && product.rating > 0 && (
              <div className="product-modal-rating">
                <span className="product-modal-stars">
                  {'★'.repeat(Math.floor(product.rating))}
                  {product.rating % 1 !== 0 && '½'}
                </span>
                <span className="product-modal-rating-value">{product.rating.toFixed(1)}</span>
              </div>
            )}

            {/* Match Score (if available) */}
            {product._score && product._score > 0 && (
              <div className="product-modal-score">
                <span className="product-modal-score-label">Match Score</span>
                <span className="product-modal-score-value">
                  {Math.round(product._score * 100)}%
                </span>
              </div>
            )}

            {/* Recommendation Explanation */}
            {explanation && (
              <div className="product-modal-explanation">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span>{explanation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="product-modal-actions">
          <button
            className="product-modal-btn compare-btn"
            onClick={() => {
              addToCompare(product);
            }}
            disabled={!canAddMore && !isInCompare(product.id)}
            title={!canAddMore && !isInCompare(product.id) ? 'Max 4 products' : 'Add to compare'}
          >
            {isInCompare(product.id) ? '✓ In Compare' : 'Add to Compare'}
          </button>
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="product-modal-btn primary-btn"
          >
            View Product
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickViewModal;
