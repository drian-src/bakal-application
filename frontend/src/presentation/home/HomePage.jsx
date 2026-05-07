import React from 'react';
import HomeHeader from './sections/Header/HomeHeader';
import AdvertSliderHome from './sections/Advertisements/AdvertSliderHome';
import CategoriesGrid from './sections/CategoryProducts/CategoriesGrid';
import TopRatedProducts from './sections/ProductListing/TopRatedProducts';
import SearchBar from './sections/Header/SearchBar';
import RecommendationSection from './recommendations/RecommendationSection';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <HomeHeader hideSearch />
      <main className="home-content">
        <AdvertSliderHome />
        {/* prominent search bar below adverts */}
        <SearchBar />
        <RecommendationSection />
        <CategoriesGrid />
        <TopRatedProducts />
      </main>
    </div>
  );
};

export default HomePage;