import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HomeHeader from '../home/sections/Header/HomeHeader';
import { getCurrentUser, isAuthenticated } from '../../core/services/authService';
import { getProductDetail } from '@/core/services/apiService';
import { useCart } from '../../core/hooks/useCart';
import { getStoreColor } from '@/core/config/storeConfig';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { productId, platform } = useParams();
  const navigate = useNavigate();
  const { addToCart, loading: cartLoading } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch product details from backend API
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await getProductDetail(platform, productId);
        setProduct(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, platform]);

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
            <button onClick={() => navigate('/home')} className="back-btn">Back to Home</button>
          </div>
        </main>
      </div>
    );
  }

  const getPlatformColor = (platform) => {
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
                <div className="stars-detail">
                  {'★'.repeat(Math.floor(product.rating || 0))}
                  {'☆'.repeat(5 - Math.floor(product.rating || 0))}
                </div>
                <span className="rating-value">{product.rating || 'N/A'}</span>
                <span className="review-count">({product.reviews_count || 0} reviews)</span>
              </div>
              <div className="price-section">
                <p className="price-label">Price</p>
                <p className="price-value">₱{(product.price || 0).toLocaleString()}</p>
              </div>
              <div className="seller-info">
                <div className="seller-item">
                  <span className="seller-label">Seller</span>
                  <span className="seller-value">{product.seller_name || 'N/A'}</span>
                </div>
                <div className="seller-item">
                  <span className="seller-label">Product URL</span>
                  <span className="seller-value">
                    <a href={product.product_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                      View on {product.platform}
                    </a>
                  </span>
                </div>
              </div>
              {/* Free shipping badge removed per design request */}
              <div className="action-buttons">
                <button className={`add-to-cart-btn ${addedToCart ? 'added' : ''}`} onClick={handleAddToCart} disabled={isLoading || cartLoading}>
                  {isLoading || cartLoading ? '⏳ Processing...' : addedToCart ? '✓ Added to Cart' : '🛒 Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetailPage;
