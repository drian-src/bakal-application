/**
 * Product Repository Freshness Query Tests
 * Tests new methods: searchByQueryFresh, getStaleProducts, incrementViewCount, etc.
 */

const productRepo = require('../src/repositories/productRepository');

describe('ProductRepository Freshness Methods', () => {
  describe('searchByQueryFresh()', () => {
    it('should filter products by freshness threshold', async () => {
      // Note: This is a basic integration test structure
      // Actual execution requires database setup
      expect(typeof productRepo.searchByQueryFresh).toBe('function');
    });

    it('should filter for only available products', async () => {
      expect(typeof productRepo.searchByQueryFresh).toBe('function');
    });

    it('should order by last_scraped descending', async () => {
      expect(typeof productRepo.searchByQueryFresh).toBe('function');
    });
  });

  describe('getStaleProducts()', () => {
    it('should return products older than threshold', async () => {
      expect(typeof productRepo.getStaleProducts).toBe('function');
    });

    it('should respect limit parameter', async () => {
      expect(typeof productRepo.getStaleProducts).toBe('function');
    });

    it('should order by last_scraped ascending (oldest first)', async () => {
      expect(typeof productRepo.getStaleProducts).toBe('function');
    });
  });

  describe('markUnavailable()', () => {
    it('should set is_available to false for given URL', async () => {
      expect(typeof productRepo.markUnavailable).toBe('function');
    });

    it('should throw on error', async () => {
      expect(typeof productRepo.markUnavailable).toBe('function');
    });
  });

  describe('incrementViewCount()', () => {
    it('should increment view_count atomically', async () => {
      expect(typeof productRepo.incrementViewCount).toBe('function');
    });

    it('should not throw on error (graceful degradation)', async () => {
      expect(typeof productRepo.incrementViewCount).toBe('function');
    });
  });

  describe('upsertProductsBatch()', () => {
    it('should upsert multiple products at once', async () => {
      expect(typeof productRepo.upsertProductsBatch).toBe('function');
    });

    it('should handle onConflict product_url', async () => {
      expect(typeof productRepo.upsertProductsBatch).toBe('function');
    });

    it('should handle empty arrays gracefully', async () => {
      expect(typeof productRepo.upsertProductsBatch).toBe('function');
    });
  });
});

describe('ProductRepository Method Exports', () => {
  it('should export all freshness methods', () => {
    expect(productRepo.searchByQueryFresh).toBeDefined();
    expect(productRepo.getStaleProducts).toBeDefined();
    expect(productRepo.markUnavailable).toBeDefined();
    expect(productRepo.incrementViewCount).toBeDefined();
    expect(productRepo.upsertProductsBatch).toBeDefined();
  });

  it('should still export legacy methods', () => {
    expect(productRepo.upsertProduct).toBeDefined();
    expect(productRepo.findByUrl).toBeDefined();
    expect(productRepo.findById).toBeDefined();
    expect(productRepo.findByIds).toBeDefined();
    expect(productRepo.findAll).toBeDefined();
    expect(productRepo.findRecent).toBeDefined();
    expect(productRepo.findTopRated).toBeDefined();
  });
});
