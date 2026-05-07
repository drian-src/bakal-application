import React from 'react';
import ProductCard from '../ProductListing/ProductCard';

const CategoryRow = ({ category }) => {
  return (
    <div className="category-row">
      <h3 className="category-title">{category.name}</h3>
      <div className="category-products-scroll">
        {category.products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default CategoryRow;