import React from 'react';

const Rating = ({ rating, reviews }) => {
  const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  
  return (
    <div className="rating-component">
      <span className="stars">{stars}</span>
      <span className="rating-value">{rating}</span>
      {reviews && <span className="reviews-count">({reviews})</span>}
    </div>
  );
};

export default Rating;
