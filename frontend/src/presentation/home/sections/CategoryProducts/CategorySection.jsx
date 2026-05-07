import React, { useState, useEffect } from 'react';
import CategoryRow from './CategoryRow';
import './CategoryProducts.css';

const CategorySection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories from backend API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual backend API endpoint
        // const response = await fetch('/api/categories');
        // const data = await response.json();
        // setCategories(data);
        setCategories([]); // Empty state until backend is available
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <section className="category-section">
      <h2 className="section-title">Product Categories</h2>
      {loading ? (
        <div>Loading categories...</div>
      ) : error ? (
        <div>Error loading categories: {error}</div>
      ) : categories.length === 0 ? (
        <div>No categories available</div>
      ) : (
        categories.map((category, index) => (
          <CategoryRow key={index} category={category} />
        ))
      )}
    </section>
  );
};

export default CategorySection;