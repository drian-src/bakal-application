import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rating, PriceTag } from '../../../shared';
import { getStoreConfig } from '@/core/config/storeConfig';
import { Store } from 'lucide-react';

const RecommendedProductCard = ({ product, platformId }) => {
  const navigate = useNavigate();

  // Use storeConfig for consistent colors across all platforms
  const storeConfig = getStoreConfig(platformId);
  const color = storeConfig?.color || '#D4AF37';
  const platformName = storeConfig?.name || platformId || 'Unknown';
  
  // Use actual product image if available, otherwise use placeholder
  const imageUrl = product.image_url || `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22${encodeURIComponent(color)}%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%23FFF%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E`;

  const handleCardClick = () => {
    // Open the external store listing in a new tab
    const externalUrl = product.product_url;
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    } else if (product.id) {
      // Fallback: navigate to internal detail page if no external URL
      navigate(`/product/${product.id}`);
    } else {
      console.warn('[RecommendedProductCard] Product missing both URL and ID:', product);
    }
  };

  const handleViewDetails = (e) => {
    // Prevent card click from firing
    e.stopPropagation();
    if (!product.id) {
      console.error('[RecommendedProductCard] Cannot view details: product ID is missing', product);
      return;
    }
    navigate(`/product/${product.id}`);
  };

  // Determine if this is the best match and get score
  const isBestMatch = product.rank === 1;
  const scoreValue = product._score ? parseFloat(product._score).toFixed(3) : null;
  
  // Smart badge logic (page-scoped enhancements)
  const discount = product.discountPercent || product.discount_percent || 0;
  const rating = product.rating || 0;
  const isHotDeal = discount > 20;
  const isTopRated = rating >= 4.5 && (product.reviews_count || 0) > 10;

  return (
    <div className={`recommended-product-card ${isBestMatch ? 'best-match' : ''}`} onClick={handleCardClick}>
      <div className="rank-badge">{product.rank ? `#${product.rank}` : '★'}</div>
      {isBestMatch && <div className="best-match-label">Best Match</div>}
      
      {/* Smart Badges */}
      {isHotDeal && <div className="search-badge search-badge-hot">🔥 HOT DEAL</div>}
      {isTopRated && !isHotDeal && <div className="search-badge search-badge-top">⭐ TOP RATED</div>}
      {discount > 0 && <div className="search-discount-badge">-{discount}%</div>}
      
      <div className="rec-product-image-container">
        <img src={imageUrl} alt={product.title} className="rec-product-image" onError={(e) => {e.target.src = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22${encodeURIComponent(color)}%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2212%22 fill=%22%23FFF%22 text-anchor=%22middle%22 dy=%22.3em%22%3EImage not found%3C/text%3E%3C/svg%3E`;}} />
      </div>
      
      <div className="rec-product-info">
        <h4 className="rec-product-name">{product.title}</h4>
        
        {scoreValue && (
          <div className="product-score">
            <span className="score-label">Match Score:</span>
            <span className="score-value">{scoreValue}</span>
          </div>
        )}
        
        <div className="rec-product-rating">
          <Rating rating={product.rating} reviewCount={product.reviews_count} />
        </div>
        
        {/* Additional product details */}
        {product.brand && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            Brand: <strong>{product.brand}</strong>
          </div>
        )}
        
        {(product.discount_percent || product.discountPercent) > 0 && (
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: '500' }}>
            Save {Math.round(product.discount_percent || product.discountPercent)}%
          </div>
        )}
        
        <div className="rec-product-price">
          <PriceTag price={product.price} />
        </div>

        {/* Action Buttons */}
        <div className="rec-product-actions" style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rec-btn rec-btn-primary"
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '600',
              textAlign: 'center',
              background: 'var(--accent-gold, #d4af37)',
              color: '#000',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            View on Store →
          </a>
          <button
            className="rec-btn rec-btn-secondary"
            onClick={handleViewDetails}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '600',
              background: 'transparent',
              border: '1px solid rgba(212,175,55,0.4)',
              color: 'var(--accent-gold, #d4af37)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Details
          </button>
        </div>

        {/* Platform Badge - Shows which store the product is from */}
        <div className="platform-badge" style={{ 
          background: color,
          borderColor: color 
        }}>
          <Store size={14} />
          <span>{platformName}</span>
        </div>
      </div>
    </div>
  );
};

export default RecommendedProductCard;