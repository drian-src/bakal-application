import React from 'react';
import './PlatformShowcase.css';

const getStoreIconBadge = (text, color = '#666') => (
  <svg width="80" height="80" viewBox="0 0 80 80" style={{ background: color, borderRadius: '6px' }}>
    <rect width="80" height="80" fill={color}/>
    <text x="40" y="48" textAnchor="middle" fontSize="40" fontWeight="700" fill="white" fontFamily="sans-serif">
      {text.charAt(0).toUpperCase()}
    </text>
  </svg>
);

const PlatformShowcase = () => {
  const platforms = [
    {
      id: 'pcexpress',
      name: 'PCExpress',
      color: '#004080',
      description: 'Top destination for electronics'
    },
    {
      id: 'villman',
      name: 'VillMan',
      color: '#008000',
      description: 'Reliable gadgets & devices'
    },
    {
      id: 'pcworx',
      name: 'PCWorx',
      color: '#800080',
      description: 'Computers and accessories hub'
    }
  ];

  return (
    <section className="platform-showcase">
      <div className="container">
        <div className="showcase-header">
          <h2 className="showcase-title">Shop Across All Major Platforms</h2>
          <p className="showcase-subtitle">
            Compare prices and find the best deals across Southeast Asia's largest e-commerce platforms
          </p>
        </div>

        <div className="platforms-grid">
          {platforms.map((platform) => (
            <div key={platform.id} className="platform-card">
              <div 
                className="platform-card-header"
                style={{ backgroundColor: platform.color }}
              >
                {getStoreIconBadge(platform.id, platform.color)}
              </div>
              <div className="platform-card-body">
                <h3 className="platform-name">{platform.name}</h3>
                <p className="platform-description">{platform.description}</p>
              </div>
              <div className="platform-card-footer">
                <div className="platform-badge" style={{ backgroundColor: platform.color }}>
                  {platform.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformShowcase;
