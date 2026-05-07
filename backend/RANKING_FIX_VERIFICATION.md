# SearchService Ranking Bug Fixes - Verification Guide

## Bugs Fixed

### 1. **ReferenceError: rankedProducts is not defined** (Line 815)
**Problem:** Module-scope code tried to reference `rankedProducts` which only existed inside `search()` function
```javascript
// BROKEN - At module scope (line 815)
const shapedProducts = rankedProducts.map(p => ({ ... }));
```

**Solution:** Moved shaping logic INSIDE `search()` function as STEP 3c, after `rankProducts()` call
- Line 697: Ranking produces `rankedProducts`
- Lines 710-742: Shape products while `rankedProducts` is in scope
- Line 744: Use shaped products for final output

### 2. **Data Loss: Using savedProducts Instead of rankedProducts**
**Problem:** Final products used `savedProducts` instead of ranked/sorted results
```javascript
// BROKEN
let finalProducts = savedProducts;  // Lost ranking order!
finalProducts = savedProducts.slice(0, resultLimit);
```

**Solution:** Use `shapedProducts` (which is ranked + shaped) for final output
```javascript
// FIXED
let finalProducts = shapedProducts;  // Respects ranking order!
finalProducts = shapedProducts.slice(0, resultLimit);
```

### 3. **Missing free_items Field**
**Problem:** `free_items` not extracted/returned by scrapers
**Solution:** Added to baseScraper.js normalizeProduct() return object
```javascript
free_items: Array.isArray(raw.free_items) ? raw.free_items : null,
```

## Data Pipeline Verification

### Step 1: Scraping (allProducts)
✅ Collects products from all stores
✅ DEBUG LOG: Sample product structure logged after scraping
```javascript
Sample fields: title, price, originalPrice, brand, sku, variation, specs, promo, freeItems
```

### Step 2: Filtering (fallbackFiltered)
✅ Applies deal/discount filters
✅ Applies relevance fallback (exact → token → unfiltered)

### Step 3a: Database Save (savedProducts)
✅ Saves products with real UUIDs
✅ Groups by store for response

### Step 3b: Ranking (rankedProducts)
✅ 5-factor scoring system applied
✅ **DEBUG LOG**: Verifies rankedProducts not empty and top product has all fields
```javascript
Top ranked: title, score, platform, specs
```

### Step 3c: Shaping (shapedProducts) - **NEW FIX**
✅ Maps rankedProducts with both snake_case and camelCase
✅ Ensures specs, brand, sku, variation always present (never null)
✅ Preserves ranking metadata (_score, _rankingBreakdown, _similarity)
✅ **DEBUG LOG**: Verifies all fields present in shaped products
```javascript
Fields checked: title, price, platform, specs, brand, sku, variation, 
                originalPrice, promoLabel, freeItems, scored
```

### Step 4: Limiting (finalProducts)
✅ Uses shaped products (ranked)
✅ Applies limit if specified

### Step 5: Response
✅ Returns finalProducts with store metadata
✅ All fields accessible to frontend components

## Testing Checklist

- [ ] Search returns results without `ReferenceError`
- [ ] Ranking order preserved in response (not replaced with save order)
- [ ] First product has complete specs object
- [ ] Brand, SKU, variation fields accessible
- [ ] camelCase aliases work (originalPrice, discountPercent, etc.)
- [ ] Free items field accessible when extracted by scraper
- [ ] Platform field correctly set for SearchResultPage grouping
- [ ] Top-ranked products appear first in response

## Debug Logging Output

Run a search and look for these log entries:

1. **Raw Products Sample**
   ```
   [SearchService] Sample product structure: {
     title: "Product...",
     price: 99.99,
     originalPrice: 149.99,
     brand: "Brand Name",
     sku: "SKU123",
     variation: "Color: Red",
     specs: "5 keys",
     promo: "20% Off",
     freeItems: "...",
     store: "PCExpress"
   }
   ```

2. **Ranking Verification**
   ```
   [SearchService] Top ranked product: {
     title: "Product...",
     score: 0.85,
     platform: "PCExpress",
     hasSpecs: "yes",
     specKeys: 5
   }
   ```

3. **Shaping Verification**
   ```
   [SearchService] Shaped product field check (first product): {
     title: true,
     price: true,
     platform: true,
     specs: true,
     brand: true,
     sku: true,
     variation: true,
     originalPrice: true,
     promoLabel: true,
     freeItems: true,
     scoredAndRanked: true,
     allPresent: true
   }
   ```

## Files Modified

1. **searchService.js**
   - Lines 697-742: Added STEP 3c (shaping) with rankedProducts in scope
   - Lines 744-754: Changed finalProducts to use shapedProducts
   - Lines 503-519: Added DEBUG logging for raw product sample
   - Lines 710-725: Added DEBUG logging for ranked product verification
   - Lines 728-745: Added DEBUG logging for shaped product field verification
   - Removed broken module-scope shapedProducts (was line 815)

2. **baseScraper.js**
   - Added `free_items` to normalizeProduct() return object

## Related Components

### Frontend
- **ProductCard.jsx**: Uses camelCase aliases (originalPrice, discountPercent, etc.)
- **SearchResultPage.jsx**: Groups by platform field
- **SpecsModal.jsx**: Displays specs object

### Ranking Engine
- **rankingEngine.js**: rankProducts() returns array of products with _score
- Products passed to shaping already have ranking metadata

### Scrapers
- **baseScraper.js**: normalizeProduct() returns complete product objects
- **villmanScraper.js**: Extracts specs, promo, brand, etc.
- **pcexpressScraper.js**: Extracts vendor (as brand), specs, promo from JSON-LD and CSS selectors
