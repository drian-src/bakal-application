import React from 'react';
import '../../styles/auth.css';
import AdvertSlider from '../shared/AdvertSlider';

const AuthLayout = ({ children, showIllustration = true, illustrationPosition = 'right' }) => {
  const renderIllustration = () => (
    <div className="auth-illustration-section">
      <AdvertSlider />
    </div>
  );

  return (
    <div className="auth-page">
      <div className={`auth-container ${showIllustration ? '' : 'no-illustration'}`}>
        {illustrationPosition === 'left' && showIllustration && renderIllustration()}

        <div className="auth-form-section">
          {children}
        </div>

        {illustrationPosition === 'right' && showIllustration && renderIllustration()}
      </div>
    </div>
  );
};

export default AuthLayout;