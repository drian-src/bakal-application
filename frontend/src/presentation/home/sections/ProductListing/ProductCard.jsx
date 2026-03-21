import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rating, PlatformBadge, PriceTag } from '../../../shared';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${product.platform}/${product.id}`);
  };

  return (
    <div className="product-card" onClick={handleCardClick}>
      <div className="product-image-container">
        <img src={product.image} alt={product.name} className="product-image" />
        <div className="product-platform-badge">
          <PlatformBadge platform={product.platform} />
        </div>
      </div>
        
      <div className="product-info">
        <h4 className="product-name">{product.name}</h4>
        <div className="product-rating">
          <Rating rating={product.rating} reviewCount={product.reviews} />
        </div>
        <div className="product-price">
          <PriceTag price={product.price} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;