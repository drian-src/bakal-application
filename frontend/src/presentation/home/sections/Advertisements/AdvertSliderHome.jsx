import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFeaturedProducts } from '@/core/services/apiService';
import { getCurrentUser } from '@/core/services/authService';
import PlatformBadge from '@/presentation/shared/PlatformBadge';
import './AdvertSliderHome.css';

/**
 * Seeded shuffle using user ID + date so:
 * - Same user sees different order each day
 * - Two users see different orders simultaneously
 * - Order is stable within the same session (no re-shuffle on re-render)
 */
function sessionShuffle(array, seed = 0) {
  const arr = [...array];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a deterministic seed from user ID and current date.
 * Ensures different users see different orders on the same day,
 * and same user sees different order on different days.
 */
function getSessionSeed(userId) {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const str   = `${userId || 'guest'}-${today}`;
  // Simple string hash → integer seed
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const AdvertSliderHome = () => {
  const [products, setProducts] = useState([]);
  const [shuffledProducts, setShuffledProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch featured products on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const user = getCurrentUser();
        const data = await getFeaturedProducts();
        setProducts(data || []);
        
        // Apply session-aware shuffle on data load
        if (data && data.length > 0) {
          const seed = getSessionSeed(user?.id);
          setShuffledProducts(sessionShuffle(data, seed));
        }
      } catch (error) {
        console.error('Failed to load featured products:', error);
        setProducts([]);
        setShuffledProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (shuffledProducts.length === 0) return;
    
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % shuffledProducts.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [shuffledProducts.length]);

  const handlePrevious = () => {
    setIndex((i) => (i - 1 + shuffledProducts.length) % shuffledProducts.length);
  };

  const handleNext = () => {
    setIndex((i) => (i + 1) % shuffledProducts.length);
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
  if (!shuffledProducts || shuffledProducts.length === 0) {
    return (
      <div className="advert-slider-home empty">
        <div className="empty-message">Featured deals not available</div>
      </div>
    );
  }

  const currentProduct = shuffledProducts[index];

  return (
    <div className="advert-slider-home">
      {/* Main carousel display */}
      <div className="advert-carousel-container">
        {shuffledProducts.length > 1 && (
          <button 
            className="carousel-nav-btn prev" 
            onClick={handlePrevious}
            aria-label="Previous platform deal"
          >
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
        )}

        <div className="advert-track-home" style={{ transform: `translateX(-${index * 100}%)` }}>
          {shuffledProducts.map((product) => (
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

        {shuffledProducts.length > 1 && (
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
