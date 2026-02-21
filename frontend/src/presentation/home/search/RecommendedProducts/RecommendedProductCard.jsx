import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rating, PriceTag } from '../../../shared';

const RecommendedProductCard = ({ product, platformId }) => {
  const navigate = useNavigate();

  const platformColors = {
    pcexpress: '#004080',
    villman: '#008000',
    pcworx: '#800080',
    tiktok: '#FE2C55',
    shopee: '#EE4D2D',
    lazada: '#0F156D'
  };

  const color = platformColors[platformId?.toLowerCase()] || '#D4AF37';
  
  // Use actual product image if available, otherwise use placeholder
  const imageUrl = product.image_url || `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22${encodeURIComponent(color)}%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%23FFF%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E`;

  const handleCardClick = () => {
    // Use the platform name from the product data (e.g., "PCExpress") for the route
    const platformName = product.platform || platformId;
    navigate(`/product/${platformName}/${product.id}`);
  };

  return (
    <div className="recommended-product-card" onClick={handleCardClick}>
      <div className="rank-badge">#{product.rank || '★'}</div>
      
      <div className="rec-product-image-container">
        <img src={imageUrl} alt={product.title} className="rec-product-image" onError={(e) => {e.target.src = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22${encodeURIComponent(color)}%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2212%22 fill=%22%23FFF%22 text-anchor=%22middle%22 dy=%22.3em%22%3EImage not found%3C/text%3E%3C/svg%3E`;}} />
      </div>
      
      <div className="rec-product-info">
        <h4 className="rec-product-name">{product.title}</h4>
        
        <div className="rec-product-rating">
          <Rating rating={product.rating} reviewCount={product.reviews_count} />
        </div>
        
        <div className="rec-product-price">
          <PriceTag price={product.price} />
        </div>
      </div>
    </div>
  );
};

export default RecommendedProductCard;