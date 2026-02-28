import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../../../shared';
import { useCart } from '../../../../core/hooks/useCart';
import { getCurrentUser } from '../../../../core/services/authService';
import './HomeHeader.css';

const HomeHeader = ({ hideSearch = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === '/search';
  const { cartCount } = useCart();

  // Get current user and derive display name
  const user = getCurrentUser();
  const displayName = user?.name
    ?? user?.displayName
    ?? user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? null;
  const firstName = displayName ? displayName.split(' ')[0] : null;

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

  const handleCartClick = () => {
    navigate('/cart');
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
          <div className="cart-icon-wrapper" onClick={handleCartClick} title="View Cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>

          {/* Profile pill — avatar + name */}
          <div className="profile-pill" onClick={handleProfileClick} title={displayName ? `${displayName} - View Profile` : 'View Profile'}>
            <div className="profile-avatar">
              <span className="profile-avatar-letter">
                {firstName ? firstName.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            {firstName && (
              <span className="profile-name">{firstName}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;