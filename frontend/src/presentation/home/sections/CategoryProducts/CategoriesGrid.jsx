import React from 'react';
import './CategoriesGrid.css';

const CategoriesGrid = () => {
  const categories = [
    { 
      id: 1, 
      name: 'Phones', 
      image: 'https://cdn.thewirecutter.com/wp-content/media/2025/08/BEST-ANDROID-PHONES-00864.jpg?auto=webp&quality=75&width=1024'
    },
    { 
      id: 2, 
      name: 'Tablets', 
      image: 'https://cdn.thewirecutter.com/wp-content/media/2025/04/BEST-TABLETS-2048px-3x2-1.jpg?auto=webp&quality=75&crop=1:1,smart&width=1024'
    },
    { 
      id: 3, 
      name: 'Laptops', 
      image: 'https://www.cnet.com/a/img/resize/bb8a2aa9c31f8ec08d82228a51eabf05f00e54d2/hub/2025/03/10/d190e21d-9634-440d-8f33-396c8cb3da6a/m4-macbook-air-15-11.jpg?auto=webp&height=500'
    },
    { 
      id: 4, 
      name: 'Computers', 
      image: 'https://dlcdnrog.asus.com/rog/media/172782111228.webp'
    },
    { 
      id: 5, 
      name: 'Accessories', 
      image: 'https://media.istockphoto.com/id/1267943701/photo/gamer-work-space-concept-top-view-a-gaming-gear-mouse-keyboard-joystick-headset-mobile.jpg?s=612x612&w=0&k=20&c=dkYaZvcgbpArPJ2WwjQQKRnOmQSM57d88E0RZjpFYZo='
    }
  ];

  return (
    <section className="categories-section">
      <h2 className="categories-title">CATEGORIES</h2>
      <div className="categories-grid">
        {categories.map((cat) => (
          <div 
            key={cat.id} 
            className="category-item" 
            style={{ '--bg-image': `url(${cat.image})` }}
          >
            <div className="category-name">{cat.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoriesGrid;
