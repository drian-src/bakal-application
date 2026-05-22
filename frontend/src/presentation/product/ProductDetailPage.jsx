import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, Clipboard } from 'lucide-react';
// Star icon removed from product rating display

import HomeHeader from '../home/sections/Header/HomeHeader';
import { getCurrentUser, isAuthenticated } from '../../core/services/authService';
import { getProductDetail } from '@/core/services/apiService';
import { useCart } from '../../core/hooks/useCart';
import { getStoreColor } from '@/core/config/storeConfig';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { id: productId, productId: paramProductId } = useParams();
  // Handle both routes: /product/:id and /product/:platform/:productId
  const resolvedProductId = productId || paramProductId;
  const navigate = useNavigate();
  const { addToCart, loading: cartLoading } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch product details from backend API
  useEffect(() => {
    const fetchProduct = async () => {
      if (!resolvedProductId) {
        setError('No product ID provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Pass productId only — platform is not needed for DB lookup by UUID
        const response = await getProductDetail(resolvedProductId);
        if (!response) {
          setError('Product not found.');
        } else {
          setProduct(response);
          // 🔍 DEBUG: Log product details to verify SKU and other fields are present
          if (process.env.NODE_ENV === 'development') {
            console.log('[ProductDetailPage] Product loaded:', {
              title: response.title,
              sku: response.sku,
              brand: response.brand,
              variation: response.variation,
              allFields: Object.keys(response).sort()
            });
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load product.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [resolvedProductId]); // remove `platform` from dependency array

  if (loading) {
    return (
      <div className="product-detail-page">
        <HomeHeader />
        <main className="product-detail-content">
          <div className="loading-message">
            <p>Loading product details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <HomeHeader />
        <main className="product-detail-content">
          <div className="error-message">
            <p>{error ? `Error: ${error}` : 'Product not found'}</p>
            <button 
              onClick={() => navigate('/home')} 
              className="back-btn"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <Home size={20} strokeWidth={1.5} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  const getPlatformColor = (platform) => {
    if (!platform) return '#D4AF37';
    return getStoreColor(platform) || '#D4AF37';
  };

  const handleAddToCart = async () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      alert('Please log in first to add items to cart.');
      setTimeout(() => navigate('/login'), 500);
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('Session expired. Please log in again.');
      setTimeout(() => navigate('/login'), 500);
      return;
    }

    setIsLoading(true);
    const success = await addToCart(product.id, 1);
    
    if (success) {
      setAddedToCart(true);
      setIsLoading(false);
      
      // Reset UI after 2 seconds
      setTimeout(() => {
        setAddedToCart(false);
      }, 2000);
    } else {
      setIsLoading(false);
    }
  };



  return (
    <div className="product-detail-page">
      <HomeHeader />
      <main className="product-detail-content">
        <div className="product-detail-container">
          <button onClick={() => navigate(-1)} className="back-button-detail">← Back</button>
          <div className="product-detail-wrapper">
            <div className="detail-image-section">
              <div style={{
                width: '100%',
                maxWidth: '400px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border-color, #d1d5db)',
                background: 'var(--image-bg, #f9fafb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                aspectRatio: '1',
              }}>
                {product?.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="detail-product-image"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.product-image-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="product-image-fallback"
                  style={{
                    display: product?.image_url ? 'none' : 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    gap: '8px',
                    position: 'absolute',
                    inset: 0,
                  }}
                >
                  <svg
                    width="48"
                    height="48"
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
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', fontWeight: '500' }}>
                    No image available
                  </span>
                </div>
              </div>
              <div className="platform-badge-detail" style={{ backgroundColor: getPlatformColor(product.platform) }}>
                {product.platform}
              </div>
            </div>
            <div className="detail-info-section">
              <h1 className="product-detail-title">{product.title}</h1>
<div className="product-rating-detail">
                {/* Rating stars removed (keeping rating value + review count) */}
                <span className="rating-value">{product.rating || 'N/A'}</span>
                <span className="review-count">({product.reviews_count || 0} reviews)</span>
              </div>
              <div className="price-section">
                <p className="price-label">Price</p>
                <p className="price-value">₱{(product.price || 0).toLocaleString()}</p>
              </div>

              {/* 🆕 PRICING & DISCOUNT SECTION */}
              {(product.original_price || product.discount_percent || product.promo_label) && (
                <div className="pricing-details-section" style={{
                  backgroundColor: '#f9fafb',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginTop: '16px',
                  marginBottom: '16px',
                  fontSize: '14px',
                }}>
                  {product.original_price && product.original_price > product.price && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: '8px' }}>
                        ₱{(product.original_price || 0).toLocaleString()}
                      </span>
                      <span style={{ color: '#ef4444', fontWeight: '600' }}>
                        Save ₱{((product.original_price - product.price) || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {product.discount_percent > 0 && (
                    <div style={{ marginBottom: '8px', color: '#059669' }}>
                      <strong>{Math.round(product.discount_percent)}% Discount</strong>
                    </div>
                  )}
                  {product.promo_label && (
                    <div style={{ 
                      display: 'inline-block',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '500'
                    }}>
                      {product.promo_label}
                    </div>
                  )}
                </div>
              )}

              {/* 🆕 PRODUCT DETAILS SECTION — Always visible if any details exist */}
              {(product.brand || product.sku || product.variation) && (
                <div className="product-details-section" style={{
                  marginTop: '16px',
                  marginBottom: '16px',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(212, 175, 55, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px', color: '#1f2937', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clipboard size={16} strokeWidth={1.5} />
                    Product Details
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {product.brand && (
                      <div>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>Brand</p>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{product.brand}</p>
                      </div>
                    )}
                    {product.sku && (
                      <div>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>SKU</p>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', wordBreak: 'break-word' }}>{product.sku}</p>
                      </div>
                    )}
                    {product.variation && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>Variation</p>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{product.variation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🆕 AVAILABILITY SECTION */}
              {product.stock !== null || product.is_available !== null && (
                <div className="availability-section" style={{
                  marginTop: '16px',
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: product.is_available ? '#ecfdf5' : '#fef2f2',
                  borderLeft: `4px solid ${product.is_available ? '#10b981' : '#ef4444'}`,
                }}>
                  <p style={{ fontSize: '14px', marginBottom: '4px' }}>
                    <strong>Availability:</strong>{' '}
                    <span style={{ color: product.is_available ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {product.is_available ? (
                          <>
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </>
                        ) : (
                          <>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </>
                        )}
                      </svg>
                      {product.is_available ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </p>
                  {product.stock !== null && (
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                      <strong>Stock:</strong> {product.stock} {product.stock === 1 ? 'unit' : 'units'} available
                    </p>
                  )}
                </div>
              )}

              {/* 🆕 FREE ITEMS SECTION */}
              {product.free_items && Array.isArray(product.free_items) && product.free_items.length > 0 && (
                <div className="free-items-section" style={{
                  marginTop: '16px',
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#fef9e7',
                  borderLeft: '4px solid #f59e0b',
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#d97706' }}>
                    🎁 Free Items Included
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {product.free_items.map((item, idx) => (
                      <li key={idx} style={{ fontSize: '14px', padding: '4px 0', color: '#6b7280' }}>
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 🆕 SPECIFICATIONS SECTION WITH DROPDOWN */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <div className="specs-section">
                  <button 
                    className="specs-toggle-btn" 
                    onClick={() => setShowSpecs(!showSpecs)}
                  >
                    <span className="specs-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="9" x2="15" y2="9"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                      </svg>
                      Specifications
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showSpecs ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {showSpecs && (
                    <ul className="specs-list">
                      {Object.entries(product.specs).map(([key, value]) => (
                        <li key={key} className="spec-item">
                          <span className="spec-key">{key}:</span>
                          <span className="spec-value">{value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                <button 
                  className={`add-to-cart-btn ${addedToCart ? 'added' : ''}`} 
                  onClick={handleAddToCart} 
                  disabled={isLoading || cartLoading}
                >
                  <svg className="button-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isLoading || cartLoading ? (
                      <>
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </>
                    ) : addedToCart ? (
                      <polyline points="20 6 9 17 4 12"></polyline>
                    ) : (
                      <>
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                      </>
                    )}
                  </svg>
                  <span className="button-text">
                    {isLoading || cartLoading ? 'Processing...' : addedToCart ? 'Added to Cart' : 'Add to Cart'}
                  </span>
                </button>
                <a 
                  href={product.product_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="view-on-btn"
                >
                  <svg className="button-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  <span className="button-text">View on {product.platform}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetailPage;
