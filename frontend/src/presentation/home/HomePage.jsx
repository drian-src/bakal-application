import React from 'react';
import HomeHeader from './sections/Header/HomeHeader';
import AdvertSliderHome from './sections/Advertisements/AdvertSliderHome';
import CategoriesGrid from './sections/CategoryProducts/CategoriesGrid';
import TopRatedProducts from './sections/ProductListing/TopRatedProducts';
import FrequentlySearchProducts from './sections/ProductListing/FrequentlySearchProducts';
import PersonalizedRecommendedProducts from './sections/ProductListing/PersonalizedRecommendedProducts';
import SearchBar from './sections/Header/SearchBar';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <HomeHeader hideSearch />
      <main className="home-content">
        <AdvertSliderHome />
        {/* prominent search bar below adverts */}
        <SearchBar />
        <CategoriesGrid />
        <FrequentlySearchProducts />
        <PersonalizedRecommendedProducts />
        <TopRatedProducts />
      </main>
    </div>
  );
};

export default HomePage;