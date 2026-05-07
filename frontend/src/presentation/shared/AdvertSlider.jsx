import React, { useEffect, useState } from 'react';
import './AdvertSlider.css';

const getStoreIcon = (text, color = '#666') => (
  <svg width="100" height="100" viewBox="0 0 100 100" style={{ background: color, borderRadius: '8px' }}>
    <rect width="100" height="100" fill={color}/>
    <text x="50" y="55" textAnchor="middle" fontSize="48" fontWeight="700" fill="white" fontFamily="sans-serif">
      {text.charAt(0).toUpperCase()}
    </text>
  </svg>
);

const slides = [
  {
    id: 'pcexpress',
    title: 'PCExpress',
    desc: 'Your go‑to electronics superstore',
    color: '#004080'
  },
  {
    id: 'villman',
    title: 'VillMan',
    desc: 'Reliable gadgets & devices',
    color: '#008000'
  },
  {
    id: 'pcworx',
    title: 'PCWorx',
    desc: 'Quality computers and accessories',
    color: '#800080'
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
            {getStoreIcon(s.id, s.color)}
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
