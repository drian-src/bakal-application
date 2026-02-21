import React, { useEffect, useState } from 'react';
import './AdvertSlider.css';

const slides = [
  {
    id: 'pcexpress',
    title: 'PCExpress',
    desc: 'Your go‑to electronics superstore',
    logo: 'https://via.placeholder.com/100?text=PCExpress'
  },
  {
    id: 'villman',
    title: 'VillMan',
    desc: 'Reliable gadgets & devices',
    logo: 'https://via.placeholder.com/100?text=VillMan'
  },
  {
    id: 'pcworx',
    title: 'PCWorx',
    desc: 'Quality computers and accessories',
    logo: 'https://via.placeholder.com/100?text=PCWorx'
  }
];

const AdvertSlider = ({ interval = 3000 }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(t);
  }, [interval]);

  return (
    <div className="advert-slider">
      <div className="advert-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s) => (
          <div className="advert-slide" key={s.id}>
            <img src={s.logo} alt={s.title} className="advert-logo" />
            <h3 className="advert-title">{s.title}</h3>
            <p className="advert-desc">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="advert-dots">
        {slides.map((_, i) => (
          <span key={i} className={`dot ${i === index ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  );
};

export default AdvertSlider;
