import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import './DeleteAccountSection.css';

export const DeleteAccountSection = ({ onAccountDeleted }) => {
  const [step, setStep] = useState('initial'); // initial, confirm1, confirm2
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInitiateDelete = () => {
    setStep('confirm1');
    setError(null);
  };

  const handleFirstConfirm = () => {
    setStep('confirm2');
  };

  const handleFinalDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        // Try to parse error response, but handle empty body gracefully
        let errorMsg = 'Failed to delete account';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Response body is empty or not JSON — use default error
          console.error('Backend error response:', response.status, response.statusText);
        }
        throw new Error(errorMsg);
      }

      // For successful DELETE, response body might be empty — that's OK
      let data = {};
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (e) {
        // Empty response body is acceptable for DELETE endpoint
        console.log('DELETE response body is empty (expected)');
      }

      // Success: clear auth and redirect
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('bakal_theme');

      // Redirect to home after a brief delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep('initial');
    setError(null);
  };

  return (
    <div className="delete-account-section">
      {/* Initial state */}
      {step === 'initial' && (
        <div className="delete-card delete-card--initial">
          <div className="delete-card-content">
            <div className="delete-card-header">
              <AlertTriangle size={20} strokeWidth={1.5} className="delete-icon" />
              <h3 className="delete-card-title">Delete Account</h3>
            </div>
            <p className="delete-card-description">
              This action is permanent. All your data will be deleted, including search history, saved items, and preferences.
            </p>
            <button
              onClick={handleInitiateDelete}
              className="delete-button delete-button--primary"
            >
              <Trash2 size={16} strokeWidth={1.5} />
              Delete My Account
            </button>
          </div>
        </div>
      )}

      {/* First confirmation */}
      {step === 'confirm1' && (
        <div className="delete-card delete-card--warning">
          <div className="delete-card-content">
            <div className="delete-card-header">
              <AlertTriangle size={20} strokeWidth={1.5} className="delete-icon delete-icon--warning" />
              <h4 className="delete-card-title">Are you absolutely sure?</h4>
            </div>
            <ul className="delete-warning-list">
              <li>✗ Your account will be permanently deleted</li>
              <li>✗ All search history will be erased</li>
              <li>✗ All saved items will be removed</li>
              <li>✗ This cannot be undone</li>
            </ul>
            <div className="delete-button-group">
              <button
                onClick={handleFirstConfirm}
                className="delete-button delete-button--warning"
              >
                Yes, I'm sure
              </button>
              <button
                onClick={handleCancel}
                className="delete-button delete-button--secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final confirmation */}
      {step === 'confirm2' && (
        <div className="delete-card delete-card--danger">
          <div className="delete-card-content">
            <div className="delete-card-header">
              <Trash2 size={20} strokeWidth={1.5} className="delete-icon delete-icon--danger" />
              <h4 className="delete-card-title">Final Confirmation</h4>
            </div>
            <p className="delete-card-description">
              Click "Delete Permanently" one more time to confirm. This is your last chance to cancel.
            </p>

            {error && (
              <div className="delete-error-box">
                {error}
              </div>
            )}

            <div className="delete-button-group">
              <button
                onClick={handleFinalDelete}
                disabled={loading}
                className={`delete-button delete-button--danger ${loading ? 'is-loading' : ''}`}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} strokeWidth={1.5} />
                    Delete Permanently
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="delete-button delete-button--secondary"
              >
                Cancel
              </button>
            </div>

            <p className="delete-helper-text">
              💾 Tip: You can download your data before deletion from your profile.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
