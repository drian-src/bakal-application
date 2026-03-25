import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../shared/ConfirmDialog';
import { getSearchHistory, clearSearchHistory } from '@/core/services/apiService';
import { getCurrentUser } from '@/core/services/authService';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteHistoryDialog, setShowDeleteHistoryDialog] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [accountInfo, setAccountInfo] = useState({
    name: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [expandedSetting, setExpandedSetting] = useState(null);

  // Load user data from localStorage on component mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setAccountInfo({
        name: user.name || user.displayName || '',
        email: user.email || ''
      });
    }
  }, []);

  // Fetch search history when tab changes to 'history'
  useEffect(() => {
    if (activeTab === 'history') {
      fetchSearchHistory();
    }
  }, [activeTab]);

  const fetchSearchHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await getSearchHistory(50);
      setSearchHistory(history);
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem('authToken');
    setShowLogoutDialog(false);
    navigate('/');
  };

  const handleDeleteHistory = () => {
    setShowDeleteHistoryDialog(true);
  };

  const handleConfirmDeleteHistory = async () => {
    try {
      await clearSearchHistory();
      setSearchHistory([]);
      setShowDeleteHistoryDialog(false);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  const handleDeleteHistoryItem = (searchId) => {
    // Filter out the deleted item locally
    setSearchHistory(searchHistory.filter(item => item.id !== searchId));
    // In a real app, you'd call an API to delete this specific item
  };

  const handleSettingClick = (setting) => {
    setExpandedSetting(expandedSetting === setting ? null : setting);
  };

  const handleSettingAction = (action) => {
    switch(action) {
      case 'account':
        alert('Opening account information editor');
        break;
      case 'password':
        alert('Opening password change form');
        break;
      case 'privacy':
        alert('Opening privacy and security settings');
        break;
      default:
        break;
    }
  };

  return (
    <div className="profile-page">
      <main className="profile-content">
        <div className="profile-container">
          <button onClick={() => navigate('/home')} className="profile-back-button">
            ← Back to Home
          </button>

          <div className="profile-wrapper">
            {/* Sidebar Menu */}
            <aside className="profile-sidebar">
              <div className="sidebar-menu">
                <button
                  className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile Details
                </button>
                <button
                  className={`menu-item ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  Search History
                </button>
                <button
                  className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  Settings
                </button>
                <button
                  className={`menu-item ${activeTab === 'help' ? 'active' : ''}`}
                  onClick={() => setActiveTab('help')}
                >
                  Help & Support
                </button>
                <button className="menu-item logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </aside>

            {/* Main Content */}
            <div className="profile-main">
              {/* Profile Details */}
              {activeTab === 'profile' && (
                <section className="profile-section">
                  <h2 className="section-title">Profile Details</h2>

                  <div className="profile-info">

                    {/* ── AVATAR (Google photo or initials fallback) ── */}
                    <div className="profile-image-section">
                      <div className="profile-avatar">
                        {(() => {
                          // Read avatarUrl from localStorage user object
                          // getCurrentUser() returns { name, email, avatarUrl, authProvider }
                          const user = getCurrentUser();
                          const avatarUrl = user?.avatarUrl ?? user?.avatar_url ?? null;
                          const initials = (accountInfo.name || '?')
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                          return avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={accountInfo.name || 'Profile'}
                              className="avatar-image"
                              onError={e => {
                                // If Google photo URL expires, fall back to initials
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="avatar-placeholder">{initials}</div>
                          );
                        })()}
                      </div>

                      {/* Google badge — shows authentication provider */}
                      <div className="google-auth-badge">
                        {/* Google "G" SVG — exact official brand colors */}
                        <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>Signed in with Google</span>
                      </div>
                    </div>

                    {/* ── READ-ONLY CREDENTIALS ── */}
                    <div className="credentials-section">

                      {/* Full Name — read-only */}
                      <div className="credential-item">
                        <label className="credential-label">Full Name</label>
                        <div className="credential-value">
                          {accountInfo.name || '—'}
                        </div>
                      </div>

                      {/* Email Address — read-only */}
                      <div className="credential-item">
                        <label className="credential-label">Email Address</label>
                        <div className="credential-value">
                          {accountInfo.email || '—'}
                        </div>
                      </div>

                      {/* Password — masked dots with show/hide toggle */}
                      <div className="credential-item">
                        <label className="credential-label">Password</label>
                        <div className="credential-value password-field">
                          <span className="password-text">
                            {showPassword ? 'Managed by Google' : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword(prev => !prev)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            title={showPassword ? 'Hide' : 'Show'}
                          >
                            {showPassword ? (
                              /* Eye-off SVG — password visible state */
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </svg>
                            ) : (
                              /* Eye SVG — password hidden state */
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Read-only notice */}
                      <p className="readonly-notice">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Your profile is managed by Google. To update your information,
                        visit your&nbsp;
                        <a
                          href="https://myaccount.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="google-account-link"
                        >
                          Google Account
                        </a>.
                      </p>

                    </div>
                  </div>
                </section>
              )}

              {/* Search History */}
              {activeTab === 'history' && (
                <section className="profile-section">
                  <div className="section-header">
                    <h2 className="section-title">Search History</h2>
                    <button className="clear-history-btn" onClick={handleDeleteHistory} disabled={loadingHistory}>
                      Clear History
                    </button>
                  </div>
                  {loadingHistory ? (
                    <div className="history-loading">Loading search history...</div>
                  ) : searchHistory.length === 0 ? (
                    <div className="history-empty">No search history yet</div>
                  ) : (
                    <div className="history-list">
                      {searchHistory.map((item) => (
                        <div key={item.id} className="history-item">
                          <span className="history-text">{item.query}</span>
                          <small className="history-date">
                            {new Date(item.created_at).toLocaleDateString()}
                          </small>
                          <div className="history-actions">
                            <button className="search-again-btn" onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}>
                              Search Again
                            </button>
                            <button 
                              className="delete-history-item-btn" 
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              aria-label="Delete history item"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Settings */}
              {activeTab === 'settings' && (
                <section className="profile-section">
                  <h2 className="section-title">Settings</h2>
                  <div className="settings-list">
                    <div className={`settings-item ${expandedSetting === 'account' ? 'expanded' : ''}`}>
                      <div className="settings-header" onClick={() => handleSettingClick('account')}>
                        <div className="settings-icon">◉</div>
                        <div className="settings-content">
                          <h3>Account Information</h3>
                          <p>Manage your account details and personal information</p>
                        </div>
                        <div className={`toggle-icon ${expandedSetting === 'account' ? 'active' : ''}`}>›</div>
                      </div>
                      {expandedSetting === 'account' && (
                        <div className="settings-expanded">
                          <div className="setting-detail">Username: {accountInfo.name}</div>
                          <div className="setting-detail">Email: {accountInfo.email}</div>
                          <button className="settings-btn" onClick={() => handleSettingAction('account')}>
                            Edit Account
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={`settings-item ${expandedSetting === 'password' ? 'expanded' : ''}`}>
                      <div className="settings-header" onClick={() => handleSettingClick('password')}>
                        <div className="settings-icon">◆</div>
                        <div className="settings-content">
                          <h3>Change Password</h3>
                          <p>Update your password to keep your account secure</p>
                        </div>
                        <div className={`toggle-icon ${expandedSetting === 'password' ? 'active' : ''}`}>›</div>
                      </div>
                      {expandedSetting === 'password' && (
                        <div className="settings-expanded">
                          <div className="setting-detail">Last changed: 3 months ago</div>
                          <button className="settings-btn" onClick={() => handleSettingAction('password')}>
                            Change Password
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={`settings-item ${expandedSetting === 'privacy' ? 'expanded' : ''}`}>
                      <div className="settings-header" onClick={() => handleSettingClick('privacy')}>
                        <div className="settings-icon">▪</div>
                        <div className="settings-content">
                          <h3>Security and Privacy</h3>
                          <p>Control your privacy settings and security preferences</p>
                        </div>
                        <div className={`toggle-icon ${expandedSetting === 'privacy' ? 'active' : ''}`}>›</div>
                      </div>
                      {expandedSetting === 'privacy' && (
                        <div className="settings-expanded">
                          <div className="setting-detail">Two-factor authentication: Disabled</div>
                          <div className="setting-detail">Profile visibility: Public</div>
                          <button className="settings-btn" onClick={() => handleSettingAction('privacy')}>
                            Manage Privacy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Help & Support */}
              {activeTab === 'help' && (
                <section className="profile-section">
                  <h2 className="section-title">Help & Support</h2>
                  <div className="help-content">
                    <div className="help-item">
                      <h3>Frequently Asked Questions</h3>
                      <p>Find answers to common questions about Bakàl</p>
                    </div>
                    <div className="help-item">
                      <h3>Contact Support</h3>
                      <p>Reach out to our support team at support@bakal.com</p>
                    </div>
                    <div className="help-item">
                      <h3>How to Use</h3>
                      <p>Learn how to search and find products across platforms</p>
                    </div>
                    <div className="help-item">
                      <h3>Report Issue</h3>
                      <p>Report bugs or issues to help us improve</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="Logout"
        message="Are you sure you want to logout? You will be redirected to the landing page."
        confirmText="Logout"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteHistoryDialog}
        title="Clear Search History"
        message="Are you sure you want to clear all your search history? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDeleteHistory}
        onCancel={() => setShowDeleteHistoryDialog(false)}
      />
    </div>
  );
};

export default ProfilePage;