import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HomeHeader from '../home/sections/Header/HomeHeader';
import { useCart } from '../../core/hooks/useCart';
import { ConfirmDialog } from '../shared';
import {
  ShoppingBag,
  Trash2,
  ExternalLink,
  Package,
  Search,
  Star,
  Clock,
  CheckCircle,
} from 'lucide-react';
import './CartPage.css';

const CartPage = () => {
  const { cart, loading, removeFromCart, clearCart } = useCart();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
          {/* Page Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-lg)',
          }}>
            <h1 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
              fontSize: '28px',
              fontWeight: '700',
              color: 'var(--text-primary, #111827)',
            }}>
              <ShoppingBag size={28} style={{ verticalAlign: 'middle' }} />
              Saved Items
              {items.length > 0 && (
                <span style={{
                  marginLeft: '12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: 'var(--text-muted, #9ca3af)',
                  verticalAlign: 'middle',
                }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </h1>

            {/* Clear Cart Button */}
            {items.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1.5px solid var(--danger-color, #ef4444)',
                  background: 'transparent',
                  color: 'var(--danger-color, #ef4444)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.background = 'var(--danger-color, #ef4444)';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--danger-color, #ef4444)';
                }}
              >
                <Trash2 size={15} />
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
              gap: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--card-bg, #f8f9fa)',
                border: '2px solid var(--border-color, #e5e7eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ShoppingBag size={36} color="var(--text-muted, #9ca3af)" />
              </div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>
                No saved items yet
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px' }}>
                Browse products and save items you want to buy later.
              </p>
              <Link
                to="/search"
                style={{
                  marginTop: '8px',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'var(--primary-color, #4f46e5)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Search size={15} />
                Browse Products
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

                const storeColor = product.storeColor ?? '#888';
                const checkoutUrl = product.url ?? product.productUrl ?? product.link ?? '#';

                return (
                  <div
                    key={item.id}
                    className="cart-item-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '20px',
                      padding: '20px',
                      borderRadius: 'var(--radius-md, 12px)',
                      background: 'var(--card-bg, #ffffff)',
                      border: '2px solid var(--border-color, #d1d5db)',
                      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                      transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--primary-color, #4f46e5)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,70,229,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-color, #d1d5db)';
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                    }}
                  >

                    {/* Product Image with proper fallback */}
                    <div style={{
                      flexShrink: 0,
                      width: '120px',
                      height: '120px',
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

                      {/* Store Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: `${storeColor}18`,
                          color: storeColor,
                          border: `1px solid ${storeColor}40`,
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                        }}>
                          {product.storeIcon && <span>{product.storeIcon}</span>}
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
                            background: product.availability === 'In Stock' || product.inStock
                              ? 'rgba(34,197,94,0.1)'
                              : 'rgba(239,68,68,0.1)',
                            color: product.availability === 'In Stock' || product.inStock
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
                        fontSize: '16px',
                        fontWeight: '700',
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
                        <Clock size={11} />
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
                        {product.originalPrice && product.originalPrice > product.price && (
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

                      {/* Proceed to Checkout Button */}
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 16px',
                          borderRadius: 'var(--radius-md, 8px)',
                          background: 'var(--primary-color, #4f46e5)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '600',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                          transition: 'opacity 0.2s ease, transform 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.opacity = '0.88';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <ExternalLink size={13} />
                        Checkout
                      </a>

                      {/* Remove from cart Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={loading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 14px',
                          borderRadius: 'var(--radius-md, 8px)',
                          border: '1.5px solid var(--border-color, #d1d5db)',
                          background: 'transparent',
                          color: 'var(--text-muted, #6b7280)',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.5 : 1,
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => {
                          if (!loading) {
                            e.currentTarget.style.borderColor = 'var(--danger-color, #ef4444)';
                            e.currentTarget.style.color = 'var(--danger-color, #ef4444)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-color, #d1d5db)';
                          e.currentTarget.style.color = 'var(--text-muted, #6b7280)';
                        }}
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Confirm Dialog for Clear Cart */}
      {showClearConfirm && (
        <ConfirmDialog
          title="Clear Cart?"
          message="Are you sure you want to remove all items from your saved list? This action cannot be undone."
          confirmText="Clear"
          cancelText="Cancel"
          onConfirm={handleClearCart}
          onCancel={() => setShowClearConfirm(false)}
          isDestructive
        />
      )}
    </div>
  );
};

export default CartPage;
