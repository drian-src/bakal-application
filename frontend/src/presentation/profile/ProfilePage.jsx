import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Clock,
  Bookmark,
  Settings,
  HelpCircle,
  LogOut,
  Home,
  Trash2,
  Mail,
  Shield,
  Info,
  MessageCircle,
  BookOpen,
  Flag,
  ChevronRight,
  RotateCcw,
  Trash2 as TrashIcon,
  TrendingUp,
  Menu,
  X,
  Search,
} from 'lucide-react';
import ConfirmDialog from '../shared/ConfirmDialog';
import { ThemeToggle } from '../shared/ThemeToggle';
import PrivacyDataTab from './PrivacyDataTab';
import RetailerSessionsSection from './RetailerSessionsSection';
import { SkeletonHistoryItem, SkeletonSavedSearchItem, SkeletonContainer } from './SkeletonLoaders';
import { getSearchHistory, clearSearchHistory } from '@/core/services/apiService';
import { savedSearchesApi } from '@/core/services/apiService';
import { getCurrentUser } from '@/core/services/authService';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteHistoryDialog, setShowDeleteHistoryDialog] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [accountInfo, setAccountInfo] = useState({
    name: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [expandedSetting, setExpandedSetting] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [loadingSavedSearches, setLoadingSavedSearches] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Fetch saved searches when tab changes to 'saved'
  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedSearches();
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

  const handleAccountDeleted = () => {
    // Clear auth state and redirect to landing page
    localStorage.removeItem('authToken');
    localStorage.removeItem('bakal_user');
    localStorage.removeItem('bakal_theme');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
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

  const fetchSavedSearches = async () => {
    try {
      setLoadingSavedSearches(true);
      const searches = await savedSearchesApi.getAll();
      setSavedSearches(Array.isArray(searches) ? searches : []);
    } catch (error) {
      console.error('Failed to fetch saved searches:', error);
      setSavedSearches([]);
    } finally {
      setLoadingSavedSearches(false);
    }
  };

  const handleDeleteSavedSearch = async (id) => {
    try {
      const result = await savedSearchesApi.remove(id);
      if (result.success) {
        setSavedSearches(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  const handleRunSavedSearch = async (savedSearch) => {
    try {
      await savedSearchesApi.markRun(savedSearch.id);
      navigate(`/search?q=${encodeURIComponent(savedSearch.query)}`);
    } catch (error) {
      console.error('Failed to run saved search:', error);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
          <div className="profile-header-mobile">
            <button 
              onClick={() => navigate('/home')} 
              className="profile-back-btn"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <Home size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="profile-wrapper">
            {/* Sidebar Menu - Hidden on mobile unless toggled */}
            <aside className={`profile-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
              <div className="sidebar-menu">
                <button
                  className={`sidebar-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                  title="Profile Details"
                >
                  <User size={18} strokeWidth={1.5} />
                  <span>Profile Details</span>
                </button>
                <button
                  className={`sidebar-tab-item ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                  title="Search History"
                >
                  <Clock size={18} strokeWidth={1.5} />
                  <span>Search History</span>
                </button>
                <button
                  className={`sidebar-tab-item ${activeTab === 'saved' ? 'active' : ''}`}
                  onClick={() => setActiveTab('saved')}
                  title="Saved Searches"
                >
                  <Bookmark size={18} strokeWidth={1.5} />
                  <span>Saved Searches</span>
                </button>
                <button
                  className={`sidebar-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                  title="Settings"
                >
                  <Settings size={18} strokeWidth={1.5} />
                  <span>Settings</span>
                </button>
                <button
                  className={`sidebar-tab-item ${activeTab === 'help' ? 'active' : ''}`}
                  onClick={() => setActiveTab('help')}
                  title="Help & Support"
                >
                  <HelpCircle size={18} strokeWidth={1.5} />
                  <span>Help & Support</span>
                </button>

                <button
                  className={`sidebar-tab-item ${activeTab === 'privacy' ? 'active' : ''}`}
                  onClick={() => setActiveTab('privacy')}
                  title="Privacy & Data"
                >
                  <Shield size={18} strokeWidth={1.5} />
                  <span>Privacy & Data</span>
                </button>

                <div className="sidebar-divider"></div>

                <button 
                  className="sidebar-tab-item logout-btn" 
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                  <span>Logout</span>
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

                          // Show initials if no URL or if image failed to load
                          if (!avatarUrl || avatarError) {
                            return <div className="avatar-placeholder">{initials}</div>;
                          }

                          return (
                            <img
                              src={avatarUrl}
                              alt={accountInfo.name || 'Profile'}
                              className="avatar-image"
                              onError={() => setAvatarError(true)}  // ← state-based, no DOM manipulation
                            />
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
                    <SkeletonContainer count={4}>
                      <SkeletonHistoryItem />
                    </SkeletonContainer>
                  ) : searchHistory.length === 0 ? (
                    <div className="history-empty-state">
                      <Clock size={36} strokeWidth={1} className="history-empty-icon" />
                      <p className="history-empty-title">No search history yet</p>
                      <p className="history-empty-desc">
                        Your recent searches will appear here.
                      </p>
                    </div>
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

              {/* Saved Searches */}
              {activeTab === 'saved' && (
                <section className="profile-section">
                  <h2 className="section-title">Saved Searches</h2>

                  {loadingSavedSearches ? (
                    <SkeletonContainer count={3}>
                      <SkeletonSavedSearchItem />
                    </SkeletonContainer>
                  ) : savedSearches.length === 0 ? (
                    <div className="history-empty-state">
                      <Bookmark size={36} strokeWidth={1} className="history-empty-icon" />
                      <p className="history-empty-title">No saved searches yet</p>
                      <p className="history-empty-desc">
                        Pin a search query from the results page to quickly re-run it anytime.
                      </p>
                    </div>
                  ) : (
                    <div className="saved-searches-list">
                      {savedSearches.map((saved) => (
                        <div key={saved.id} className="saved-search-item">
                          <div className="saved-search-icon">
                            <Bookmark size={16} strokeWidth={1.5} />
                          </div>
                          <div className="saved-search-content">
                            <span className="saved-search-query">{saved.query}</span>
                            <div className="saved-search-meta">
                              <span className="saved-search-date">
                                Saved {formatRelativeTime(saved.saved_at)}
                              </span>
                              {saved.new_count > 0 && (
                                <span className="saved-search-new-badge">
                                  <TrendingUp size={11} strokeWidth={1.5} />
                                  {saved.new_count} new
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="saved-search-actions">
                            <button
                              onClick={() => handleRunSavedSearch(saved)}
                              className="saved-search-run-btn"
                              title="Run this search"
                            >
                              <RotateCcw size={14} strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => handleDeleteSavedSearch(saved.id)}
                              className="saved-search-delete-btn"
                              title="Remove saved search"
                            >
                              <TrashIcon size={14} strokeWidth={1.5} />
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

                  {/* ✨ NEW: Retailer Sessions Management */}
                  <RetailerSessionsSection userId={getCurrentUser()?.id} />

                  <hr style={{  margin: '2rem 0', borderColor: 'var(--border-color)', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                  {/* ✨ NEW: Appearance Settings */}
                  <div className="settings-appearance">
                    <div className="appearance-header">
                      <h3>Appearance</h3>
                      <p>Choose how Bakàl looks to you</p>
                    </div>
                    <ThemeToggle showLabel={true} inline={false} />
                  </div>

                  <hr style={{  margin: '2rem 0', borderColor: 'var(--border-color)', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                    Your profile is managed by Google. Account settings cannot be changed here.
                  </p>
                  <div className="settings-list">
                    <div className="settings-item">
                      <div className="settings-header" style={{ cursor: 'default' }}>
                        <div className="settings-icon">
                          <User size={20} strokeWidth={1.5} />
                        </div>
                        <div className="settings-content">
                          <h3>Account Information</h3>
                          <p>Your account details (managed by Google)</p>
                        </div>
                      </div>
                      <div className="settings-expanded">
                        <div className="setting-detail">Username: {accountInfo.name}</div>
                        <div className="setting-detail">Email: {accountInfo.email}</div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                          To update your information, visit your <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer">Google Account</a>.
                        </p>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-header" style={{ cursor: 'default' }}>
                        <div className="settings-icon">
                          <Shield size={20} strokeWidth={1.5} />
                        </div>
                        <div className="settings-content">
                          <h3>Password Management</h3>
                          <p>Managed securely by Google</p>
                        </div>
                      </div>
                      <div className="settings-expanded">
                        <div className="setting-detail">Password: Managed by Google</div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                          Your password is stored securely by Google. You can change it in your <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Google Security Settings</a>.
                        </p>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-header" style={{ cursor: 'default' }}>
                        <div className="settings-icon">
                          <Info size={20} strokeWidth={1.5} />
                        </div>
                        <div className="settings-content">
                          <h3>Security and Privacy</h3>
                          <p>Managed by Google</p>
                        </div>
                      </div>
                      <div className="settings-expanded">
                        <div className="setting-detail">Two-factor authentication: Managed by Google</div>
                        <div className="setting-detail">Profile visibility: Managed by Google</div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                          Adjust your privacy and security settings in your <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Google Account</a>.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Help & Support */}
              {activeTab === 'help' && (
                <section className="profile-section">
                  <h2 className="section-title">Help & Support</h2>
                  <div className="help-accordion">
                    {/* FAQ Item */}
                    <div className="help-accordion-item">
                      <button
                        className="help-accordion-header"
                        onClick={() => setExpandedSetting(expandedSetting === 'faq' ? null : 'faq')}
                      >
                        <div className="help-accordion-icon">
                          <HelpCircle size={18} strokeWidth={1.5} />
                        </div>
                        <div className="help-accordion-content">
                          <h3>Frequently Asked Questions</h3>
                          <p>Find answers to common questions about Bakàl</p>
                        </div>
                        <ChevronRight 
                          size={18} 
                          strokeWidth={1.5}
                          className={`help-accordion-toggle ${expandedSetting === 'faq' ? 'expanded' : ''}`}
                        />
                      </button>
                      {expandedSetting === 'faq' && (
                        <div className="help-accordion-body">
                          <div className="faq-item">
                            <strong>How do I search for products?</strong>
                            <p>Use the search bar at the top of the page to search across all platforms. You can filter results by platform using the sidebar.</p>
                          </div>
                          <div className="faq-item">
                            <strong>Can I save my searches?</strong>
                            <p>Yes! Click the bookmark icon on search results to save a search. You can view all saved searches in your profile under "Saved Searches".</p>
                          </div>
                          <div className="faq-item">
                            <strong>What platforms do you support?</strong>
                            <p>We currently search across PCExpress, VillMan, and PCWorx for the best prices and product availability.</p>
                          </div>
                          <div className="faq-item">
                            <strong>How often is product data updated?</strong>
                            <p>Product prices and availability are updated every 6-12 hours to ensure you get the most accurate information.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contact Support Item */}
                    <div className="help-accordion-item">
                      <button
                        className="help-accordion-header"
                        onClick={() => setExpandedSetting(expandedSetting === 'contact' ? null : 'contact')}
                      >
                        <div className="help-accordion-icon">
                          <MessageCircle size={18} strokeWidth={1.5} />
                        </div>
                        <div className="help-accordion-content">
                          <h3>Contact Support</h3>
                          <p>Reach out to our support team for help</p>
                        </div>
                        <ChevronRight 
                          size={18} 
                          strokeWidth={1.5}
                          className={`help-accordion-toggle ${expandedSetting === 'contact' ? 'expanded' : ''}`}
                        />
                      </button>
                      {expandedSetting === 'contact' && (
                        <div className="help-accordion-body">
                          <div className="support-info">
                            <p><strong>Email:</strong> <a href="mailto:support@bakal.com" className="support-email-link">support@bakal.com</a></p>
                            <p>We typically respond to support emails within 24 hours during business days.</p>
                            <div className="contact-tips">
                              <p><strong>Tips for faster support:</strong></p>
                              <ul>
                                <li>Include a screenshot of the issue if possible</li>
                                <li>Describe the platform where the issue occurred</li>
                                <li>Mention the product or search query related to your issue</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* How to Use Item */}
                    <div className="help-accordion-item">
                      <button
                        className="help-accordion-header"
                        onClick={() => setExpandedSetting(expandedSetting === 'howto' ? null : 'howto')}
                      >
                        <div className="help-accordion-icon">
                          <BookOpen size={18} strokeWidth={1.5} />
                        </div>
                        <div className="help-accordion-content">
                          <h3>How to Use</h3>
                          <p>Learn how to search and find products effectively</p>
                        </div>
                        <ChevronRight 
                          size={18} 
                          strokeWidth={1.5}
                          className={`help-accordion-toggle ${expandedSetting === 'howto' ? 'expanded' : ''}`}
                        />
                      </button>
                      {expandedSetting === 'howto' && (
                        <div className="help-accordion-body">
                          <div className="tutorial-step">
                            <strong>Step 1: Enter Your Search</strong>
                            <p>Type a product name (e.g., "laptop", "smartphone") in the search bar and press Enter.</p>
                          </div>
                          <div className="tutorial-step">
                            <strong>Step 2: Filter Results</strong>
                            <p>Use the platform filters on the left to narrow results to specific stores. Look for deals and discounts highlighted in red.</p>
                          </div>
                          <div className="tutorial-step">
                            <strong>Step 3: Compare Prices</strong>
                            <p>Compare prices across platforms to find the best deal. Click "View on Store" to visit the product page.</p>
                          </div>
                          <div className="tutorial-step">
                            <strong>Step 4: Save Searches</strong>
                            <p>Click the bookmark icon to save searches you want to track. We'll notify you of new deals matching your search.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Report Issue Item */}
                    <div className="help-accordion-item">
                      <button
                        className="help-accordion-header"
                        onClick={() => setExpandedSetting(expandedSetting === 'report' ? null : 'report')}
                      >
                        <div className="help-accordion-icon">
                          <Flag size={18} strokeWidth={1.5} />
                        </div>
                        <div className="help-accordion-content">
                          <h3>Report Issue</h3>
                          <p>Report bugs or issues to help us improve</p>
                        </div>
                        <ChevronRight 
                          size={18} 
                          strokeWidth={1.5}
                          className={`help-accordion-toggle ${expandedSetting === 'report' ? 'expanded' : ''}`}
                        />
                      </button>
                      {expandedSetting === 'report' && (
                        <div className="help-accordion-body">
                          <div className="issue-types">
                            <p><strong>Common issues we help with:</strong></p>
                            <ul>
                              <li><strong>Incorrect prices:</strong> Product prices don't match the actual store</li>
                              <li><strong>Unavailable products:</strong> Products shown as available but not in stock</li>
                              <li><strong>Broken links:</strong> Links leading to 404 or incorrect product pages</li>
                              <li><strong>App errors:</strong> Page won't load, search not working, login issues</li>
                              <li><strong>Missing products:</strong> Not finding a product that should be indexed</li>
                            </ul>
                          </div>
                          <p style={{ marginTop: '1rem', fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Found a bug? Email <a href="mailto:support@bakal.com" className="support-email-link">support@bakal.com</a> with a detailed description.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Privacy & Data */}
              {activeTab === 'privacy' && (
                <section className="profile-section">
                  <PrivacyDataTab 
                    token={localStorage.getItem('authToken')}
                    onAccountDeleted={handleAccountDeleted}
                  />
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