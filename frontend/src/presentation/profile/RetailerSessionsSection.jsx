import React, { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Plus, LogOut } from 'lucide-react';
import './RetailerSessionsSection.css';

/**
 * RetailerSessionsSection
 * Manages linked retailer sessions and persistent authentication
 */

const RetailerSessionsSection = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const RETAILERS = [
    { id: 'pcexpress', name: 'PCExpress', url: 'https://pcx.com.ph/' },
    { id: 'villman', name: 'VillMan', url: 'https://www.villman.com' },
    { id: 'pcworx', name: 'PCWorx', url: 'https://pcworx.ph/' },
  ];

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/retailer-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch sessions');

      const data = await response.json();
      setSessions(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRetailer = async (retailerId, retailerUrl) => {
    try {
      // Create session in database FIRST (for both web and Electron modes)
      const session = sessions.find(
        (s) => s.platform === retailerId || s.platform_id === retailerId
      );

      if (!session) {
        // Session doesn't exist, create one
        const createResult = await fetch('/api/retailer-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({ platformId: retailerId }),
        });

        if (!createResult.ok) {
          throw new Error('Failed to create session');
        }

        // Refresh sessions list to show the new session
        await fetchSessions();
      }

      // Check if Electron API is available
      if (window.electron?.retailer) {
        // Electron mode: Open webview with persistent session
        const sessionId = `persist:${retailerId}_${userId}`;
        const webviewResult = await window.electron.retailer.openWebview(
          sessionId,
          retailerUrl
        );

        if (webviewResult.success) {
          // Update last accessed time
          await fetchSessions();
        }
      } else {
        // Web mode: Open in new tab
        window.open(retailerUrl, '_blank');
        
        // Refresh sessions list after a short delay to show the session
        setTimeout(() => {
          fetchSessions();
        }, 1000);
      }
    } catch (err) {
      console.error('Error opening retailer:', err);
      setError(err.message);
    }
  };

  const handleLogout = async (sessionId) => {
    try {
      const response = await fetch(`/api/retailer-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to logout');

      // Refresh sessions list
      await fetchSessions();
    } catch (err) {
      console.error('Error logging out:', err);
      setError(err.message);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Log out from all retailer accounts?')) return;

    try {
      const response = await fetch('/api/retailer-sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to logout all');

      await fetchSessions();
    } catch (err) {
      console.error('Error logging out all:', err);
      setError(err.message);
    }
  };

  const getRetailerInfo = (platformId) => {
    return RETAILERS.find(
      (r) =>
        r.id === platformId ||
        r.name.toLowerCase() === platformId.toLowerCase()
    );
  };

  return (
    <div className="retailer-sessions-section">
      <div className="settings-section-title">
        <h3>Linked Retailer Accounts</h3>
        <p className="section-subtitle">
          Manage your persistent authenticated sessions with retailer platforms
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="sessions-container">
        {loading ? (
          <div className="loading-state">Loading sessions...</div>
        ) : sessions.length > 0 ? (
          <div className="sessions-list">
            {sessions.map((session) => {
              const retailer = getRetailerInfo(session.platform);
              return (
                <div
                  key={session.id}
                  className={`session-card ${session.is_active ? 'active' : 'inactive'}`}
                >
                  <div className="session-info">
                    <div className="session-header">
                      <h4>{retailer?.name || session.platform}</h4>
                      <span className={`status-badge ${session.is_active ? 'active' : 'inactive'}`}>
                        {session.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="session-details">
                      <p>
                        <strong>Created:</strong>{' '}
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Last Accessed:</strong>{' '}
                        {new Date(session.last_accessed).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="session-actions">
                    {session.is_active && (
                      <button
                        className="btn-open"
                        onClick={() =>
                          handleOpenRetailer(
                            session.platform,
                            retailer?.url ||
                              `https://${session.platform}.com`
                          )
                        }
                        title="Open retailer in authenticated session"
                      >
                        <ExternalLink size={16} />
                        Open
                      </button>
                    )}
                    <button
                      className="btn-logout"
                      onClick={() => handleLogout(session.id)}
                      title="Logout from this retailer"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              );
            })}

            {sessions.length > 0 && (
              <button
                className="btn-logout-all"
                onClick={handleLogoutAll}
                title="Logout from all retailers"
              >
                <LogOut size={16} />
                Logout from All Retailers
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>No linked retailer accounts yet</p>
            <p className="subtext">
              Open a retailer to set up a persistent authenticated session
            </p>
          </div>
        )}

        <div className="retailers-grid">
          <h4>Available Retailers</h4>
          <div className="retailer-buttons">
            {RETAILERS.map((retailer) => {
              const hasSession = sessions.some(
                (s) =>
                  s.platform === retailer.id &&
                  s.is_active
              );
              return (
                <button
                  key={retailer.id}
                  className={`retailer-btn ${hasSession ? 'linked' : ''}`}
                  onClick={() =>
                    handleOpenRetailer(retailer.id, retailer.url)
                  }
                >
                  <Plus size={16} />
                  {retailer.name}
                  {hasSession && <span className="linked-badge">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerSessionsSection;
