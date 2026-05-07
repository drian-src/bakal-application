import React from 'react';
import { getStoreConfig } from '@/core/config/storeConfig';

const PlatformBadge = ({ platform, variant = 'default' }) => {
  // Get store config by platform name
  const storeConfig = getStoreConfig(platform);
  
  // Build color object with fallback
  const colors = storeConfig 
    ? { bg: storeConfig.color, text: 'white' }
    : { bg: '#d4af37', text: '#0a1a3a' };

  return (
    <div 
      className={`platform-badge ${variant}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '6px 14px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        display: 'inline-block',
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {platform}
    </div>
  );
};

export default PlatformBadge;
