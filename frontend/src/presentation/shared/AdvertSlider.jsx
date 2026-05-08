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

const staticSlides = [
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
  const [slides, setSlides] = useState(staticSlides);
  const [loading, setLoading] = useState(true);

  // Try to fetch dynamic deals, fallback to static slides
  useEffect(() => {
    const loadDeals = async () => {
      try {
        const response = await fetch('/api/banners/featured-deals');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            // Transform deals to slide format with correct field mapping
            const dealSlides = result.data.map(deal => ({
              id: deal.id,
              title: deal.productTitle || deal.title,
              desc: `₱${deal.currentPrice?.toLocaleString() || deal.price?.toLocaleString()} - ${deal.discountPercent || deal.discount_percent}% off`,
              color: '#1a1a1a',
              image: deal.productImage || deal.image_url,
              isReal: true,
            }));
            setSlides(dealSlides);
          } else {
            setSlides(staticSlides);
          }
        } else {
          setSlides(staticSlides);
        }
      } catch (error) {
        console.warn('[AdvertSlider] Failed to load deals, using static slides:', error);
        setSlides(staticSlides);
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(t);
  }, [interval, slides.length]);

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
