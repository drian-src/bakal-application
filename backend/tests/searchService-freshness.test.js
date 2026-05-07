/**
 * Search Service Cache Freshness Tests
 * Tests validateCacheFreshness and shouldRescrape logic
 */

const searchService = require('../src/services/searchService');

describe('SearchService Cache Freshness Logic', () => {
  describe('validateCacheFreshness()', () => {
    it('should return true for fresh products (< 6 hours old)', () => {
      const now = Date.now();
      const products = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() }, // 1h
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 2 * 60 * 60 * 1000).toISOString() }, // 2h
        { id: 3, title: 'Product 3', last_scraped: new Date(now - 3 * 60 * 60 * 1000).toISOString() }, // 3h
      ];
      
      const isFresh = searchService.validateCacheFreshness(products);
      expect(isFresh).toBe(true);
    });

    it('should return false for stale products (all > 6 hours old)', () => {
      const now = Date.now();
      const products = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 7 * 60 * 60 * 1000).toISOString() }, // 7h
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 8 * 60 * 60 * 1000).toISOString() }, // 8h
      ];
      
      const isFresh = searchService.validateCacheFreshness(products);
      expect(isFresh).toBe(false);
    });

    it('should return false for empty or null products', () => {
      expect(searchService.validateCacheFreshness(null)).toBe(false);
      expect(searchService.validateCacheFreshness(undefined)).toBe(false);
      expect(searchService.validateCacheFreshness([])).toBe(false);
    });

    it('should require at least 3 fresh results', () => {
      const now = Date.now();
      
      // 1 fresh result should return false
      const products1 = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() }
      ];
      expect(searchService.validateCacheFreshness(products1)).toBe(false);
      
      // 2 fresh results should return false
      const products2 = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() },
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 2 * 60 * 60 * 1000).toISOString() }
      ];
      expect(searchService.validateCacheFreshness(products2)).toBe(false);
      
      // 3 fresh results should return true
      const products3 = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() },
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
        { id: 3, title: 'Product 3', last_scraped: new Date(now - 3 * 60 * 60 * 1000).toISOString() }
      ];
      expect(searchService.validateCacheFreshness(products3)).toBe(true);
    });

    it('should handle mixed fresh and stale products', () => {
      const now = Date.now();
      const products = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() },   // 1h (fresh)
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 7 * 60 * 60 * 1000).toISOString() },   // 7h (stale)
        { id: 3, title: 'Product 3', last_scraped: new Date(now - 2 * 60 * 60 * 1000).toISOString() },   // 2h (fresh)
        { id: 4, title: 'Product 4', last_scraped: new Date(now - 8 * 60 * 60 * 1000).toISOString() },   // 8h (stale)
        { id: 5, title: 'Product 5', last_scraped: new Date(now - 3 * 60 * 60 * 1000).toISOString() }    // 3h (fresh)
      ];
      
      // 3 fresh results, so should be true
      const isFresh = searchService.validateCacheFreshness(products);
      expect(isFresh).toBe(true);
    });

    it('should handle missing last_scraped field', () => {
      const now = Date.now();
      const products = [
        { id: 1, title: 'Product 1' }, // No last_scraped
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() },
        { id: 3, title: 'Product 3', last_scraped: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
        { id: 4, title: 'Product 4', last_scraped: new Date(now - 3 * 60 * 60 * 1000).toISOString() }
      ];
      
      // 3 fresh results (ignoring missing), so should be true
      const isFresh = searchService.validateCacheFreshness(products);
      expect(isFresh).toBe(true);
    });
  });

  describe('shouldRescrape()', () => {
    it('should force-scrape when flag is true', () => {
      const products = [{ id: 1, title: 'Product 1', last_scraped: new Date().toISOString() }];
      const shouldReScrape = searchService.shouldRescrape(products, true);
      expect(shouldReScrape).toBe(true);
    });

    it('should scrape when cache is empty', () => {
      expect(searchService.shouldRescrape(null, false)).toBe(true);
      expect(searchService.shouldRescrape(undefined, false)).toBe(true);
      expect(searchService.shouldRescrape([], false)).toBe(true);
    });

    it('should not scrape fresh cache without force flag', () => {
      const now = Date.now();
      const products = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() },
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() },
        { id: 3, title: 'Product 3', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() }
      ];
      const shouldReScrape = searchService.shouldRescrape(products, false);
      expect(shouldReScrape).toBe(false);
    });

    it('should scrape when fewer than 3 fresh results', () => {
      const now = Date.now();
      const products = [
        { id: 1, title: 'Product 1', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() }, // 1h (fresh)
        { id: 2, title: 'Product 2', last_scraped: new Date(now - 8 * 60 * 60 * 1000).toISOString() }, // 8h (stale)
      ];
      const shouldReScrape = searchService.shouldRescrape(products, false);
      expect(shouldReScrape).toBe(true);
    });

    it('should handle missing last_scraped', () => {
      const now = Date.now();
      const products = [
        { id: 1, title: 'Product 1' }, // No last_scraped
        { id: 2, title: 'Product 2' }, // No last_scraped
        { id: 3, title: 'Product 3', last_scraped: new Date(now - 1 * 60 * 60 * 1000).toISOString() } // 1h
      ];
      const shouldReScrape = searchService.shouldRescrape(products, false);
      expect(shouldReScrape).toBe(true); // Only 1 fresh, needs re-scrape
    });
  });

  describe('getCacheAge()', () => {
    it('should calculate age from most recent product', () => {
      const now = Date.now();
      const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
      const products = [
        { id: 1, title: 'Product 1', last_scraped: oneHourAgo }
      ];
      
      const age = searchService.getCacheAge(products);
      expect(age).toBeGreaterThan(59 * 60 * 1000); // At least 59 minutes
      expect(age).toBeLessThan(61 * 60 * 1000);   // Less than 61 minutes
    });

    it('should return null for empty or null products', () => {
      expect(searchService.getCacheAge(null)).toBe(null);
      expect(searchService.getCacheAge(undefined)).toBe(null);
      expect(searchService.getCacheAge([])).toBe(null);
    });

    it('should handle missing last_scraped', () => {
      const products = [
        { id: 1, title: 'Product 1' },
        { id: 2, title: 'Product 2' }
      ];
      
      const age = searchService.getCacheAge(products);
      expect(age).toBe(null);
    });

    it('should use most recent timestamp', () => {
      const now = Date.now();
      const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      const products = [
        { id: 1, title: 'Product 1', last_scraped: twoHoursAgo }, // 2h
        { id: 2, title: 'Product 2', last_scraped: oneHourAgo }   // 1h (most recent)
      ];
      
      const age = searchService.getCacheAge(products);
      expect(age).toBeGreaterThan(59 * 60 * 1000); // At least 59 minutes (from 1h ago)
      expect(age).toBeLessThan(61 * 60 * 1000);   // Less than 61 minutes
    });
  });
});
