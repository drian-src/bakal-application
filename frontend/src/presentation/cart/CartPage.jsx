import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trackInteraction } from '../../core/services/apiService';
import HomeHeader from '../home/sections/Header/HomeHeader';
import { useCart } from '../../core/hooks/useCart';
import { getStoreConfig } from '../../core/config/storeConfig';
import { PLATFORM_COLORS, getPlatformColor } from '../../core/config/categoryConstants';
import { ConfirmDialog } from '../shared';
import {
  ShoppingCart,
  Trash2,
  ExternalLink,
  Package,
  Search,
  Star,
  Clock,
  CheckCircle,
  Info,
} from 'lucide-react';
import './CartPage.css';

const CartPage = () => {
  const { cart, loading, removeFromCart, clearCart } = useCart();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const navigate = useNavigate();

  console.log('[CartPage] cart:', cart);
  console.log('[CartPage] cart.items:', cart?.items);
  console.log('[CartPage] loading:', loading);
  console.log('[CartPage] items count:', cart?.items?.length || 0);

  const handleRemoveItem = (itemId) => {
    removeFromCart(itemId);
  };

  const handleClearCart = async () => {
    await clearCart();
    setShowClearConfirm(false);
  };

  const items = cart.items || [];
  const isEmpty = items.length === 0;
  
  return (
    <div className="cart-page cart-page-wrapper">
      <style>{`
        /* Cart page contrast overrides — only applies within this page */
        .cart-page-wrapper {
          --card-bg: #ffffff;
          --border-color: #d1d5db;
          --text-primary: #111827;
          --text-secondary: #374151;
          --text-muted: #6b7280;
          --danger-color: #ef4444;
          --image-bg: #f9fafb;
          --star-color: #f59e0b;
          --primary-color: #4f46e5;
        }
        /* Dark mode support */
        .dark .cart-page-wrapper,
        [data-theme="dark"] .cart-page-wrapper {
          --card-bg: #1e1e2e;
          --border-color: #374151;
          --text-primary: #f9fafb;
          --text-secondary: #d1d5db;
          --text-muted: #9ca3af;
          --image-bg: #111827;
        }
        @media (max-width: 600px) {
          .cart-item-card {
            flex-direction: column !important;
          }
          .cart-item-card .cart-item-actions {
            flex-direction: row !important;
            align-items: center !important;
            width: 100% !important;
            justify-content: space-between !important;
          }
        }
      `}</style>
      
      <HomeHeader hideSearch />
      
      <main className="cart-content">
        <div className="cart-container">
          {/* Minimalist back button — using CSS class */}
          <button
            onClick={() => navigate(-1)}
            className="back-button"
            title="Go back"
            style={{
              marginBottom: '12px',
              display: 'inline-flex',
              width: '32px',
              height: '32px',
            }}
          >
            {/* Left arrow SVG — inline, no package needed */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          {/* Page Header with Gradient Left Border */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-lg)',
            paddingLeft: '16px',
            borderLeft: '4px solid',
            borderImageSource: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)',
            borderImageSlice: 1,
          }}>
            <h1 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary, #111827)',
            }}>
              <ShoppingCart size={20} strokeWidth={1.5} />
              Saved Items
              {items.length > 0 && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  fontWeight: '400',
                  color: 'var(--text-muted, #9ca3af)',
                  verticalAlign: 'middle',
                }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </h1>

            {/* Clear Cart Button — Ghost Danger Style */}
            {items.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={loading}
                title="Remove all items from saved list"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.color = '#dc2626';
                    e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                Clear All
              </button>
            )}
          </div>

          {/* Empty State */}
          {isEmpty && !loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              gap: '20px',
              textAlign: 'center',
              padding: '48px 24px',
            }}>
              <ShoppingCart 
                size={48} 
                strokeWidth={1} 
                color="#c7d2fe"
                style={{ opacity: 0.7 }}
              />
              <h2 style={{ 
                margin: 0, 
                color: 'var(--text-primary)', 
                fontSize: '16px', 
                fontWeight: '600'
              }}>
                Your saved items will appear here
              </h2>
              <p style={{ 
                margin: 0, 
                color: 'var(--text-muted)', 
                fontSize: '14px',
                maxWidth: '280px',
                lineHeight: '1.5'
              }}>
                Search for products and save them to compare prices across PCExpress, VillMan, and PCWorx.
              </p>
              <Link
                to="/search"
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Search size={15} strokeWidth={1.5} />
                Start Searching
              </Link>
            </div>
          )}

          {/* Product Cards List */}
          {items.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
              maxWidth: '860px',
              margin: '0 auto',
            }}>
              {items.map((item) => {
                const product = item.product;
                
                // Guard: if product didn't populate, show recovery card
                if (!product) {
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '10px',
                        border: '1.5px dashed var(--border-color, #d1d5db)',
                        background: 'var(--card-bg, #fff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted, #6b7280)' }}>
                        ⚠️ This product is no longer available or could not be loaded.
                      </p>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid var(--border-color, #d1d5db)',
                          background: 'transparent',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: 'var(--text-muted, #6b7280)',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                }

                      const checkoutUrl = product.product_url
        ?? product.productUrl   // camelCase fallback for cached data
        ?? product.url          // legacy fallback
        ?? null;
      const origPrice = product.original_price ?? product.originalPrice;

                return (
                  <div
                    key={item.id}
                    className="cart-item-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '20px',
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color, #d1d5db)',
                      borderLeft: `3px solid ${getPlatformColor(product.storeName || product.platform).accent}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                      transition: 'all 0.2s ease',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                    }}
                  >

                    {/* Product Image with proper fallback — responsive size */}
                    <div style={{
                      flexShrink: 0,
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color, #e5e7eb)',
                      background: 'var(--image-bg, #f9fafb)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {product.imageUrl || product.image_url || product.image || product.images?.[0] ? (
                        <img
                          src={product.imageUrl ?? product.image_url ?? product.image ?? product.images?.[0]}
                          alt={product.title ?? product.name ?? 'Product'}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.img-fallback');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}

                      {/* Fallback SVG icon */}
                      <div
                        className="img-fallback"
                        style={{
                          display: (product.imageUrl ?? product.image_url ?? product.image ?? product.images?.[0]) ? 'none' : 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          gap: '4px',
                          position: 'absolute',
                          inset: 0,
                        }}
                      >
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--text-muted, #9ca3af)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)', fontWeight: '500' }}>
                          No image
                        </span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>

                      {/* Store Badge — Platform Color Differentiation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: getPlatformColor(product.storeName || product.platform).bg,
                          color: getPlatformColor(product.storeName || product.platform).text,
                          border: `1px solid ${getPlatformColor(product.storeName || product.platform).border}`,
                        }}>
                          {product.storeName ?? product.platform ?? 'Store'}
                        </span>

                        {/* Availability Badge */}
                        {(product.availability || product.inStock !== undefined) && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: '500',
                            background: product.is_available !== false
                              ? 'rgba(34,197,94,0.1)'
                              : 'rgba(239,68,68,0.1)',
                            color: product.is_available !== false
                              ? '#16a34a'
                              : '#dc2626',
                          }}>
                            <CheckCircle size={10} />
                            {product.availability ?? (product.inStock ? 'In Stock' : 'Out of Stock')}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h3 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-primary, #111827)',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {product.title ?? product.name ?? 'Unknown Product'}
                      </h3>

                      {/* Short description if available */}
                      {(product.description || product.shortDescription) && (
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          color: 'var(--text-secondary, #374151)',
                          lineHeight: '1.5',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {product.description ?? product.shortDescription}
                        </p>
                      )}

                      {/* Rating if available */}
                      {product.rating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={13} fill="var(--star-color, #f59e0b)" color="var(--star-color, #f59e0b)" />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary, #111827)' }}>
                            {typeof product.rating === 'number' ? product.rating.toFixed(1) : product.rating}
                          </span>
                        </div>
                      )}

                      {/* Added date */}
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--text-muted, #9ca3af)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <Clock size={12} strokeWidth={1.5} />
                        Saved {new Date(item.addedAt ?? item.createdAt ?? Date.now()).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>

                    </div>

                    {/* Right Column: Price + Actions */}
                    <div
                      className="cart-item-actions"
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '12px',
                        minWidth: '140px',
                      }}
                    >

                      {/* Price */}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '22px',
                          fontWeight: '800',
                          color: 'var(--text-primary, #111827)',
                          letterSpacing: '-0.5px',
                          lineHeight: 1,
                        }}>
                          {typeof product.price === 'number'
                            ? `₱${product.price.toLocaleString('en-PH')}`
                            : product.price ?? 'Price N/A'}
                        </p>

                        {origPrice && origPrice > product.price && (
                          <p style={{
                            margin: '3px 0 0',
                            fontSize: '13px',
                            color: 'var(--text-muted, #9ca3af)',
                            textDecoration: 'line-through',
                          }}>
                            ₱{product.originalPrice.toLocaleString('en-PH')}
                          </p>
                        )}
                      </div>

                      {/* Proceed to Checkout Button — Gradient */}
                      {checkoutUrl ? (
                        <a
                          href={checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="compare-link-btn"
                          onClick={() => {
                            // Track checkout click for recommendation engine — fire and forget
                            if (item.productId) {
                              trackInteraction('click', { productId: item.productId });
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: '500',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.opacity = '0.9';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.35)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.25)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <ExternalLink size={13} strokeWidth={1.5} />
                          Buy
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                          Link unavailable
                        </span>
                      )}

                      {/* Remove from cart Button — Icon Only */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={loading}
                        title="Remove item from saved list"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-muted, #9ca3af)',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.5 : 1,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          if (!loading) {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--text-muted, #9ca3af)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Order Summary Footer — shown when items exist */}
          {items.length > 0 && (
            <div style={{
              marginTop: '32px',
              padding: '20px',
              borderRadius: '12px',
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #d1d5db)',
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-secondary, #374151)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Order Summary
              </h3>
              
              <div style={{ borderBottom: '1px solid var(--border-color, #d1d5db)', marginBottom: '12px' }} />
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--text-muted, #9ca3af)',
                }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'} from {new Set(items.map(i => i.product?.platform || i.product?.storeName || 'unknown')).size} {new Set(items.map(i => i.product?.platform || i.product?.storeName || 'unknown')).size === 1 ? 'store' : 'stores'}
                </p>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '16px',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary, #374151)',
                }}>
                  Total
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  ₱{(items.reduce((sum, item) => sum + (item.product?.price || 0), 0)).toLocaleString('en-PH')}
                </p>
              </div>
              
              <p style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: 'var(--text-muted, #9ca3af)',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Info size={12} strokeWidth={1.5} />
                Prices may vary. Click "Buy" buttons to purchase items.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Confirm Dialog for Clear Cart */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Cart?"
        message="Are you sure you want to remove all items from your saved list? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        onConfirm={handleClearCart}
        onCancel={() => setShowClearConfirm(false)}
        isDanger={true}
      />
    </div>
  );
};

export default CartPage;
