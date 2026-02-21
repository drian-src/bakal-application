import React from 'react';

const AdvertisementCard = ({ ad }) => {
  const handleAdClick = () => {
    // Navigate to platform home pages (same behavior as adding to cart)
    const platformUrls = {
      'pcexpress': 'https://pcexpress.com',
      'villman': 'https://villman.com.ph',
      'pcworx': 'https://pcworx.com'
    };
    
    const url = platformUrls[ad.platform];
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="ad-card" onClick={handleAdClick} style={{ borderLeft: `4px solid ${ad.bgColor}`, cursor: 'pointer' }}>
      <div className="ad-content">
        <h4 className="ad-title">{ad.title}</h4>
        <p className="ad-subtitle">{ad.subtitle}</p>
      </div>
      <div className="ad-badge" style={{ backgroundColor: ad.bgColor }}>
        {ad.platform}
      </div>
    </div>
  );
};

export default AdvertisementCard;