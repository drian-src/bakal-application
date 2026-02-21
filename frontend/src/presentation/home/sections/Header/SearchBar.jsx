import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeHeader.css'; // reuse header styles for consistency

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <form className="header-search large-search" onSubmit={handleSearch}>
      <input
        type="text"
        placeholder="Search for electronics..."
        className="search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button type="submit" className="search-button" title="Search">
        Search
      </button>
    </form>
  );
};

export default SearchBar;
