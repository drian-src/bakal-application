# SearchService RankedProducts Bug - Complete Fix Summary

## Issue Summary
**Error:** `ReferenceError: rankedProducts is not defined` at searchService.js line 815

**Root Cause:** Code referenced `rankedProducts` at module scope, but the variable only existed inside the `search()` function.

## Fixes Applied

### Fix 1: Move Shaping Logic Inside Search Function ✅

**Location:** searchService.js STEP 3c (lines 710-742)

**What Changed:**
```javascript
// BEFORE: Broken module-scope code (line 815)
const shapedProducts = rankedProducts.map(p => ({...}));  // rankedProducts undefined!

// AFTER: Inside search() function, after ranking (line 710)
const shapedProducts = rankedProducts.map(p => ({
  ...p,
  // All fields properly exposed
}));
```

**Why This Works:**
- `rankedProducts` is now in scope (defined at line 697)
- Shaping happens immediately after ranking completes
- All product fields preserved and aliased for frontend

### Fix 2: Use Ranked+Shaped Products for Output ✅

**Location:** searchService.js lines 744-754

**What Changed:**
```javascript
// BEFORE: Ignored ranking, used save order
let finalProducts = savedProducts;
finalProducts = savedProducts.slice(0, resultLimit);

// AFTER: Respects ranking
let finalProducts = shapedProducts;  // ranked + shaped
finalProducts = shapedProducts.slice(0, resultLimit);
```

**Why This Works:**
- Final API response now respects ranking order
- No data loss from ranking process
- Limit applied to ranked results, not all results

### Fix 3: Add free_items Field Support ✅

**Location:** baseScraper.js normalizeProduct() return object

**What Changed:**
```javascript
// ADDED to return object:
free_items: Array.isArray(raw.free_items) ? raw.free_items : null,
```

**Why This Works:**
- Scrapers can now extract and return free promotional items
- Field preserved through entire pipeline
- Exposed to frontend via shaping

