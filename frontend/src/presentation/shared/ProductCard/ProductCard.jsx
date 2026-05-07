import React, { useState, useRef, memo, useMemo } from 'react';
import {
  Star,
  Heart,
  Eye,
  GitCompare,
  Flame,
  Zap,
  Tag,
  Truck,
  TrendingUp,
  X,
  FileText,
  Store
} from 'lucide-react';
import { getStoreConfig } from '@/core/config/storeConfig';
import SpecsModal from '../SpecsModal/SpecsModal';
import './ProductCard.css';

/**
 * 🎯 UNIFIED PREMIUM PRODUCT CARD
 * Displays across: Home, Search, Recommendations, Categories, Product Details
 * 
 * Features:
 * - Premium gradient glass theme
 * - Rich product data (specs, ratings, deals)
 * - Smart deal/promo badges
 * - Visible hover clone animation
 * - Responsive variants (home, search, compact)
 * - PCWorx field support (sku, brand, variation, specs)
 * - Expandable specs modal
 * - Mobile-optimized UX
 * - React.memo for performance
 */

const ProductCard = memo(
  ({
    product,
    onProductClick,
    variant = 'home',
    onAddToCart,
    onAddToWishlist,
  }) => {
    const cardRef = useRef(null);
    const [isFavorited, setIsFavorited] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showSpecsModal, setShowSpecsModal] = useState(false);

    if (!product) return null;

    // Safely extract product fields with fallbacks
    const {
      id,
      title = 'Unknown Product',
      name = title,
      brand = 'Unknown Brand',
      price = 0,
      original_price: originalPrice = null,
      rating = 0,
      reviews_count: reviewsCount = 0,
      reviews = reviewsCount,
      image_url: imageUrl = null,
      image = imageUrl,
      platform = 'Unknown',
      discount_percent: discountPercent = 0,
      is_on_sale: isOnSale = false,
      promo_label: promoLabel = null,
      specs = {},
      is_available: isAvailable = true,
      platform_id: platformId,
      sku = null,
      variation = null,
      stock = null
    } = product;

    // Calculate effective discount from original_price if available
    const effectiveDiscount = useMemo(() => {
      return originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : discountPercent;
    }, [originalPrice, price, discountPercent]);

    // Extract top 3 specs for preview
    const specsPreview = useMemo(() => {
      if (!specs || typeof specs !== 'object') return null;
      const specEntries = Object.entries(specs).slice(0, 3);
      return specEntries.length > 0
        ? specEntries.map(([_, val]) => val).join(' • ')
        : null;
    }, [specs]);

    // Determine badge types
    const isHotDeal = effectiveDiscount > 20;
    const isTopRated = useMemo(() => 
      rating >= 4.5 && reviewsCount > 10,
      [rating, reviewsCount]
    );
    const isLimitedStock = !isAvailable || (stock && stock < 5);
    const hasSpecs = specs && Object.keys(specs).length > 0;
    const specsCount = Object.keys(specs || {}).length;

    const handleCardClick = () => {
      if (onProductClick) {
        onProductClick(product);
      }
    };

    const handleFavoriteClick = (e) => {
      e.stopPropagation();
      setIsFavorited(!isFavorited);
      if (onAddToWishlist) {
        onAddToWishlist(product);
      }
    };

    const handleAddToCart = (e) => {
      e.stopPropagation();
      if (onAddToCart) {
        onAddToCart(product);
      }
    };

    const handleQuickView = (e) => {
      e.stopPropagation();
      setShowDetails(true);
    };

    const handleViewSpecs = (e) => {
      e.stopPropagation();
      setShowSpecsModal(true);
    };

    // Render based on variant
    if (variant === 'compact') {
      return (
        <div className="product-card compact-card" onClick={handleCardClick}>
          <div className="card-image-wrapper">
            <img
              src={image}
              alt={name}
              className="card-image"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src =
                  'https://via.placeholder.com/150?text=No+Image';
              }}
            />
          </div>
          <div className="card-content-compact">
            <p className="card-brand">{brand}</p>
            <p className="card-title">{name}</p>
            <div className="card-price-compact">
              ₱{price.toLocaleString()}
            </div>
          </div>
        </div>
      );
    }

    // Standard home/search variant
    return (
      <>
        {/* Hover Clone Layer (Visible Background) */}
        <div
          ref={cardRef}
          className={`product-card-wrapper ${variant} ${
            !isAvailable ? 'unavailable' : ''
          }`}
        >
          {/* Clone Layer */}
          <div className="card-clone-layer" />

          {/* Main Card */}
          <div
            className={`product-card ${variant}`}
            onClick={handleCardClick}
            style={{ cursor: 'pointer' }}
          >
            {/* IMAGE AREA */}
            <div className="card-image-container">
              <img
                src={image}
                alt={name}
                className="card-image"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://via.placeholder.com/250?text=No+Image';
                }}
              />

              {/* Badges - Top Row */}
              <div className="badge-container-top">
                {isHotDeal && (
                  <div className="badge hot-deal">
                    <Flame size={14} />
                    HOT DEAL
                  </div>
                )}
                {isTopRated && (
                  <div className="badge top-rated">
                    <Star size={14} />
                    TOP RATED
                  </div>
                )}
              </div>

              {/* Discount Badge - Top Right */}
              {effectiveDiscount > 0 && (
                <div className="discount-badge">
                  -{effectiveDiscount}%
                </div>
              )}

              {/* Promo Label - Bottom Right */}
              {promoLabel && (
                <div className="promo-badge">
                  <Truck size={12} />
                  {promoLabel}
                </div>
              )}

              {/* Quick Actions - Right Side */}
              <div className="quick-actions">
                <button
                  className="action-btn favorite-btn"
                  onClick={handleFavoriteClick}
                  title="Add to wishlist"
                  aria-label="Add to wishlist"
                >
                  <Heart
                    size={18}
                    fill={isFavorited ? 'currentColor' : 'none'}
                    color={isFavorited ? '#ec4899' : '#ffffff'}
                  />
                </button>
                <button
                  className="action-btn quickview-btn"
                  onClick={handleQuickView}
                  title="Quick view"
                  aria-label="Quick view"
                >
                  <Eye size={18} />
                </button>
              </div>

              {/* Stock Warning */}
              {isLimitedStock && (
                <div className="limited-stock-badge">
                  Low Stock
                </div>
              )}
            </div>

            {/* INFO AREA */}
            <div className="card-content">
              {/* Brand */}
              <p className="card-brand">{brand}</p>

              {/* SKU and Variation (PCWorx Fields) */}
              {(sku || variation) && (
                <div className="card-meta-info">
                  {sku && <span className="meta-sku">SKU: {sku}</span>}
                  {variation && <span className="meta-variation">• {variation}</span>}
                </div>
              )}

              {/* Title */}
              <h3 className="card-title">{name}</h3>

              {/* Specs Preview */}
              {specsPreview && (
                <p className="specs-preview">{specsPreview}</p>
              )}

              {/* Rating */}
              {rating > 0 && (
                <div className="card-rating">
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < Math.round(rating) ? '#fbbf24' : 'none'}
                        color={i < Math.round(rating) ? '#fbbf24' : '#64748b'}
                      />
                    ))}
                  </div>
                  <span className="review-count">
                    ({reviewsCount} reviews)
                  </span>
                </div>
              )}

              {/* SKU Display (PCWorx specific) */}
              {sku && (
                <p className="card-sku">SKU: {sku}</p>
              )}
              <div className="card-price-section">
                {originalPrice && originalPrice > price && (
                  <span className="original-price">
                    ₱{originalPrice.toLocaleString()}
                  </span>
                )}
                <span className="current-price">
                  ₱{price.toLocaleString()}
                </span>
              </div>

              {/* Platform Badge - Styled with store-specific colors */}
              {(() => {
                const storeConfig = getStoreConfig(platform);
                const platformColor = storeConfig?.color || '#888888';
                return (
                  <div 
                    className={`card-platform platform-badge-${(platform || 'unknown').toLowerCase()}`}
                    style={{
                      backgroundColor: `${platformColor}1a`,
                      borderColor: platformColor,
                      color: platformColor
                    }}
                    title={`Available at ${platform}`}
                  >
                    <Store size={12} />
                    {platform}
                  </div>
                );
              })()} 

              {/* View Specs Button */}
              {hasSpecs && (
                <button
                  className="view-specs-btn"
                  onClick={handleViewSpecs}
                  title={`View ${specsCount} specifications`}
                  aria-label={`View ${specsCount} product specifications`}
                >
                  <FileText size={14} />
                  Specs ({specsCount})
                </button>
              )}

              {/* Action Buttons - Bottom */}
              <div className="card-actions">
                <button
                  className="action-primary"
                  onClick={handleAddToCart}
                  disabled={!isAvailable}
                >
                  Add to Cart
                </button>
                <button className="action-secondary" onClick={handleCardClick}>
                  <GitCompare size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Specs Modal */}
        {showSpecsModal && (
          <SpecsModal
            product={product}
            isOpen={showSpecsModal}
            onClose={() => setShowSpecsModal(false)}
          />
        )}
      </>
    );
  }
);

ProductCard.displayName = 'ProductCard';

export default ProductCard;
