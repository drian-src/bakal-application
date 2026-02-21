import React, { useState } from 'react';
import { useEffect } from 'react';
import './AdvertSliderHome.css';

const slides = [
  {
    id: 'pcexpress',
    title: 'PCExpress',
    desc: 'Electronics deals at unbeatable prices',
    logo: 'https://via.placeholder.com/120?text=PCExpress',
    bgColor: '#004080'
  },
  {
    id: 'villman',
    title: 'VillMan',
    desc: 'Trusted source for gadgets & devices',
    logo: 'https://via.placeholder.com/120?text=VillMan',
    bgColor: '#008000'
  },
  {
    id: 'pcworx',
    title: 'PCWorx',
    desc: 'Your computer and accessory hub',
    logo: 'https://via.placeholder.com/120?text=PCWorx',
    bgColor: '#800080'
  }
];

const AdvertSliderHome = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (i) => {
    setIndex(i);
  };

  const handleSlideClick = (slideId) => {
    const platformUrls = {
      'pcexpress': 'https://pcexpress.com',
      'villman': 'https://villman.com.ph',
      'pcworx': 'https://pcworx.com'
    };
    
    const url = platformUrls[slideId];
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="advert-slider-home">
      <div className="advert-track-home" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s) => (
          <div className="advert-slide-home" key={s.id} style={{ backgroundColor: s.bgColor }} onClick={() => handleSlideClick(s.id)}>
            <img src={s.logo} alt={s.title} className="advert-logo-home" />
            <h3 className="advert-title-home">{s.title}</h3>
            <p className="advert-desc-home">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="advert-dots-home">
        {slides.map((_, i) => (
          <button 
            key={i} 
            className={`dot-home ${i === index ? 'active' : ''}`} 
            onClick={() => goToSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AdvertSliderHome;
