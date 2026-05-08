import React, { useMemo } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import './CompareModal.css';
import { useCompare } from '../../core/context/CompareContext';
import { getStoreConfig } from '@/core/config/storeConfig';

/**
 * CompareModal
 *
 * Displays a side-by-side product comparison table.
 * Each product occupies one column. Row labels sit in a fixed left column.
 * Best value cells are highlighted in gold.
 *
 * Layout per column (top to bottom):
 *   1. Platform badge (colored, from storeConfig)
 *   2. Product image
 *   3. Product title
 *   4. Price + best-price badge
 *   5. Specifications (key-value from product.specs)
 *   6. Rating + review count
 *   7. "View on {Store} →" button
 */
const CompareModal = ({ isOpen, onClose }) => {
  const { compareList } = useCompare();

  // ── Best-value calculations ─────────────────────────────────────────────
  const stats = useMemo(() => {
    if (compareList.length === 0) {
      return { lowestPrice: null, highestRating: null, highestScore: null };
    }
    return {
      lowestPrice:   Math.min(...compareList.map(p => p.price    ?? Infinity)),
      highestRating: Math.max(...compareList.map(p => p.rating   ?? 0)),
      highestScore:  Math.max(...compareList.map(p => p._score   ?? 0)),
    };
  }, [compareList]);

  const isBestPrice  = price  => typeof price  === 'number' && price  === stats.lowestPrice;
  const isBestRating = rating => typeof rating === 'number' && rating > 0 && rating === stats.highestRating;

  // ── Collect all unique spec keys across all products for consistent rows ─
  const allSpecKeys = useMemo(() => {
    const keys = new Set();
    compareList.forEach(p => {
      if (p.specs && typeof p.specs === 'object') {
        Object.keys(p.specs).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys).slice(0, 10); // cap at 10 spec rows
  }, [compareList]);

  // ── Format spec key for display ─────────────────────────────────────────
  const formatSpecKey = key =>
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // ── Store display helpers ────────────────────────────────────────────────
  const getStoreName = product => {
    const config = getStoreConfig(product.platform || product.seller_name);
    return config?.name || product.seller_name || product.platform || 'Store';
  };

  const getStoreColor = product => {
    const config = getStoreConfig(product.platform || product.seller_name);
    return config?.color || '#d4af37';
  };

  const getStoreIcon = product => {
    const config = getStoreConfig(product.platform || product.seller_name);
    return config?.icon || null;
  };

  if (!isOpen || compareList.length === 0) return null;

  const colCount = compareList.length;

  return (
    <div className="compare-modal-overlay" onClick={onClose}>
      <div
        className="compare-modal"
        onClick={e => e.stopPropagation()}
        style={{ '--col-count': colCount }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="compare-modal-header">
          <h2 className="compare-modal-title">Product Comparison</h2>
          <button
            className="compare-modal-close-btn"
            onClick={onClose}
            aria-label="Close comparison"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6"  y2="18" />
              <line x1="6"  y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Comparison table ────────────────────────────────────────────── */}
        <div className="compare-modal-table-wrapper">
          <table className="compare-modal-table">
            <tbody>

              {/* ── ROW 1: Platform badges ──────────────────────────────── */}
              <tr className="compare-row compare-row--platform">
                <td className="compare-label-cell">Store</td>
                {compareList.map(product => (
                  <td key={product.id} className="compare-cell compare-cell--platform">
                    <span
                      className="compare-platform-badge"
                      style={{ background: getStoreColor(product) }}
                    >
                      {getStoreIcon(product) && (
                        <span className="compare-platform-icon">
                          {getStoreIcon(product)}
                        </span>
                      )}
                      {getStoreName(product)}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── ROW 2: Product images ───────────────────────────────── */}
              <tr className="compare-row compare-row--image">
                <td className="compare-label-cell">Image</td>
                {compareList.map(product => (
                  <td key={product.id} className="compare-cell compare-cell--image">
                    <div className="compare-image">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          loading="lazy"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="compare-image-placeholder">
                          <svg width="36" height="36" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8"  y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* ── ROW 3: Product title ────────────────────────────────── */}
              <tr className="compare-row compare-row--title">
                <td className="compare-label-cell">Product</td>
                {compareList.map(product => (
                  <td key={product.id} className="compare-cell">
                    <h3 className="compare-product-name">{product.title}</h3>
                    {product.brand && (
                      <p className="compare-product-brand">{product.brand}</p>
                    )}
                    {product.sku && (
                      <p className="compare-product-sku">SKU: {product.sku}</p>
                    )}
                  </td>
                ))}
              </tr>

              {/* ── ROW 4: Price ────────────────────────────────────────── */}
              <tr className="compare-row compare-row--price">
                <td className="compare-label-cell">Price</td>
                {compareList.map(product => {
                  const best = isBestPrice(product.price);
                  return (
                    <td
                      key={product.id}
                      className={`compare-cell compare-cell--price${best ? ' compare-cell--best' : ''}`}
                    >
                      <span className="compare-price">
                        {typeof product.price === 'number'
                          ? `₱${product.price.toLocaleString('en-PH')}`
                          : 'N/A'}
                      </span>

                      {/* Strikethrough original price */}
                      {(product.original_price ?? product.originalPrice) > product.price && (
                        <span className="compare-original-price">
                          ₱{(product.original_price ?? product.originalPrice)
                              .toLocaleString('en-PH')}
                        </span>
                      )}

                      {/* Discount badge - only show if original_price is valid */}
                      {(product.original_price ?? product.originalPrice) > product.price && (product.discount_percent ?? product.discountPercent) > 0 && (
                        <span className="compare-discount-badge">
                          -{Math.round(product.discount_percent ?? product.discountPercent)}%
                        </span>
                      )}

                      {/* Best price highlight */}
                      {best && (
                        <span className="best-badge">✓ BEST PRICE</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* ── ROW 5: Specifications ───────────────────────────────── */}
              {allSpecKeys.length > 0 && (
                <>
                  {/* Specs section header */}
                  <tr className="compare-row compare-row--specs-header">
                    <td className="compare-label-cell"></td>
                    {compareList.map(product => (
                      <td key={product.id} className="compare-cell compare-cell--specs-header">
                        Specifications
                      </td>
                    ))}
                  </tr>

                  {/* One row per spec key */}
                  {allSpecKeys.map(specKey => (
                    <tr key={specKey} className="compare-row compare-row--spec">
                      <td className="compare-label-cell compare-label-cell--spec">
                        {formatSpecKey(specKey)}
                      </td>
                      {compareList.map(product => (
                        <td key={product.id} className="compare-cell compare-cell--spec">
                          {product.specs?.[specKey]
                            ? <span className="compare-spec-value">{product.specs[specKey]}</span>
                            : <span className="no-data">—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {/* Specs empty state — shown when no product has any specs */}
              {allSpecKeys.length === 0 && (
                <tr className="compare-row compare-row--spec">
                  <td className="compare-label-cell">Specifications</td>
                  {compareList.map(product => (
                    <td key={product.id} className="compare-cell">
                      <span className="no-data">No specs available</span>
                    </td>
                  ))}
                </tr>
              )}

              {/* ── ROW 6: Rating ───────────────────────────────────────── */}
              <tr className="compare-row compare-row--rating">
                <td className="compare-label-cell">Rating</td>
                {compareList.map(product => {
                  const best = isBestRating(product.rating);
                  return (
                    <td
                      key={product.id}
                      className={`compare-cell${best ? ' compare-cell--best' : ''}`}
                    >
                      {product.rating ? (
                        <div className="compare-rating">
                          <div className="compare-stars" style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                style={{
                                  fill: i < Math.floor(product.rating) ? '#fbbf24' : (i - Math.floor(product.rating) < (product.rating % 1 >= 0.5 ? 0.5 : 0) ? '#fbbf24' : 'none'),
                                  color: i < Math.floor(product.rating) ? '#fbbf24' : '#d1d5db',
                                  strokeWidth: 1.5
                                }}
                              />
                            ))}
                          </div>
                          <span className="compare-rating-value">
                            {product.rating.toFixed(1)}
                          </span>
                          {product.reviews_count > 0 && (
                            <span className="compare-review-count">
                              ({product.reviews_count} reviews)
                            </span>
                          )}
                          {best && <span className="best-badge">✓ BEST</span>}
                        </div>
                      ) : (
                        <span className="no-data">No ratings</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* ── ROW 7: Availability ─────────────────────────────────── */}
              <tr className="compare-row compare-row--availability">
                <td className="compare-label-cell">Availability</td>
                {compareList.map(product => (
                  <td key={product.id} className="compare-cell">
                    <span
                      className="compare-availability"
                      data-available={product.is_available !== false}
                    >
                      {product.is_available !== false ? '✓ In Stock' : '✗ Out of Stock'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── ROW 8: View Store button ────────────────────────────── */}
              <tr className="compare-row compare-row--action">
                <td className="compare-label-cell">Store Link</td>
                {compareList.map(product => (
                  <td key={product.id} className="compare-cell compare-cell--action">
                    {product.product_url ? (
                      <a
                        href={product.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="compare-link-btn"
                        style={{ background: getStoreColor(product) }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          View on {getStoreName(product)} <ArrowRight size={16} strokeWidth={1.5} />
                        </div>
                      </a>
                    ) : (
                      <span className="no-data">No link available</span>
                    )}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="compare-modal-footer">
          <button className="compare-close-btn" onClick={onClose}>
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
