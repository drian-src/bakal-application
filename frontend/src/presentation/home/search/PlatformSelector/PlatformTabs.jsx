import React from 'react';
import { STORE_CONFIG } from '@/core/config/storeConfig';
import './PlatformTabs.css';

const PlatformTabs = ({ activePlatform, onPlatformChange }) => {
  const platforms = [
    { id: 'all', label: 'All Stores', color: 'var(--accent-gold)' },
    { id: 'pcexpress', label: 'PCExpress', color: STORE_CONFIG.pcexpress.color },
    { id: 'villman', label: 'VillMan', color: STORE_CONFIG.villman.color },
    { id: 'pcworx', label: 'PCWorx', color: STORE_CONFIG.pcworx.color }
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
          title={`Filter by ${platform.label}`}
        >
          {platform.label}
        </button>
      ))}
    </div>
  );
};

export default PlatformTabs;