import React from 'react';
import './SkeletonLoaders.css';

/**
 * Skeleton loader for stat cards
 */
export const SkeletonStatCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-icon"></div>
    <div className="skeleton-line skeleton-line-sm"></div>
    <div className="skeleton-line skeleton-line-lg"></div>
    <div className="skeleton-line skeleton-line-xs"></div>
  </div>
);

/**
 * Skeleton loader for history items
 */
export const SkeletonHistoryItem = () => (
  <div className="skeleton-history-item">
    <div className="skeleton-line skeleton-line-md"></div>
    <div className="skeleton-line skeleton-line-sm"></div>
    <div className="skeleton-button"></div>
  </div>
);

/**
 * Skeleton loader for saved search items
 */
export const SkeletonSavedSearchItem = () => (
  <div className="skeleton-saved-search">
    <div className="skeleton-icon-small"></div>
    <div className="skeleton-search-content">
      <div className="skeleton-line skeleton-line-md"></div>
      <div className="skeleton-line skeleton-line-sm"></div>
    </div>
    <div className="skeleton-buttons">
      <div className="skeleton-button-small"></div>
      <div className="skeleton-button-small"></div>
    </div>
  </div>
);

/**
 * Skeleton loader for settings item
 */
export const SkeletonSettingsItem = () => (
  <div className="skeleton-settings-item">
    <div className="skeleton-icon"></div>
    <div className="skeleton-settings-content">
      <div className="skeleton-line skeleton-line-md"></div>
      <div className="skeleton-line skeleton-line-sm"></div>
    </div>
  </div>
);

/**
 * Skeleton loader for help accordion
 */
export const SkeletonHelpItem = () => (
  <div className="skeleton-help-item">
    <div className="skeleton-icon"></div>
    <div className="skeleton-help-content">
      <div className="skeleton-line skeleton-line-md"></div>
      <div className="skeleton-line skeleton-line-sm"></div>
    </div>
    <div className="skeleton-chevron"></div>
  </div>
);

/**
 * Container for multiple skeleton loaders
 */
export const SkeletonContainer = ({ children, count = 3 }) => (
  <div className="skeleton-container">
    {Array.from({ length: count }).map((_, i) => (
      <React.Fragment key={i}>{children}</React.Fragment>
    ))}
  </div>
);

export default {
  SkeletonStatCard,
  SkeletonHistoryItem,
  SkeletonSavedSearchItem,
  SkeletonSettingsItem,
  SkeletonHelpItem,
  SkeletonContainer,
};
