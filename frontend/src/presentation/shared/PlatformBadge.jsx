import React from 'react';

const PlatformBadge = ({ platform, variant = 'default' }) => {
  const platformColors = {
    pcexpress: { bg: '#004080', text: 'white' },
    villman: { bg: '#008000', text: 'white' },
    pcworx: { bg: '#800080', text: 'white' },
    default: { bg: '#E0E0E0', text: '#333' }
  };

  const colors = platformColors[platform?.toLowerCase()] || platformColors.default;

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
