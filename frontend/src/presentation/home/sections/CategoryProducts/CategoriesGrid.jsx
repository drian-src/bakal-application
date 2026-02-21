import React from 'react';
import './CategoriesGrid.css';

const CategoriesGrid = () => {
  const categories = [
    { id: 1, name: 'Phones', emoji: '📱', color: '#1a5490' },
    { id: 2, name: 'Tablets', emoji: '📱', color: '#2d7a4a' },
    { id: 3, name: 'Laptops', emoji: '💻', color: '#c94c2f' },
    { id: 4, name: 'Computers', emoji: '🖥️', color: '#8e44ad' },
    { id: 5, name: 'Accessories', emoji: '🔌', color: '#f39c12' }
  ];

  return (
    <section className="categories-section">
      <h2 className="categories-title">CATEGORIES</h2>
      <div className="categories-grid">
        {categories.map((cat) => (
          <div key={cat.id} className="category-item" style={{ '--bg-color': cat.color }}>
            <div className="category-emoji">{cat.emoji}</div>
            <div className="category-name">{cat.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoriesGrid;
