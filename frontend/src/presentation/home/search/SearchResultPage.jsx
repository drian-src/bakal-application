import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchSummaryHeader from './SearchSummary/SearchSummaryHeader';
import FilterPanel from './Filters/FilterPanel';
import PlatformTabs from './PlatformSelector/PlatformTabs';
import RecommendedSection from './RecommendedProducts/RecommendedSection';
import ScrapingLoader from '../../shared/ScrapingLoader';
import { searchProducts, getStores, trackInteraction } from '@/core/services/apiService';
import { searchCache } from '@/core/services/searchCache';
import './SearchResultPage.css';

const SearchResultPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const selectedPlatform = searchParams.get('platform') || 'all';
  const [activePlatform, setActivePlatform] = useState(selectedPlatform);
  const [filteredProducts, setFilteredProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({
    price: [],
    rating: [],
    seller: [],
    shipping: [],
    availability: []
  });

  // Fetch available stores on component mount
  useEffect(() => {
    getStores()
      .then(setStores)
      .catch((err) => {
        console.error('Failed to fetch stores:', err);
        setStores([]);
      });
  }, []);

  // Fetch search results from backend API
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setLoading(false);
        return;
      }
      
      try {
        // Check if results are cached before setting loading state
        const isCached = searchCache.has(query, activePlatform);
        setFromCache(isCached);
        
        // Only show loading spinner if NOT cached
        if (!isCached) {
          setLoading(true);
        }
        
        const response = await searchProducts(query, activePlatform);
        
        // Transform flat products array into grouped-by-platform structure
        // Backend returns: { search_id, query, total, products: [...] }
        // Frontend expects: { pcexpress: [...], villman: [...], pcworx: [...] }
        console.log('[SearchResultPage] API Response:', response);
        console.log('[SearchResultPage] Response keys:', Object.keys(response || {}));
        console.log('[SearchResultPage] response.products:', response?.products);
        
        if (response && response.products && Array.isArray(response.products)) {
          console.log(`[SearchResultPage] Found ${response.products.length} products`);
          const groupedByPlatform = response.products.reduce((acc, product) => {
            const platformKey = product.platform?.toLowerCase() || 'other';
            if (!acc[platformKey]) {
              acc[platformKey] = [];
            }
            acc[platformKey].push(product);
            return acc;
          }, {});
          console.log('[SearchResultPage] Grouped by platform:', groupedByPlatform);
          setFilteredProducts(groupedByPlatform);
          // Track the search query for the recommendation engine — fire and forget
          trackInteraction('search', { query });
        } else {
          console.warn('[SearchResultPage] No products in response or invalid format');
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
      <SearchSummaryHeader query={query} stores={stores} />
      
      {/* Cache indicator - shows when results are from cache */}
      {fromCache && (
        <div className="cache-indicator">
          <span className="cache-indicator-content">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Results from cache
            <button
              className="cache-refresh-btn"
              onClick={() => {
                searchCache.invalidate(query, activePlatform);
                setFromCache(false);
                // Re-fetch by calling searchProducts again
                const fetchFresh = async () => {
                  try {
                    setLoading(true);
                    const response = await searchProducts(query, activePlatform);
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
                    }
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                };
                fetchFresh();
              }}
              title="Force fresh scrape"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Refresh
            </button>
          </span>
        </div>
      )}
      
      {/* Show scraping loader only when actively fetching (not from cache) */}
      {loading && !fromCache && <ScrapingLoader query={query} stores={stores} />}
      {/* Show search results when loading is done */}
      {!loading && (
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
      )}
    </div>
  );
};

export default SearchResultPage;