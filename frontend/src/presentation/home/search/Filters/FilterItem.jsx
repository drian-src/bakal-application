import React, { useState } from 'react';

const FilterItem = ({ filter, onFilterChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);

  const handleOptionChange = (option) => {
    let newSelectedOptions;
    if (selectedOptions.includes(option)) {
      newSelectedOptions = selectedOptions.filter(o => o !== option);
    } else {
      newSelectedOptions = [...selectedOptions, option];
    }
    setSelectedOptions(newSelectedOptions);
    
    if (onFilterChange) {
      onFilterChange(filter.id, newSelectedOptions);
    }
  };

  return (
    <div className="filter-item">
      <button 
        className="filter-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="filter-label">
          <span className="filter-icon">{filter.icon}</span>
          <span>{filter.label}</span>
        </div>
        <svg 
          className={`filter-chevron ${expanded ? 'expanded' : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
        >
          <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      
      {expanded && (
        <div className="filter-options-floating">
          {filter.options.map((option, index) => (
            <label key={index} className="filter-option">
              <input 
                type="checkbox" 
                className="filter-checkbox"
                checked={selectedOptions.includes(option)}
                onChange={() => handleOptionChange(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterItem;