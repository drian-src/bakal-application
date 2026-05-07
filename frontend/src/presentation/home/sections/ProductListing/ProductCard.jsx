import React, { useState, useRef } from 'react';
import './ProductCard.css';
import { Rating, PlatformBadge, PriceTag } from '../../../shared';
import ProductHoverPreview from '../../../shared/ProductHoverPreview';
import ProductQuickViewModal from '../../../shared/ProductQuickViewModal';

const ProductCard = ({ product, onProductClick }) => {
  const cardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  
  const [showHoverPreview, setShowHoverPreview] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleMouseEnter = () => {
    // Add small delay to prevent flicker on quick hover
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHoverPreview(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
    setShowHoverPreview(false);
  };

  const handleCardClick = () => {
    // Use passed callback or open modal internally
    if (onProductClick) {
      onProductClick(product);
    } else {
      setSelectedProduct(product);
    }
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  // Inline CSS for discount and pricing features
  const discountBadgeStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'linear-gradient(135deg, #d4af37 0%, #c29b2a 100%)',
    color: '#ffffff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    boxShadow: '0 3px 10px rgba(212, 175, 55, 0.35)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
  };

  const originalPriceStyle = {
    textDecoration: 'line-through',
    color: '#999999',
    fontSize: '12px',
    marginRight: '8px',
  };

  const priceSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  return (
    <>
      <div
        ref={cardRef}
        className="product-card"
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <div className="product-image-container" style={{ position: 'relative' }}>
          <img
            src={product.image}
            alt={product.name}
            className="product-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="product-platform-badge">
            <PlatformBadge platform={product.platform} />
          </div>
          
          {/* Discount Badge */}
          {product.is_on_sale && product.discount_percent && (
            <div style={discountBadgeStyle}>
              -{Math.round(product.discount_percent)}% OFF
            </div>
          )}
        </div>
          
        <div className="product-info">
          <h4 className="product-name">{product.name}</h4>
          <div className="product-rating">
            <Rating rating={product.rating} reviewCount={product.reviews} />
          </div>
          
          {/* Price with Original Price Strikethrough */}
          <div style={priceSectionStyle}>
            {product.original_price && product.original_price > product.price && (
              <span style={originalPriceStyle}>
                ₱{product.original_price.toLocaleString()}
              </span>
            )}
            <div className="product-price">
              <PriceTag price={product.price} />
            </div>
          </div>
        </div>
      </div>

      {/* Hover Preview Tooltip */}
      <ProductHoverPreview
        product={product}
        isVisible={showHoverPreview}
        targetRef={cardRef}
      />

      {/* Quick View Modal (if no callback provided) */}
      {!onProductClick && (
        <ProductQuickViewModal
          isOpen={selectedProduct !== null}
          product={selectedProduct}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default ProductCard;