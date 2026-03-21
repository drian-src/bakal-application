import React from 'react';

/**
 * RecommendationCard
 * 
 * Displays a single product recommendation card in the recommendation section.
 * This is a pure display component - no state, no effects, no external navigation.
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
 * 
 * @example
 * <RecommendationCard
 *   product={{
 *     id: 'uuid',
 *     title: 'MSI RTX 4080',
 *     price: 59999,
 *     image_url: 'https://...',
 *     product_url: 'https://pcexpress.com/...',
 *     platform: 'PCExpress'
 *   }}
 *   explanation="Similar to 'RTX 3080' you viewed"
 *   reasonType="similar_to_viewed"
 * />
 */
const RecommendationCard = ({ product, explanation, reasonType }) => {
  // Null guard — silently return null if product is missing
  if (!product) return null;

  return (
    <a
      href={product.product_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        borderRadius: '10px',
        border: '1.5px solid var(--border-color, #e5e7eb)',
        background: 'var(--card-bg, #fff)',
        textDecoration: 'none',
        width: '180px',
        flexShrink: 0,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)';
        e.currentTarget.style.borderColor = 'var(--accent-gold, #d4af37)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)';
      }}
    >
      {/* Top accent bar — subtle gold line at card top edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, var(--accent-gold, #d4af37), rgba(212,175,55,0.3))',
          borderRadius: '10px 10px 0 0',
        }}
      />

      {/* Product Image Container */}
      <div
        style={{
          width: '100%',
          height: '140px',
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'var(--image-bg, #f9fafb)',
          position: 'relative',
          flexShrink: 0,
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
            fontWeight: '700',
            color: 'var(--text-muted, #6b7280)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            background: 'var(--image-bg, #f3f4f6)',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1px solid var(--border-color, #e5e7eb)',
          }}
        >
          {product.platform}
        </span>
      )}

      {/* Product Title */}
      <p
        style={{
          margin: 0,
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-primary, #111827)',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {product.title}
      </p>

      {/* Price */}
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '800',
          color: 'var(--text-primary, #111827)',
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
            gap: '4px',
            background: 'rgba(212,175,55,0.1)',
            color: 'var(--accent-gold, #d4af37)',
            fontSize: '10px',
            fontWeight: '500',
            padding: '3px 8px',
            borderRadius: '999px',
            lineHeight: '1.4',
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
    </a>
  );
};

export default RecommendationCard;
