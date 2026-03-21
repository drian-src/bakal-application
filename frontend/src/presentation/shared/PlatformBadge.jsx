import React from 'react';
import { getStoreConfig } from '@/core/config/storeConfig';

const PlatformBadge = ({ platform, variant = 'default' }) => {
  // Get store config by platform name
  const storeConfig = getStoreConfig(platform);
  
  // Build color object with fallback
  const colors = storeConfig 
    ? { bg: storeConfig.color, text: 'white' }
    : { bg: '#E0E0E0', text: '#333' };

  return (
    <div 
      className={`platform-badge ${variant}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text
      }}
    >
      {platform}
    </div>
  );
};

export default PlatformBadge;