## Data Flow Verification

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: SCRAPING - allProducts                                  │
│ Extract from all stores (Villman, PCExpress, PCWorx)            │
│ Fields: title, price, originalPrice, brand, sku, variation,     │
│         specs, promo_label, free_items, image_url, etc.         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: FILTERING - fallbackFiltered                            │
│ Apply deal filters + relevance fallback                         │
│ Fields: Preserved from allProducts                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3a: DATABASE SAVE - savedProducts                          │
│ Insert/Update products with real UUIDs                          │
│ Fields: Preserved from fallbackFiltered                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3b: RANKING - rankedProducts                               │
│ Apply 5-factor scoring (keyword, behavior, similarity,          │
│ popularity, price)                                              │
│ Fields: All preserved + _score, _rankingBreakdown, _similarity  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3c: SHAPING - shapedProducts [NEW FIX]                     │
│ Expose both snake_case and camelCase fields                     │
│ Ensure specs, brand, sku, variation always present              │
│ Fields: All from rankedProducts + camelCase aliases             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: LIMITING - finalProducts [FIXED]                        │
│ Apply result limit (if specified)                               │
│ Now uses shapedProducts (ranked order preserved)                │
│ Fields: All from shapedProducts                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: RESPONSE FORMATTING                                     │
│ Group by store with metadata                                    │
│ Return API response with products + stores                      │
│ Frontend receives complete, ranked, shaped products             │
└─────────────────────────────────────────────────────────────────┘
```

## Fields Exposed to Frontend

### Core Fields (Always Present)
- `id` - UUID
- `title` - Product name
- `product_url` / `productUrl` - Link
- `platform` - Store name (grouping key)
- `image_url` / `imageUrl` - Product image
- `seller_name` / `storeName` - Store display name

### Pricing Fields
- `price` - Current price
- `original_price` / `originalPrice` - Before discount
- `discount_percent` / `discountPercent` - Discount percentage
- `is_on_sale` / `isOnSale` - Boolean flag
- `promo_label` / `promoLabel` - Promo text

### Product Details
- `brand` - Manufacturer/brand
- `sku` - Stock keeping unit
- `variation` - Size, color, etc.
- `specs` - Specifications object (always at least `{}`)
- `free_items` / `freeItems` - Free promotional items
- `rating` - Customer rating
- `reviews_count` / `reviewsCount` - Review count
- `is_available` / `isAvailable` - Availability
- `stock` - Inventory count

### Metadata Fields
- `last_scraped` / `lastScraped` - When data was fetched
- `platform_id` / `platformId` - Store UUID (FK)
- `view_count` - Frontend view tracking

### Ranking Metadata
- `_score` - Final ranking score (0-1)
- `_rankingBreakdown` - Factor breakdown
- `_similarity` - Semantic similarity score

## Debug Logging Added

### Log 1: Raw Product Sample (After Scraping)
Shows field extraction from scrapers works correctly
```
[SearchService] Sample product structure: {
  title: "Product Name...",
  price: 99.99,
  originalPrice: 149.99,
  brand: "Brand Name",
  sku: "SKU123",
  specs: "5 keys",
  promo: "20% Off",
  store: "PCExpress"
}
```

### Log 2: Ranking Verification (After Ranking)
Confirms rankedProducts not empty and contains data
```
[SearchService] Top ranked product: {
  title: "Product Name...",
  score: 0.85,
  platform: "PCExpress",
  specKeys: 5
}
```

### Log 3: Shaping Verification (After Shaping)
Ensures all required fields present before response
```
[SearchService] Shaped product field check (first product): {
  title: true,
  price: true,
  platform: true,
  specs: true,
  brand: true,
  originalPrice: true,
  allPresent: true
}
```

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| searchService.js | 1. Move shaping logic into search() function<br>2. Use shapedProducts for finalProducts<br>3. Add 3 debug logging points | 710-742, 744-754, 503-519, 710-725, 728-745 |
| baseScraper.js | Add free_items to normalizeProduct() return | ~278-279 |
| RANKING_FIX_VERIFICATION.md | Test guide & implementation verification | (new file) |

## Testing Instructions

### Quick Verification
1. Start backend: `npm start`
2. Search for any product: `GET /search?query=cpu`
3. Verify response contains:
   - ✅ No ReferenceError
   - ✅ Products are ranked (check _score values)
   - ✅ First product has all fields
   - ✅ specs object is present (not null)
   - ✅ brand, sku, variation accessible

### Full Validation
Run search tests with DEBUG logging:
```bash
LOG_LEVEL=debug npm start
# Then search from frontend
```

Look for the three debug log outputs showing:
1. Sample product after scraping
2. Verification of ranking
3. Verification of all fields in shaped products

### Expected Results
- ✅ Search returns 10-30 results
- ✅ Results ranked by _score (descending)
- ✅ No ReferenceError in logs
- ✅ Debug logs show all fields present
- ✅ Frontend can access camelCase and snake_case versions
- ✅ SpecsModal displays specs from shaped products
- ✅ SearchResultPage groups by platform

## Edge Cases Handled

| Case | Handling |
|------|----------|
| No products from scrapers | Returns empty array, no error |
| Ranking returns empty | Falls back to savedProducts order (no crash) |
| Missing spec fields | Always returns specs as `{}` (never null) |
| Missing brand/sku/variation | Always present but `null` if not extracted |
| No free items extracted | `freeItems: null` (graceful) |
| Result limit > total products | Returns all products (slicing returns all) |

## Performance Impact

- **Minimal**: Shaping adds `O(n)` map operation (already doing this)
- **No additional DB queries**: Uses same savedProducts
- **No additional ranking calls**: Uses existing rankProducts() result
- **Memory**: shapedProducts same size as rankedProducts

## Backward Compatibility

✅ **Frontend Compatible:**
- Old code using snake_case still works
- New code using camelCase aliases works
- Both available simultaneously

✅ **Database Compatible:**
- All existing schema columns unchanged
- free_items is optional (nullable)
- No migration required

✅ **API Response Compatible:**
- Response structure unchanged
- Additional fields don't break consumers
- All existing fields still present
