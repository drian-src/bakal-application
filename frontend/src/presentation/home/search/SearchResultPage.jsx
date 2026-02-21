import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchSummaryHeader from './SearchSummary/SearchSummaryHeader';
import FilterPanel from './Filters/FilterPanel';
import PlatformTabs from './PlatformSelector/PlatformTabs';
import RecommendedSection from './RecommendedProducts/RecommendedSection';
import { searchProducts } from '@/core/services/apiService';
import './SearchResultPage.css';

const SearchResultPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const selectedPlatform = searchParams.get('platform') || 'all';
  const [activePlatform, setActivePlatform] = useState(selectedPlatform);
  const [filteredProducts, setFilteredProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    price: [],
    rating: [],
    seller: [],
    shipping: [],
    availability: []
  });

  // Fetch search results from backend API
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await searchProducts(query, activePlatform);
        
        // Transform flat products array into grouped-by-platform structure
        // Backend returns: { search_id, query, total, products: [...] }
        // Frontend expects: { pcexpress: [...], villman: [...], pcworx: [...] }
        if (response && response.products && Array.isArray(response.products)) {
          const groupedByPlatform = response.products.reduce((acc, product) => {
            const platformKey = product.platform?.toLowerCase() || 'other';
            if (!acc[platformKey]) {
              acc[platformKey] = [];
            }
            acc[platformKey].push(product);
            return acc;
          }, {});
          setFilteredProducts(groupedByPlatform);
        } else {
          setFilteredProducts({});
        }
      } catch (err) {
        setError(err.message);
        setFilteredProducts({});
      } finally {
        setLoading(false);
      }
    };
    fetchSearchResults();
  }, [query, activePlatform]);

  const handleFilterChange = (filterType, selectedOptions) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: selectedOptions
    }));
  };

  return (
    <div className="search-result-page">
      <SearchSummaryHeader query={query} />
      
      <div className="search-content">
        <aside className="search-sidebar">
          <FilterPanel onFilterChange={handleFilterChange} />
        </aside>
        
        <main className="search-main">
          <PlatformTabs activePlatform={activePlatform} onPlatformChange={setActivePlatform} />
          <RecommendedSection 
            products={filteredProducts} 
            query={query}
            activePlatform={activePlatform}
          />
        </main>
      </div>
    </div>
  );
};

export default SearchResultPage;