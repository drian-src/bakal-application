import React from 'react';
import './PasswordStrength.css';

const PasswordStrength = ({ password }) => {
  const getStrength = (pass) => {
    if (!pass) return { level: 0, text: '', color: '' };
    
    let strength = 0;
    
    if (pass.length >= 8) strength++;
    if (pass.length >= 12) strength++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[^a-zA-Z0-9]/.test(pass)) strength++;
    
    if (strength <= 2) {
      return { level: 1, text: 'Weak', color: 'weak' };
    } else if (strength <= 3) {
      return { level: 2, text: 'Medium', color: 'medium' };
    } else {
      return { level: 3, text: 'Strong', color: 'strong' };
    }
  };

  const strength = getStrength(password);
  
  if (!password) return null;

  return (
    <div className="password-strength">
      <div className="strength-bars">
        <div className={`strength-bar ${strength.level >= 1 ? `strength-bar-${strength.color}` : ''}`}></div>
        <div className={`strength-bar ${strength.level >= 2 ? `strength-bar-${strength.color}` : ''}`}></div>
        <div className={`strength-bar ${strength.level >= 3 ? `strength-bar-${strength.color}` : ''}`}></div>
      </div>
      <span className={`strength-text strength-text-${strength.color}`}>
        {strength.text}
      </span>
    </div>
  );
};

export default PasswordStrength;