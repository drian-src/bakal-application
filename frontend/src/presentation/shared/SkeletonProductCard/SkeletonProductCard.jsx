/**
 * Skeleton Product Card - Loading Placeholder
 * Displays while product data is being fetched
 * Uses CSS animations for smooth skeleton effect
 */

import React from 'react';
import './SkeletonProductCard.css';

const SkeletonProductCard = () => {
  return (
    <div className="skeleton-card">
      {/* Image Skeleton */}
      <div className="skeleton-image" />

      {/* Content Skeleton */}
      <div className="skeleton-content">
        {/* Brand Skeleton */}
        <div className="skeleton-line skeleton-brand" />

        {/* Title Skeleton (2 lines) */}
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-title-short" />

        {/* Rating Skeleton */}
        <div className="skeleton-line skeleton-rating" />

        {/* Price Skeleton */}
        <div className="skeleton-line skeleton-price" />

        {/* Platform Badge Skeleton */}
        <div className="skeleton-line skeleton-badge" />

        {/* Action Button Skeleton */}
        <div className="skeleton-line skeleton-button" />
      </div>
    </div>
  );
};

export default SkeletonProductCard;
