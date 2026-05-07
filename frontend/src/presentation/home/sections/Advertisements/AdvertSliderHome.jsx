import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFeaturedProducts } from '@/core/services/apiService';
import PlatformBadge from '@/presentation/shared/PlatformBadge';
import './AdvertSliderHome.css';

const AdvertSliderHome = () => {
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch featured products on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await getFeaturedProducts();
        setProducts(data || []);
      } catch (error) {
        console.error('Failed to load featured products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  // Auto-rotate carousel every 6 seconds
  useEffect(() => {
    if (products.length === 0) return;
    
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % products.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [products.length]);

  const handlePrevious = () => {
    setIndex((i) => (i - 1 + products.length) % products.length);
  };

  const handleNext = () => {
    setIndex((i) => (i + 1) % products.length);
  };

  const goToSlide = (i) => {
    setIndex(i);
  };

  const handleProductClick = (product) => {
    if (product.product_url) {
      window.open(product.product_url, '_blank');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="advert-slider-home loading">
        <div className="loading-skeleton"></div>
      </div>
    );
  }

  // Show fallback if no products
  if (!products || products.length === 0) {
    return (
      <div className="advert-slider-home empty">
        <div className="empty-message">Featured deals not available</div>
      </div>
    );
  }

  const currentProduct = products[index];

  return (
    <div className="advert-slider-home">
      {/* Main carousel display */}
      <div className="advert-carousel-container">
        {products.length > 1 && (
          <button 
            className="carousel-nav-btn prev" 
            onClick={handlePrevious}
            aria-label="Previous platform deal"
          >
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
        )}

        <div className="advert-track-home" style={{ transform: `translateX(-${index * 100}%)` }}>
          {products.map((product) => (
            <div 
              key={product.id} 
              className="advert-slide-home"
              onClick={() => handleProductClick(product)}
            >
              {/* Product image */}
              <div className="product-image-wrapper">
                <img 
                  src={product.image_url || 'https://via.placeholder.com/400x250?text=Featured'} 
                  alt={product.title} 
                  className="product-image-home"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x250?text=Featured';
                  }}
                />

                {/* Platform badge overlay */}
                <div className="product-platform-badge">
                  <PlatformBadge platform={product.platform} variant="compact" />
                </div>
              </div>

              {/* Product info */}
              <div className="product-info-home">
                <div className="product-header">
                  <h3 className="product-title-home">{product.title}</h3>
                  {product.is_on_sale && product.discount_percent && (
                    <span className="discount-badge-compact">
                      -{Math.round(product.discount_percent)}%
                    </span>
                  )}
                </div>
                
                <div className="product-price-section">
                  <span className="current-price">₱{product.price?.toLocaleString() || 'N/A'}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="original-price">₱{product.original_price?.toLocaleString()}</span>
                  )}
                </div>

                {product.promo_label && (
                  <p className="promo-label">{product.promo_label}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {products.length > 1 && (
          <button 
            className="carousel-nav-btn next" 
            onClick={handleNext}
            aria-label="Next platform deal"
          >
            <ChevronRight size={24} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Carousel dots */}
      {products.length > 1 && (
        <div className="advert-dots-home">
          {products.map((product, i) => (
            <button 
              key={i} 
              className={`dot-home ${i === index ? 'active' : ''}`} 
              onClick={() => goToSlide(i)}
              title={product.platform}
              aria-label={`Go to ${product.platform} deal`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertSliderHome;
