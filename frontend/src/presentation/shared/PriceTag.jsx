import React from 'react';

const PriceTag = ({ price, originalPrice, discount }) => {
  return (
    <div className="price-tag">
      <span className="current-price">₱{price}</span>
      {originalPrice && (
        <>
          <span className="original-price">₱{originalPrice}</span>
          {discount && <span className="discount-badge">{discount}% OFF</span>}
        </>
      )}
    </div>
  );
};

export default PriceTag;
