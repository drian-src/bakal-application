import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Zap, ShoppingCart } from 'lucide-react';
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
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [shuffledProducts, setShuffledProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch featured deals on mount
  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        const user = getCurrentUser();
        
        // Fetch from new dedicated banner endpoint
        console.log('[AdvertSliderHome] Fetching /api/banners/featured-deals...');
        const response = await fetch('/api/banners/featured-deals');
        
        console.log('[AdvertSliderHome] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch deals: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log('[AdvertSliderHome] Response data:', JSON.stringify(result, null, 2));
        console.log('[AdvertSliderHome] Data items:', result.data?.map((d, i) => ({
          idx: i,
          hasId: !!d.id,
          id: d.id,
          title: d.productTitle,
        })));
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('[AdvertSliderHome] Setting products:', result.data.length);
          setProducts(result.data);
          
          // Apply session-aware shuffle on data load
          const seed = getSessionSeed(user?.id);
          const shuffled = sessionShuffle(result.data, seed);
          console.log('[AdvertSliderHome] Shuffled products:', shuffled.map(p => ({ id: p.id, title: p.productTitle })));
          setShuffledProducts(shuffled);
        } else {
          // If no deals, set empty fallback
          console.warn('[AdvertSliderHome] No data in response');
          setProducts([]);
          setShuffledProducts([]);
        }
      } catch (error) {
        console.error('[AdvertSliderHome] Failed to load deals:', error);
        // Fallback: show empty state or retry message
        setProducts([]);
        setShuffledProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadDeals();
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

  const handleProductClick = (productIndex) => {
    console.log('[AdvertSliderHome] handleProductClick - index:', productIndex, 'shuffledProducts length:', shuffledProducts.length);
    console.log('[AdvertSliderHome] shuffledProducts:', shuffledProducts);
    
    const product = shuffledProducts[productIndex];
    
    console.log('[AdvertSliderHome] handleProductClick called with product:', {
      productIndex,
      productExists: !!product,
      id: product?.id,
      title: product?.productTitle,
      hasId: !!product?.id,
      productDetailUrl: product?.productDetailUrl,
      keys: product ? Object.keys(product) : [],
      fullProduct: product,
    });

    // Ensure we have a valid product
    if (!product) {
      console.error('Error: Product not found at index', productIndex);
      alert('Error: Product data is missing');
      return;
    }

    // Ensure we have an ID
    if (!product.id) {
      console.error('Error: No product ID provided. Product object:', product);
      alert('Error: Cannot navigate - product ID is missing');
      return;
    }

    // Navigate to product detail page
    if (product.productDetailUrl) {
      console.log('[AdvertSliderHome] Navigating to:', product.productDetailUrl);
      // Use the URL from backend
      window.location.href = product.productDetailUrl;
    } else {
      // Fallback: construct URL from product ID and platform
      const platformSlug = (product.platformName || 'product').toLowerCase().replace(/\s+/g, '-');
      const fallbackUrl = `/product/${platformSlug}/${product.id}`;
      console.log('[AdvertSliderHome] Using fallback URL:', fallbackUrl);
      window.location.href = fallbackUrl;
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
          {shuffledProducts.map((product, idx) => (
            <div 
              key={product.id} 
              className="advert-slide-home"
            >
              {/* Product image */}
              <div className="product-image-wrapper">
                <img 
                  src={product.productImage || 'https://via.placeholder.com/400x250?text=Featured'} 
                  alt={product.productTitle} 
                  className="product-image-home"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x250?text=Featured';
                  }}
                />


                {/* Platform badge overlay */}
                <div className="product-platform-badge">
                  <PlatformBadge platform={product.platformName} variant="compact" />
                </div>
              </div>

              {/* Product info - Overlaid on image */}
              <div className="product-info-home">
                {/* Title */}
                <h3 className="product-title-home">{product.productTitle}</h3>
                
                {/* Rating */}
                {product.rating > 0 && (
                  <div className="product-rating">
                    <span className="reviews-count">({product.reviewsCount || 0})</span>
                  </div>
                )}

                {/* Price Section */}
                <div className="price-section-modern">
                  <div className="price-display">
                    <span className="current-price">₱{product.currentPrice?.toLocaleString() || 'N/A'}</span>
                    {product.originalPrice && product.originalPrice > product.currentPrice && (
                      <span className="original-price">₱{product.originalPrice?.toLocaleString()}</span>
                    )}
                  </div>
                  
                  {/* Savings amount */}
                  {product.originalPrice && product.originalPrice > product.currentPrice && (
                    <div className="savings-amount">
                      Save ₱{(product.originalPrice - product.currentPrice).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Promo label if any */}
                {product.promoLabel && (
                  <p className="promo-label-modern">{product.promoLabel}</p>
                )}

                {/* Shop Now Button */}
                <button 
                  className="shop-now-btn"
                  onClick={() => handleProductClick(idx)}
                >
                  <ShoppingCart size={18} />
                  <span>Shop Now</span>
                </button>
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
              title={product.platformName}
              aria-label={`Go to ${product.platformName} deal`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertSliderHome;
