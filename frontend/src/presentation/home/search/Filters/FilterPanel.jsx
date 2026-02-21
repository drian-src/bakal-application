import React, { useState } from 'react';
import FilterItem from './FilterItem';
import './Filters.css';

const FilterPanel = ({ onFilterChange }) => {
  const [selectedFilters, setSelectedFilters] = useState({});

  const filters = [
    {
      id: 'price',
      label: 'Price Range',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      options: ['Highest to Lowest', 'Lowest to Highest', 'All options']
    },
    {
      id: 'rating',
      label: 'Product Rating',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      options: ['5 ★', '4 ★', '3 ★', '2 ★', '1 ★', 'All options']
    },
    {
      id: 'seller',
      label: 'Seller Rating',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2"/>
          <circle cx="12" cy="7" r="4" strokeWidth="2"/>
        </svg>
      ),
      options: ['5 ★', '4 ★', '3 ★', '2 ★', '1 ★', 'All options']
    }
  ];

  const handleFilterChange = (filterId, selectedOptions) => {
    const newSelectedFilters = {
      ...selectedFilters,
      [filterId]: selectedOptions
    };
    setSelectedFilters(newSelectedFilters);
    
    if (onFilterChange) {
      onFilterChange(filterId, selectedOptions);
    }
  };

  return (
    <div className="filter-navbar">
      <div className="filter-navbar-header">
        <span className="filter-navbar-title">Filters</span>
      </div>
      <div className="filter-navbar-content">
        {filters.map(filter => (
          <FilterItem 
            key={filter.id} 
            filter={filter}
            onFilterChange={handleFilterChange}
          />
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;