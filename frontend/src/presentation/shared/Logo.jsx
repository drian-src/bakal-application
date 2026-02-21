import React from 'react';
import './Logo.css';
import logoImage from '../../core/images/logo.svg';

const Logo = ({ size = 'medium', showText = false }) => {
  const logoClasses = [
    'logo',
    `logo-${size}`
  ].filter(Boolean).join(' ');

  return (
    <div className={logoClasses}>
      <div className="logo-icon">
        <img 
          src={logoImage} 
          alt="Bakàl logo"
          className="logo-image"
        />
      </div>

      {showText && (
        <span className="logo-text">Bakàl</span>
      )}
    </div>
  );
};

export default Logo;