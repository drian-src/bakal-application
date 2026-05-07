# Platform ID Injection Fix - Test Verification

**Date:** May 1, 2026  
**Issue Fixed:** Products from searchService path not being saved to database  
**Root Cause:** platform_id was null during database upsert  

## Changes Made

### File: `backend/src/services/searchService.js`

**Location:** searchWithFallback() function, lines 1110-1129

**Change:** Inject platform_id into each product before calling upsertProductsBatch()

```javascript
// Level 2: Live scrape
try {
  // ── LOAD PLATFORM IDS BEFORE SCRAPING ──────────────────────────────
  // These are needed to inject platform_id into each product before upsert
  if (!Object.keys(PLATFORM_IDS).length) {
    await loadPlatformIds();
  }

  const scrapedResults = await scrapeAllStores(query);
  
  // ── INJECT PLATFORM_ID INTO EACH PRODUCT ──────────────────────────
  // This must happen BEFORE upsertProductsBatch() because platform_id
  // is a NOT NULL constraint in the products table. normalizeProduct()
  // leaves it null because scrapers don't have DB access.
  const flatResults = scrapedResults
    .filter(sr => !sr.error && sr.items && sr.items.length > 0)
    .flatMap(sr => {
      const platformId = PLATFORM_IDS[sr.store.id];
      if (!platformId) {
        logger.warn(
          `[SearchService] No platform_id found for store "${sr.store.name}" ` +
          `(id: ${sr.store.id}). Skipping ${sr.items.length} products.`
        );
        return [];
      }
      logger.debug(`[SearchService] Injecting platform_id "${platformId}" into ${sr.items.length} products from "${sr.store.name}"`);
      return sr.items.map(item => ({
        ...item,
        platform_id: platformId,
      }));
    });
  
  if (flatResults.length > 0) {
    // ... continues to upsert with platform_id already present
  }
}
```

## How It Works

### Data Flow

1. **scrapeAllStores(query)** returns:
   ```
   [
     { store: {id: 'pcexpress', name: 'PCExpress'}, items: [{...product}] },
     { store: {id: 'villman', name: 'VillMan'}, items: [{...product}] },
     { store: {id: 'pcworx', name: 'PCWorx'}, items: [{...product}] }
   ]
   ```

2. **normalizeProduct()** returns products with:
   ```
   {
     title: '...',
     price: 1999.99,
     product_url: 'https://...',
     platform_id: null,  // ← Left null intentionally
     // Internal fields stripped by baseScraper.js
   }
   ```

3. **Injection Logic** (NEW):
   ```
   For each sr in scrapedResults:
     - Get platformId = PLATFORM_IDS[sr.store.id]
     - For each product in sr.items:
       - Add platform_id: platformId
   ```

4. **upsertProductsBatch()** receives products with:
   ```
   {
     title: '...',
     price: 1999.99,
     product_url: 'https://...',
     platform_id: 'b1ebdcf4-e478-4940-a8cc-074b777db0df',  // ← Now populated
   }
   ```

5. **cleanProductForDatabase()** strips internal fields and upsert succeeds

### Why This Mirrors BackgroundWorker

BackgroundWorker (already working) does:
```javascript
const platformId = await productRepo.getPlatformId(storeName);
await productRepo.upsertProduct({
  ...product,
  platform_id: platformId,  // ← Injected
});
```

Now searchService does the same but with PLATFORM_IDS cache (faster, no DB call per store):
```javascript
const platformId = PLATFORM_IDS[sr.store.id];  // ← From cache
return sr.items.map(item => ({
  ...item,
  platform_id: platformId,  // ← Injected
}));
```

## Testing Steps

### Test 1: Direct Search Query (Cold Cache)

```bash
# Start backend
npm run dev

# In another terminal, test search:
curl -X GET "http://localhost:3000/api/search?query=GPU&page=1&pageSize=10"
```

**Expected Results:**
- Response contains products with valid database IDs
- Log shows: `[SearchService] Injecting platform_id "..." into N products from "PCExpress"`
- No errors about "null value in column platform_id"
- Products appear in search results (frontend receives valid IDs)

### Test 2: Search with Different Stores

```bash
curl -X GET "http://localhost:3000/api/search?query=motherboard&page=1"
```

**Expected Results:**
- Each store (PCExpress, VillMan, PCWorx) shows: `Injecting platform_id "..." into N products`
- All products have valid platform_id in database
- Frontend shows products from all stores

### Test 3: Check Database

```sql
-- Run this in Supabase SQL editor
SELECT id, title, platform_id, created_at 
FROM products 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results:**
- All products have valid UUID in platform_id column (NOT NULL)
- No null values in platform_id
- id column has valid UUIDs (not temporary)

### Test 4: Check Logs

```
[SearchService] Injecting platform_id "..." into 12 products from "PCExpress"
[SearchService] Injecting platform_id "..." into 8 products from "VillMan"
[SearchService] Injecting platform_id "..." into 15 products from "PCWorx"
[SearchService] searchWithFallback: Live scrape successful (35 products)
[ProductRepository] Cleaned 35 products (removed internal fields)
[ProductRepository] Successfully upserted 35 products to database
```

## Files Involved

### Related Files (Unchanged)

1. **backend/src/repositories/productRepository.js**
   - cleanProductForDatabase(): Strips internal fields
   - upsertProductsBatch(): Calls cleanProductForDatabase on each product
   - Status: Already implemented, working correctly

2. **backend/src/scrapers/baseScraper.js**
   - normalizeProduct(): Returns products with platform_id: null
   - Status: Working as designed

3. **backend/src/jobs/backgroundWorker.js**
   - handleScrapeQuery(): Resolves platform_id per store before upsert
   - Status: Already working (proof that pattern works)

### Modified File

1. **backend/src/services/searchService.js**
   - searchWithFallback(): NOW injects platform_id before upsertProductsBatch()
   - Change: Lines 1110-1129 (inject platform_id in flatMap)

## Verification Checklist

- [ ] Syntax check passes (node -c src/services/searchService.js)
- [ ] Backend starts without errors
- [ ] Platform IDs load at startup
- [ ] Search query returns results with valid database IDs
- [ ] Products appear in database with platform_id populated
- [ ] No "null value in column platform_id" errors in logs
- [ ] No "Could not find '_source' column" errors (fields properly stripped)
- [ ] Frontend displays products correctly
- [ ] SearchController doesn't warn about "Found N products WITHOUT IDs"

## Rollback Plan

If issues occur:
1. Revert searchService.js to previous version
2. Backend will still work (BackgroundWorker continues to work)
3. Only searchService path (live scrapes) will be affected temporarily

## Performance Impact

- **Positive:** Platform IDs loaded once into cache, no DB lookup per product
- **Neutral:** Minimal overhead from platform_id injection (simple object spread)
- **No Change:** upsertProductsBatch() performance (same cleaning happens)

## Post-Fix Verification

After deployment:
1. Monitor logs for "Injecting platform_id" messages
2. Check database for products with valid platform_id
3. Verify frontend search results display products correctly
4. Confirm no new errors in error logs
