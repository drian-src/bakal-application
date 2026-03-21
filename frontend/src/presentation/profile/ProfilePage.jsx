import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../shared/ConfirmDialog';
import { getSearchHistory, clearSearchHistory } from '@/core/services/apiService';
import { getCurrentUser } from '@/core/services/authService';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileImage, setProfileImage] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteHistoryDialog, setShowDeleteHistoryDialog] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [accountInfo, setAccountInfo] = useState({
    name: '',
    email: '',
    password: '••••••••'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...accountInfo });
  const [expandedSetting, setExpandedSetting] = useState(null);

  // Load user data from localStorage on component mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const userData = {
        name: user.name || user.fullName || '',
        email: user.email || '',
        password: '••••••••'
      };
      setAccountInfo(userData);
      setEditForm(userData);
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        // Immediately save to localStorage for real-time sync
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        currentUser.profilePhoto = reader.result;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('[ProfilePage] Profile photo saved to localStorage');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    setAccountInfo(editForm);
    setIsEditing(false);
    
    // Save profile info and photo to localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.name = editForm.name;
    currentUser.email = editForm.email;
    if (profileImage) {
      currentUser.profilePhoto = profileImage;
    }
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    alert('Profile updated successfully');
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
                    {/* Profile Image Section */}
                    <div className="profile-image-section">
                      <div className="profile-avatar">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="avatar-image" />
                        ) : (
                          <div className="avatar-placeholder">
                            {accountInfo.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                      </div>
                      <label className="image-upload-label">
                        Change Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          className="image-upload-input"
                        />
                      </label>
                    </div>

                    {/* Credentials Section */}
                    <div className="credentials-section">
                      {!isEditing ? (
                        <>
                          <div className="credential-item">
                            <label>Full Name</label>
                            <div className="credential-value">{accountInfo.name}</div>
                          </div>
                          <div className="credential-item">
                            <label>Email Address</label>
                            <div className="credential-value">{accountInfo.email}</div>
                          </div>
                          <div className="credential-item">
                            <label>Password</label>
                            <div className="credential-value">{accountInfo.password}</div>
                          </div>
                          <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                            Edit Credentials
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="form-group">
                            <label>Full Name</label>
                            <input 
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>Email Address</label>
                            <input 
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>Password</label>
                            <input 
                              type="password"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-actions">
                            <button className="save-btn" onClick={handleSaveProfile}>
                              Save Changes
                            </button>
                            <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
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