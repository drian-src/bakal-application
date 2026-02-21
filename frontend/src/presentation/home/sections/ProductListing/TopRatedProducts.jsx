import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TopRatedProducts.css';

const TopRatedProducts = () => {
  const gridRef = React.useRef(null);
  const navigate = useNavigate();
  const [recentProducts, setRecentProducts] = React.useState([]);
  const [personalizedProducts, setPersonalizedProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Fetch recent products and personalized recommendations from backend API
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual backend API endpoints
        // const [recent, recommended] = await Promise.all([
        //   fetch('/api/products/recent').then(r => r.json()),
        //   fetch('/api/products/recommended').then(r => r.json())
        // ]);
        // setRecentProducts(recent);
        // setPersonalizedProducts(recommended);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);
  const handleScroll = (direction) => {
    if (gridRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = gridRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      gridRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <div className="stars-container">
        {Array(fullStars).fill('★').map((_, i) => (
          <span key={`full-${i}`} className="star full">★</span>
        ))}
        {hasHalf && <span className="star half">★</span>}
        {Array(emptyStars).fill('☆').map((_, i) => (
          <span key={`empty-${i}`} className="star empty">☆</span>
        ))}
      </div>
    );
  };

  if (loading) {
    return <section className="product-sections"><div>Loading products...</div></section>;
  }

  if (error) {
    return <section className="product-sections"><div>Error loading products: {error}</div></section>;
  }

  return (
    <section className="product-sections">
      {/* Recent searches */}
      {recentProducts.length > 0 && (
        <>
          <div className="products-header">
            <h2 className="products-title">Recently Searched Products</h2>
            <div className="header-right">
              <div className="nav-arrows">
                <button className="arrow-btn" aria-label="Previous" onClick={() => handleScroll('left')}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <button className="arrow-btn" aria-label="Next" onClick={() => handleScroll('right')}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="products-grid" ref={gridRef}>
            {recentProducts.map((product) => (
              <div key={product.id} className="product-card" onClick={() => navigate(`/product/${product.platform}/${product.id}`)}>
                <div className="product-image-container">
                  <img src={product.image} alt={product.name} className="product-image" />
                  <div className="platform-badge">{product.platformLabel || product.platform}</div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <div className="product-price">₱{product.price?.toLocaleString() || 'N/A'}</div>
                  <div className="product-rating">
                    {renderStars(product.rating)}
                    <span className="rating-number">{product.rating}</span>
                    <span className="review-count">({product.reviews})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Personalized recommendations */}
      {personalizedProducts.length > 0 && (
        <>
          <div className="products-header personalized">
            <h2 className="products-title">Personalized Recommended Products</h2>
          </div>
          <div className="products-grid" ref={gridRef}>
            {personalizedProducts.map((product) => (
              <div key={product.id} className="product-card" onClick={() => navigate(`/product/${product.platform}/${product.id}`)}>
                <div className="product-image-container">
                  <img src={product.image} alt={product.name} className="product-image" />
                  <div className="platform-badge">{product.platformLabel || product.platform}</div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <div className="product-price">₱{product.price?.toLocaleString() || 'N/A'}</div>
                  <div className="product-rating">
                    {renderStars(product.rating)}
                    <span className="rating-number">{product.rating}</span>
                    <span className="review-count">({product.reviews})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default TopRatedProducts;
