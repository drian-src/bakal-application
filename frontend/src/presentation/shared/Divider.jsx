import React from 'react';
import './Divider.css';

const Divider = ({ text = 'OR' }) => {
  return (
    <div className="divider">
      <div className="divider-line"></div>
      <span className="divider-text">{text}</span>
      <div className="divider-line"></div>
    </div>
  );
};

export default Divider;