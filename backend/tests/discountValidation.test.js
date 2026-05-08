/**
 * DEALS BUG FIX - DISCOUNT VALIDATION UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for discount calculation and is_on_sale flag validation.
 * 
 * Purpose:
 * - Ensure normalizeProduct() strictly validates discount data
 * - Prevent future false positives (all products marked as on-sale)
 * - Validate frontend defensively handles bad data
 * - Document expected behavior for discount logic
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const BaseScraper = require('../src/scrapers/baseScraper');

describe('Discount Validation - normalizeProduct()', () => {
  
  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 1: NULL original price → is_on_sale FALSE
  // ───────────────────────────────────────────────────────────────────────────────
  test('should set is_on_sale=false when original_price is null', () => {
    const raw = {
      title: 'Test Product',
      price: 2999,
      originalPrice: null,  // No price data
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBeNull();
    expect(normalized.discount_percent).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 2: Shopify "0.00" compare_at_price → treated as null
  // ───────────────────────────────────────────────────────────────────────────────
  test('should treat Shopify "0.00" compare_at_price as null original_price', () => {
    const raw = {
      title: 'Product from Shopify',
      price: 1999,
      originalPrice: '0.00',  // Shopify uses "0.00" for no compare price
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBeNull();
    expect(normalized.discount_percent).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 3: original_price = current price → not a discount
  // ───────────────────────────────────────────────────────────────────────────────
  test('should not mark as sale when original_price equals current price', () => {
    const raw = {
      title: 'Test Product',
      price: 2999,
      originalPrice: 2999,  // Same as current price
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBeNull();  // Rejected
    expect(normalized.discount_percent).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 4: original_price < current price → invalid
  // ───────────────────────────────────────────────────────────────────────────────
  test('should reject when original_price is less than current price', () => {
    const raw = {
      title: 'Test Product',
      price: 2999,
      originalPrice: 1999,  // Lower than current — data error
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBeNull();  // Rejected
    expect(normalized.discount_percent).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 5: Empty promo label → treated as no promo
  // ───────────────────────────────────────────────────────────────────────────────
  test('should treat empty/whitespace promo_label as null', () => {
    const raw = {
      title: 'Test Product',
      price: 2999,
      originalPrice: null,
      promoLabel: '   ',  // Whitespace only
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.promo_label).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 6: Valid discount (original > price by ≥₱1) → correctly computed
  // ───────────────────────────────────────────────────────────────────────────────
  test('should correctly compute discount percentage for valid price reduction', () => {
    const raw = {
      title: 'Product on Sale',
      price: 2000,
      originalPrice: 4000,  // 50% off
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBe(4000);
    expect(normalized.discount_percent).toBeCloseTo(50, 1);  // Within 0.1%
    expect(normalized.is_on_sale).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 7: Discount > 99% → treated as bad data
  // ───────────────────────────────────────────────────────────────────────────────
  test('should reject discount greater than 99% as bad data', () => {
    const raw = {
      title: 'Product',
      price: 1,
      originalPrice: 500000,  // >99% off — unrealistic
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBeNull();
    expect(normalized.discount_percent).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 8: Undefined original_price → treated as null
  // ───────────────────────────────────────────────────────────────────────────────
  test('should treat undefined original_price as null', () => {
    const raw = {
      title: 'Product',
      price: 2999,
      originalPrice: undefined,
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBeNull();
    expect(normalized.discount_percent).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 9: Valid product-specific promo label → is_on_sale TRUE
  // ───────────────────────────────────────────────────────────────────────────────
  test('should mark as on-sale with valid product-specific promo label', () => {
    const raw = {
      title: 'Product',
      price: 2999,
      originalPrice: null,
      promoLabel: 'Flash Sale - 24 Hours',  // Non-generic promo label
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.promo_label).toBe('Flash Sale - 24 Hours');
    expect(normalized.is_on_sale).toBe(true);
    expect(normalized.discount_percent).toBeNull();  // No price reduction
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 10: Generic labels (New, Featured, etc.) → rejected
  // ───────────────────────────────────────────────────────────────────────────────
  test('should reject generic labels like "new", "featured", "best seller"', () => {
    const genericLabels = ['New', 'Featured', 'Best Seller', 'Trending', 'Popular', 'Hot', 'RECOMMENDED'];

    genericLabels.forEach(label => {
      const raw = {
        title: 'Product',
        price: 2999,
        originalPrice: null,
        promoLabel: label,
      };

      const normalized = BaseScraper.normalizeProduct(raw);

      expect(normalized.promo_label).toBeNull();
      expect(normalized.is_on_sale).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 11: Minimum ₱1 difference rule
  // ───────────────────────────────────────────────────────────────────────────────
  test('should reject original_price that differs by less than ₱1', () => {
    const raw = {
      title: 'Product',
      price: 2999.00,
      originalPrice: 2999.50,  // Only 0.50 centavos difference — rounding error
      promoLabel: null,
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBeNull();
    expect(normalized.discount_percent).toBeNull();
    expect(normalized.is_on_sale).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // TEST 12: Both discount AND promo label present → is_on_sale TRUE
  // ───────────────────────────────────────────────────────────────────────────────
  test('should mark as on-sale when both discount and promo label exist', () => {
    const raw = {
      title: 'Product',
      price: 2000,
      originalPrice: 4000,  // 50% discount
      promoLabel: 'Limited Time Offer',
    };

    const normalized = BaseScraper.normalizeProduct(raw);

    expect(normalized.original_price).toBe(4000);
    expect(normalized.discount_percent).toBeCloseTo(50, 1);
    expect(normalized.promo_label).toBe('Limited Time Offer');
    expect(normalized.is_on_sale).toBe(true);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════

describe('ProductCard Frontend Defensive Validation', () => {

  // ───────────────────────────────────────────────────────────────────────────────
  // FRONTEND TEST 1: Requires is_on_sale=true for any discount badge
  // ───────────────────────────────────────────────────────────────────────────────
  test('should not show discount badge if is_on_sale is false', () => {
    const product = {
      price: 2999,
      original_price: 4000,
      discount_percent: 25,
      is_on_sale: false,  // FALSE — no badge despite discount data
    };

    // Simulate effectiveDiscount hook logic from ProductCard.jsx
    const effectiveDiscount = product.is_on_sale && product.discount_percent > 0
      ? product.discount_percent
      : 0;

    expect(effectiveDiscount).toBe(0);  // No badge shown
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // FRONTEND TEST 2: Requires discount_percent > 0
  // ───────────────────────────────────────────────────────────────────────────────
  test('should not show discount badge if discount_percent is 0 or null', () => {
    const product = {
      price: 2999,
      original_price: null,
      discount_percent: 0,
      is_on_sale: true,  // TRUE but no actual discount
    };

    const effectiveDiscount = product.is_on_sale && product.discount_percent > 0
      ? product.discount_percent
      : 0;

    expect(effectiveDiscount).toBe(0);  // No badge shown
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // FRONTEND TEST 3: Requires original_price > price
  // ───────────────────────────────────────────────────────────────────────────────
  test('should not show discount badge if original_price ≤ price', () => {
    const product = {
      price: 2999,
      original_price: 2999,  // Equal to current price
      discount_percent: 25,  // Bad data from backend
      is_on_sale: true,
    };

    // effectiveDiscount validates all three conditions
    const effectiveDiscount = product.is_on_sale && 
                             product.discount_percent > 0 && 
                             product.original_price > product.price
      ? product.discount_percent
      : 0;

    expect(effectiveDiscount).toBe(0);  // No badge shown
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // FRONTEND TEST 4: All conditions met → shows discount badge
  // ───────────────────────────────────────────────────────────────────────────────
  test('should show discount badge when all conditions are true', () => {
    const product = {
      price: 2000,
      original_price: 4000,
      discount_percent: 50,
      is_on_sale: true,
    };

    const effectiveDiscount = product.is_on_sale && 
                             product.discount_percent > 0 && 
                             product.original_price > product.price
      ? product.discount_percent
      : 0;

    expect(effectiveDiscount).toBe(50);  // Badge shown
  });

});
