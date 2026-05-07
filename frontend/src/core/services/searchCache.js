/**
 * Search Results Cache - In-memory cache for search results
 * Lives for the entire browser session (cleared on page refresh)
 * Prevents re-scraping when returning to the same search query
 */

const cache = new Map();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const searchCache = {
  /**
   * Get cached results for a query
   * @param {string} query - The search term (lowercased + trimmed)
   * @param {string} platform - The platform filter ('all' or specific platform)
   * @returns {object|null} cached results or null if expired/missing
   */
  get(query, platform = 'all') {
    const key = this._getKey(query, platform);
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache has expired
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      cache.delete(key); // expired
      console.log(`[Cache EXPIRED] "${key}"`);
      return null;
    }
    
    return entry.data;
  },

  /**
   * Store results for a query
   * @param {string} query
   * @param {string} platform
   * @param {object} data - The full API response to cache
   */
  set(query, platform = 'all', data) {
    const key = this._getKey(query, platform);
    cache.set(key, { data, timestamp: Date.now() });
    console.log(`[Cache SET] "${key}" - ${Date.now()}`);
  },

  /**
   * Check if a query has valid cached data
   */
  has(query, platform = 'all') {
    return this.get(query, platform) !== null;
  },

  /**
   * Manually invalidate a specific query's cache
   */
  invalidate(query, platform = 'all') {
    const key = this._getKey(query, platform);
    cache.delete(key);
    console.log(`[Cache INVALIDATED] "${key}"`);
  },

  /**
   * Clear all cached results
   */
  clear() {
    cache.clear();
    console.log(`[Cache CLEARED] All entries removed`);
  },

  /**
   * Get all currently cached query keys (for debugging)
   */
  keys() {
    return Array.from(cache.keys());
  },

  /**
   * Get cache stats (for debugging)
   */
  stats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
      items: Array.from(cache.entries()).map(([key, val]) => ({
        key,
        age: Date.now() - val.timestamp,
        expired: Date.now() - val.timestamp > CACHE_DURATION_MS,
      })),
    };
  },

  /**
   * Internal: Generate cache key from query + platform (maxPerPlatform removed)
   */
  _getKey(query, platform = 'all') {
    const normalized = (query || '').toLowerCase().trim();
    return `${normalized}__${platform}`;
  },

  /**
   * Persist cache to sessionStorage (survives navigation, cleared on tab close)
   */
  saveToSession() {
    try {
      const serializable = Array.from(cache.entries());
      sessionStorage.setItem('searchCache', JSON.stringify(serializable));
      console.log(`[Cache SAVED] to sessionStorage - ${serializable.length} entries`);
    } catch (e) {
      console.warn('[Cache] sessionStorage save failed:', e.message);
    }
  },

  /**
   * Load cache from sessionStorage on app startup
   */
  loadFromSession() {
    try {
      const stored = sessionStorage.getItem('searchCache');
      if (!stored) return;
      
      const entries = JSON.parse(stored);
      let loaded = 0;
      
      entries.forEach(([key, value]) => {
        // Only restore if not expired
        if (Date.now() - value.timestamp < CACHE_DURATION_MS) {
          cache.set(key, value);
          loaded++;
        }
      });
      
      console.log(`[Cache LOADED] from sessionStorage - ${loaded} valid entries restored`);
    } catch (e) {
      console.warn('[Cache] sessionStorage load failed:', e.message);
    }
  },
};

export default searchCache;
