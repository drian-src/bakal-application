import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ 
  isOpen, 
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = false,
  icon = null
}) => {
  if (!isOpen) return null;

  const defaultIcon = isDanger ? (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="dialog-icon-svg">
      <circle cx="24" cy="24" r="20" fill="currentColor" opacity="0.1"/>
      <path d="M24 16V24M24 32H24.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="dialog-icon-svg">
      <circle cx="24" cy="24" r="20" fill="currentColor" opacity="0.1"/>
      <path d="M20 24L24 28L32 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className={`confirm-dialog ${isDanger ? 'danger' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-visual">
          <div className={`dialog-icon-wrapper ${isDanger ? 'danger' : ''}`}>
            {icon || defaultIcon}
          </div>
        </div>

        <div className="confirm-dialog-content-wrapper">
          <h2 className="confirm-dialog-title">{title}</h2>
          <p className="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog-actions">
          <button 
            className="confirm-dialog-btn cancel-btn" 
            onClick={onCancel}
          >
            <span>{cancelText}</span>
          </button>
          <button 
            className={`confirm-dialog-btn confirm-btn ${isDanger ? 'danger' : ''}`}
            onClick={onConfirm}
          >
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

