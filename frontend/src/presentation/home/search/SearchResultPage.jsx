import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles,
  ChevronDown,
  Sliders,
  TrendingDown,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import SearchSummaryHeader from './SearchSummary/SearchSummaryHeader';
import PlatformTabs from './PlatformSelector/PlatformTabs';
import RecommendedSection from './RecommendedProducts/RecommendedSection';
import ScrapingLoader from '../../shared/ScrapingLoader';
import { searchProducts, getStores, trackInteraction, savedSearchesApi } from '@/core/services/apiService';
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
  const [searchMetadata, setSearchMetadata] = useState(null);  // 🆕 NEW: Store freshness metadata
  const [filters, setFilters] = useState({
    price: [],
    rating: [],
    seller: [],
    shipping: [],
    availability: []
  });
  const [priceSortOption, setPriceSortOption] = useState('All options');
  const [priceSortOpen, setPriceSortOpen] = useState(false);
  const priceSortOptions = ['Highest to Lowest', 'Lowest to Highest', 'All options'];
  const [dealsOnly, setDealsOnly] = useState(false);
  const [minDiscount, setMinDiscount] = useState(0);
  const [dealsFilterOpen, setDealsFilterOpen] = useState(false);
  const [discountOptions, setDiscountOptions] = useState([0, 10, 20, 30, 50]);

  const [isSaved, setIsSaved] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveError, setSaveError] = useState(null);

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
        
        const response = await searchProducts(query, activePlatform, { dealsOnly, minDiscount });
        
        // Transform flat products array into grouped-by-platform structure
        // Backend returns: { search_id, query, total, products: [...] }
        // Frontend expects: { pcexpress: [...], villman: [...], pcworx: [...] }
        console.log('[SearchResultPage] API Response:', response);
        console.log('[SearchResultPage] Response keys:', Object.keys(response || {}));
        console.log('[SearchResultPage] response.products:', response?.products);
        
        if (response && response.products && Array.isArray(response.products)) {
          console.log(`[SearchResultPage] Found ${response.products.length} products`);
          
          // 🆕 Verify platform_id is present in products
          const sampleProduct = response.products[0];
          console.log('[SearchResultPage] Sample product structure:', {
            id: sampleProduct?.id,
            title: sampleProduct?.title?.substring(0, 40),
            platform: sampleProduct?.platform,
            platform_id: sampleProduct?.platform_id,
            platformId: sampleProduct?.platformId,
          });
          
          // 🆕 Store freshness metadata
          if (response.metadata) {
            setSearchMetadata(response.metadata);
            console.log(`[SearchResultPage] Freshness: ${response.metadata.freshness}%, stale: ${response.metadata.staleFraction}`);
          }
          
          const groupedByPlatform = response.products.reduce((acc, product) => {
            const platformKey = product.platform?.toLowerCase() || 'other';
            if (!acc[platformKey]) {
              acc[platformKey] = [];
            }
            acc[platformKey].push(product);
            return acc;
          }, {});
          
          console.log('[SearchResultPage] Grouped by platform:', Object.entries(groupedByPlatform).map(([platform, items]) => ({
            platform,
            count: items.length,
          })));
          
          setFilteredProducts(groupedByPlatform);
          // Track the search query for the recommendation engine — fire and forget
          trackInteraction('search', { query });
        } else {
          console.warn('[SearchResultPage] No products in response or invalid format');
          setFilteredProducts({});
          setSearchMetadata(null);
        }
      } catch (err) {
        setError(err.message);
        setFilteredProducts({});
      } finally {
        setLoading(false);
      }
    };
    fetchSearchResults();
  }, [query, activePlatform, dealsOnly, minDiscount]);

  const handleFilterChange = (filterType, selectedOptions) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: selectedOptions
    }));
  };

  const parsePriceValue = (value) => {
    if (value == null) return 0;
    const normalized = String(value)
      .replace(/[^0-9.,]/g, '')
      .replace(/,/g, '');
    const number = parseFloat(normalized);
    return Number.isNaN(number) ? 0 : number;
  };

  const handleSaveSearch = async () => {
    if (!query.trim()) return;
    
    setSavingSearch(true);
    setSaveError(null);
    
    try {
      const result = await savedSearchesApi.save(query);
      if (result.success) {
        setIsSaved(true);
        // Revert after 2 seconds
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        setSaveError(result.error || 'Failed to save search');
      }
    } catch (error) {
      if (error.status === 409) {
        setSaveError('This search is already saved');
      } else {
        setSaveError('Failed to save search');
      }
    } finally {
      setSavingSearch(false);
    }
  };

  const sortedProducts = useMemo(() => {
    if (!filteredProducts || priceSortOption === 'All options') {
      return filteredProducts;
    }

    const determineDirection = priceSortOption === 'Highest to Lowest' ? -1 : 1;

    return Object.keys(filteredProducts).reduce((acc, platformKey) => {
      const rawList = Array.isArray(filteredProducts[platformKey]) ? filteredProducts[platformKey] : [];
      const sorted = [...rawList].sort((a, b) => {
        const priceA = parsePriceValue(a.price);
        const priceB = parsePriceValue(b.price);
        return (priceA - priceB) * determineDirection;
      });
      acc[platformKey] = sorted;
      return acc;
    }, {});
  }, [filteredProducts, priceSortOption]);

  const togglePriceSort = () => setPriceSortOpen(prev => !prev);

  const choosePriceSort = (option) => {
    setPriceSortOption(option);
    setPriceSortOpen(false);
  };

  return (
    <div className="search-result-page">
      <SearchSummaryHeader query={query} stores={stores} />
      
      {/* Save Search Button */}
      <div className="save-search-container">
        <button 
          onClick={handleSaveSearch}
          disabled={savingSearch || !query.trim()}
          className={`save-search-btn ${isSaved ? 'saved' : ''}`}
          title={isSaved ? 'Search saved!' : 'Save this search'}
        >
          {isSaved ? (
            <>
              <BookmarkCheck size={16} strokeWidth={1.5} />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Bookmark size={16} strokeWidth={1.5} />
              <span>Save Search</span>
            </>
          )}
        </button>
        {saveError && <span className="save-search-error">{saveError}</span>}
      </div>
      
      {/* 🆕 Freshness Indicator - Modern minimal design */}
      {searchMetadata && !loading && (
        <div className={`freshness-metadata ${searchMetadata.isStale ? 'stale' : 'fresh'}`}>
          <div className="freshness-content">
            <div className="freshness-header">
              {searchMetadata.isStale ? (
                <>
                  <span className="freshness-icon">⏳</span>
                  <strong>Syncing Prices</strong>
                </>
              ) : (
                <>
                  <span className="freshness-icon">✓</span>
                  <strong>Fresh Data</strong>
                </>
              )}
            </div>
            <p className="freshness-details">
              {searchMetadata.freshness}% synced • Next update: {searchMetadata.nextRefreshIn}
            </p>
          </div>
          {searchMetadata.isStale && (
            <span className="freshness-count">{searchMetadata.staleFraction} updating</span>
          )}
        </div>
      )}
      
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
        {/* Filter Controls Container */}
        <div className="filter-controls-container">
          <div className="filter-group-wrapper">
            <div className="price-sort-wrapper">
              <button
                type="button"
                className={`price-sort-btn ${priceSortOpen ? 'open' : ''}`}
                onClick={togglePriceSort}
                aria-expanded={priceSortOpen}
                aria-haspopup="true"
                title="Sort by price"
              >
                <Sliders size={15} strokeWidth={2.2} />
                <span className="price-sort-label">Price</span>
                <ChevronDown size={16} strokeWidth={2} className={`chevron-icon ${priceSortOpen ? 'open' : ''}`} />
              </button>

              {priceSortOpen && (
                <div className="price-sort-dropdown" role="menu">
                  {priceSortOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`price-sort-option ${priceSortOption === option ? 'active' : ''}`}
                      onClick={() => choosePriceSort(option)}
                      title={`Sort by ${option}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Deals Button - Primary Header Action */}
            <div className="deals-btn-wrapper">
              <button
                type="button"
                className={`deals-btn ${dealsOnly ? 'active' : ''}`}
                onClick={() => setDealsOnly(!dealsOnly)}
                title="Toggle deals only mode"
                aria-pressed={dealsOnly}
              >
                <Sparkles size={15} strokeWidth={2.2} />
                <span>Deals</span>
              </button>
            </div>
          </div>

          {/* Min Discount Filter - Only visible when Deals is active */}
          {dealsOnly && (
              <div className="discount-filter-wrapper">
                <button
                  type="button"
                  className="discount-filter-btn"
                  onClick={() => setDealsFilterOpen(prev => !prev)}
                  aria-expanded={dealsFilterOpen}
                  aria-haspopup="true"
                  title="Select minimum discount percentage"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                  <span className="sr-only">Minimum discount</span>
                  <span>{minDiscount}%+</span>
                </button>

                {dealsFilterOpen && (
                  <div className="discount-filter-dropdown" role="menu">
                    {discountOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`discount-filter-option ${minDiscount === option ? 'active' : ''}`}
                        onClick={() => {
                          setMinDiscount(option);
                          setDealsFilterOpen(false);
                        }}
                        title={`Minimum ${option}% discount`}
                      >
                        {option}% or more
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Active Filter Label - Shows when Deals are on */}
        {dealsOnly && (
          <div className="active-filter-label">
            <Sparkles size={14} strokeWidth={2} />
            <span>Showing Deals Only</span>
          </div>
        )}

        {/* Main Content */}
        <main className="search-main">
          <PlatformTabs activePlatform={activePlatform} onPlatformChange={setActivePlatform} />
          <RecommendedSection 
            products={sortedProducts} 
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