import React from 'react';
import AdvertisementCard from './AdvertisementCard';
import './Advertisements.css';

const AdvertisementSection = () => {
  const ads = [
    { id: 1, title: 'Flash Electronics Sale!', subtitle: 'Up to 70% Off on Gadgets', platform: 'pcexpress', bgColor: '#004080' },
    { id: 2, title: 'Free Delivery', subtitle: 'Above ₱1000 on VillMan', platform: 'villman', bgColor: '#008000' },
    { id: 3, title: 'New Tech Releases', subtitle: 'Check PCWorx for the Latest', platform: 'pcworx', bgColor: '#800080' },
  ];

  return (
    <section className="advertisement-section">
      <div className="ads-container">
        {ads.map(ad => (
          <AdvertisementCard key={ad.id} ad={ad} />
        ))}
      </div>
    </section>
  );
};

export default AdvertisementSection;