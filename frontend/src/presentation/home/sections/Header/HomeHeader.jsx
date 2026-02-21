import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../../../shared';
import './HomeHeader.css';

const HomeHeader = ({ hideSearch = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === '/search';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleBackClick = () => {
    navigate('/home');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="home-header">
      <div className="header-container">
        {isSearchPage && (
          <button className="back-button" onClick={handleBackClick} title="Back to Home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        
        <div className="header-logo">
          <Logo size="xlarge" />
        </div>
        
        {!hideSearch && (
          <form className="header-search" onSubmit={handleSearch}>
            <input 
              type="text" 
              placeholder="Search products across all platforms..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-button" title="Search">
              Search
            </button>
          </form>
        )}
        
        <div className="header-profile">
          <div className="profile-icon" onClick={handleProfileClick} title="View Profile">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;