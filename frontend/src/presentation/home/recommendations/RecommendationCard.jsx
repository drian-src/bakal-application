import React, { useState, useRef } from 'react';
import ProductHoverPreview from '../../shared/ProductHoverPreview';

/**
 * RecommendationCard
 * 
 * Displays a single product recommendation card in the recommendation section.
 * Includes hover preview and click-to-modal functionality.
 * 
 * @param {Object} props
 * @param {Object} props.product - Product object from API
 *   - id: string (UUID)
 *   - title: string (product name)
 *   - price: number|null (PHP price)
 *   - image_url: string|null (product image)
 *   - product_url: string (external store link)
 *   - platform: string|null (PCEXPRESS, VILLMAN, PCWORX)
 * @param {string} props.explanation - Human-readable reason for recommendation
 * @param {string} props.reasonType - Algorithm code (not displayed)
 * @param {Function} props.onClick - Click handler (opens modal, prevents default nav)
 * 
 * @example
 * <RecommendationCard
 *   product={{...}}
 *   explanation="Similar to 'RTX 3080' you viewed"
 *   reasonType="similar_to_viewed"
 *   onClick={() => setSelectedProduct(...)}
 * />
 */
const RecommendationCard = ({ product, explanation, reasonType, onClick }) => {
  const cardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const [showHoverPreview, setShowHoverPreview] = useState(false);

  // Null guard — silently return null if product is missing
  if (!product) return null;

  const handleMouseEnter = (e) => {
    // Dramatic floating effect with premium gold glow
    e.currentTarget.style.boxShadow = '0 25px 50px rgba(212, 175, 55, 0.4), 0 12px 25px rgba(212, 175, 55, 0.25), 0 0 30px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255,255,255,0.7)';
    e.currentTarget.style.borderColor = '#d4af37';
    e.currentTarget.style.borderWidth = '2.5px';
    e.currentTarget.style.transform = 'translateY(-12px) scale(1.08) rotate(0.5deg)';
    e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #fffbf7 100%)';
    e.currentTarget.style.backdropFilter = 'blur(10px)';
    e.currentTarget.style.zIndex = '5';
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHoverPreview(true);
    }, 150);
  };

  const handleMouseLeave = (e) => {
    // Smooth return to normal state
    e.currentTarget.style.boxShadow = '0 6px 16px rgba(212, 175, 55, 0.15), 0 2px 6px rgba(0,0,0,0.08)';
    e.currentTarget.style.borderColor = '#d4af37';
    e.currentTarget.style.borderWidth = '2px';
    e.currentTarget.style.transform = 'translateY(0) scale(1) rotate(0deg)';
    e.currentTarget.style.background = 'linear-gradient(135deg, #fafaf9 0%, #f5f3f0 100%)';
    e.currentTarget.style.backdropFilter = 'blur(0px)';
    e.currentTarget.style.zIndex = '1';
    clearTimeout(hoverTimeoutRef.current);
    setShowHoverPreview(false);
  };

  // Handle click — trigger modal instead of direct nav
  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) onClick(product);
  };

  return (
    <>
      <button
        ref={cardRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '14px',
          borderRadius: '12px',
          border: '2px solid #d4af37',
          background: 'linear-gradient(135deg, #fafaf9 0%, #f5f3f0 100%)',
          textDecoration: 'none',
          width: '180px',
          flexShrink: 0,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          overflow: 'visible',
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(212, 175, 55, 0.15), 0 2px 6px rgba(0,0,0,0.08)',
          fontFamily: 'inherit',
        }}
      >
      {/* Top accent bar — gold gradient line at card top edge with glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(90deg, #d4af37 0%, #e8c547 50%, #c29b2a 100%)',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)',
        }}
      />

      {/* Product Image Container */}
      <div
        style={{
          width: '100%',
          height: '150px',
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #ffffff 0%, #f9f7f4 100%)',
          position: 'relative',
          flexShrink: 0,
          border: '1.5px solid rgba(212, 175, 55, 0.3)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04), 0 1px 4px rgba(212, 175, 55, 0.1)',
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Monitor/Screen Icon SVG */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted, #9ca3af)"
              strokeWidth="1.5"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
        )}
      </div>

      {/* Platform Badge */}
      {product.platform && (
        <span
          style={{
            display: 'inline-block',
            fontSize: '10px',
            fontWeight: '800',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            background: 'linear-gradient(135deg, var(--accent-gold, #d4af37) 0%, #c29b2a 100%)',
            padding: '5px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(212, 175, 55, 0.5)',
            boxShadow: '0 3px 10px rgba(212, 175, 55, 0.35)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
        >
          {product.platform}
        </span>
      )}

      {/* Product Title */}
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: '700',
          color: '#1f2937',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
          letterSpacing: '0.2px',
        }}
      >
        {product.title}
      </p>

      {/* Price */}
      <p
        style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: '900',
          color: 'var(--accent-gold, #d4af37)',
          background: 'linear-gradient(135deg, #d4af37 0%, #c29b2a 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {typeof product.price === 'number'
          ? `₱${product.price.toLocaleString('en-PH')}`
          : 'Price N/A'}
      </p>

      {/* Explanation Pill */}
      {explanation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.08) 100%)',
            color: 'var(--accent-gold, #d4af37)',
            fontSize: '10px',
            fontWeight: '600',
            padding: '5px 10px',
            borderRadius: '6px',
            lineHeight: '1.3',
            border: '1px solid rgba(212,175,55,0.3)',
          }}
        >
          {/* Lightbulb Icon */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M9 21h6m-6-4h6M12 3a6 6 0 0 1 6 6c0 2.5-1.5 4.5-3 6H9c-1.5-1.5-3-3.5-3-6a6 6 0 0 1 6-6z" />
          </svg>

          {/* Explanation Text */}
          <span
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {explanation}
          </span>
        </div>
      )}
    </button>

    {/* Hover Preview Tooltip */}
    <ProductHoverPreview
      product={product}
      isVisible={showHoverPreview}
      targetRef={cardRef}
    />
    </>
  );
};

export default RecommendationCard;
