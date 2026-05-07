import React, { useState, useEffect } from 'react';
import { searchProducts } from '@/core/services/apiService';
import RecommendedProductCard from './RecommendedProductCard';
import './SeeAllModal.css';
import './SeeAllModal.css';

const SeeAllModal = ({ platform, platformId, query, color, onClose }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('All options');

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        // Fetch up to 20 products for this platform
        const response = await searchProducts(query, platformId, 20);
        if (response && response.products && Array.isArray(response.products)) {
          // Filter to only this platform's products
          const platformProducts = response.products.filter(
            product => product.platform?.toLowerCase() === platformId
          );
          setAllProducts(platformProducts);
        } else {
          setAllProducts([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, [query, platformId]);

  const parsePriceValue = (value) => {
    if (value == null) return 0;
    const normalized = String(value)
      .replace(/[^0-9.,]/g, '')
      .replace(/,/g, '');
    const number = parseFloat(normalized);
    return Number.isNaN(number) ? 0 : number;
  };

  const sortedProducts = React.useMemo(() => {
    if (!allProducts || sortOption === 'All options') {
      return allProducts;
    }

    const direction = sortOption === 'Highest to Lowest' ? -1 : 1;
    return [...allProducts].sort((a, b) => {
      const priceA = parsePriceValue(a.price);
      const priceB = parsePriceValue(b.price);
      return (priceA - priceB) * direction;
    });
  }, [allProducts, sortOption]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="see-all-modal-overlay" onClick={handleOverlayClick}>
      <div className="see-all-modal" style={{ borderColor: color }}>
        <div className="see-all-modal-header">
          <h2 className="see-all-modal-title">
            All {platform} Results for "{query}"
          </h2>
          <div className="see-all-modal-controls">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="sort-select"
            >
              <option value="All options">Sort by Price</option>
              <option value="Lowest to Highest">Lowest to Highest</option>
              <option value="Highest to Lowest">Highest to Lowest</option>
            </select>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="see-all-modal-content">
          {loading && (
            <div className="loading-message">Loading all results...</div>
          )}

          {error && (
            <div className="error-message">Error: {error}</div>
          )}

          {!loading && !error && sortedProducts.length === 0 && (
            <div className="no-results">No products found for this platform.</div>
          )}

          {!loading && !error && sortedProducts.length > 0 && (
            <div className="see-all-products-grid">
              {sortedProducts.map(product => (
                <RecommendedProductCard
                  key={product.id}
                  product={product}
                  platformId={platformId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeeAllModal;