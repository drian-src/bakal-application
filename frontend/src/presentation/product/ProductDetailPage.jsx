import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HomeHeader from '../home/sections/Header/HomeHeader';
import { getCurrentUser, isAuthenticated } from '../../core/services/authService';
import { getProductDetail } from '@/core/services/apiService';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { productId, platform } = useParams();
  const navigate = useNavigate();
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
    if (platform === 'PCExpress') return '#004080';
    if (platform === 'VillMan') return '#008000';
    if (platform === 'PCWorx') return '#800080';
    return '#D4AF37';
  };

  const handleAddToCart = () => {
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
    setTimeout(() => {
      setAddedToCart(true);
      setIsLoading(false);

      // Prepare platform URLs with user info
      const platformUrls = {
        'PCExpress': 'https://pcexpress.com/search?keyword=' + encodeURIComponent(product.title),
        'VillMan': 'https://villman.com.ph/search?q=' + encodeURIComponent(product.title),
        'PCWorx': 'https://pcworx.com/search?query=' + encodeURIComponent(product.title)
      };

      const url = platformUrls[product.platform] || 'https://pcexpress.com';
      
      setTimeout(() => {
        window.open(url, '_blank');
        setAddedToCart(false);
      }, 800);
    }, 800);
  };



  return (
    <div className="product-detail-page">
      <HomeHeader />
      <main className="product-detail-content">
        <div className="product-detail-container">
          <button onClick={() => navigate(-1)} className="back-button-detail">← Back</button>
          <div className="product-detail-wrapper">
            <div className="detail-image-section">
              <img src={product.image_url || 'https://via.placeholder.com/400'} alt={product.title} className="detail-product-image" />
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
                <button className={`add-to-cart-btn ${addedToCart ? 'added' : ''}`} onClick={handleAddToCart} disabled={isLoading}>
                  {isLoading ? '⏳ Processing...' : addedToCart ? '✓ Added to Cart' : '🛒 Add to Cart'}
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
