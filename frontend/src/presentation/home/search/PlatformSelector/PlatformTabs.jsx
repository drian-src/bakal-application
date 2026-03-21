import React from 'react';
import './PlatformTabs.css';

const PlatformTabs = ({ activePlatform, onPlatformChange }) => {
  const platforms = [
    { id: 'all', label: 'All Stores', color: 'var(--accent-gold)' },
    { id: 'pcexpress', label: 'PCExpress', color: '#004080' },
    { id: 'villman', label: 'VillMan', color: '#008000' },
    { id: 'pcworx', label: 'PCWorx', color: '#800080' }
  ];

  const handlePlatformClick = (platformId) => {
    if (onPlatformChange) {
      onPlatformChange(platformId);
    }
  };

  return (
    <div className="platform-tabs">
      {platforms.map(platform => (
        <button
          key={platform.id}
          className={`platform-tab ${activePlatform === platform.id ? 'active' : ''}`}
          onClick={() => handlePlatformClick(platform.id)}
          style={{
            borderBottomColor: activePlatform === platform.id ? platform.color : 'transparent'
          }}
        >
          {platform.label}
        </button>
      ))}
    </div>
  );
};

export default PlatformTabs;