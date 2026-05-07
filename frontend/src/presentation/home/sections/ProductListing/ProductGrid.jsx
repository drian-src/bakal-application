import React from 'react';
import ProductCard from './ProductCard';
import './ProductListing.css';

const ProductGrid = () => {
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Fetch all products from backend API
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual backend API endpoint
        // const response = await fetch('/api/products');
        // const data = await response.json();
        // setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <section className="product-grid-section">
      <h2 className="section-title">All Products</h2>
      {loading ? (
        <div>Loading products...</div>
      ) : error ? (
        <div>Error loading products: {error}</div>
      ) : products.length === 0 ? (
        <div>No products available</div>
      ) : (
        <div className="product-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductGrid;