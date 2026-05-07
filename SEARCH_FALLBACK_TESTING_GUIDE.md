# End-to-End Search Fallback Testing Guide

## Overview

This guide covers testing the search fallback system to ensure it properly handles various query scenarios and returns appropriate results with correct `fallbackLevel` indicators.

## Prerequisites

- Backend running: `npm start`
- Frontend running: `npm run dev`
- All three scrapers enabled: pcexpress, pcworx, villman
- Backend logs visible for debugging

## Test Scenarios

### TIER 1: Exact Match Tests

These tests should return `fallbackLevel: null` with exact phrase matches.

#### Test 1.1: Simple Exact Match
**Query:** `cpu`  
**Expected:** Result where "CPU" appears in title  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=cpu"
```
**Validation:**
- ✓ `fallbackLevel` is `null`
- ✓ At least 1 result returned
- ✓ Results contain products with "CPU" in title
- ✓ Log shows: `[TIER 1 EXACT]`

**Frontend Check:**
- Search input shows "Search for cpu..."
- Results header shows "Exact matches for 'cpu'"
- No fallback warning displayed

---

#### Test 1.2: Multi-Word Exact Match
**Query:** `rtx 4070`  
**Expected:** Exact phrase "RTX 4070" products  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=rtx%204070"
```
**Validation:**
- ✓ `fallbackLevel` is `null`
- ✓ All results contain both "RTX" and "4070"
- ✓ Log shows: `[TIER 1 EXACT]`
- ✓ Response contains `_rankingMeta` with relevance score ~0.90+

**Ranking Verification:**
```javascript
// Top result should have high relevance score
result._rankingMeta.relevance > 0.85  // 85%+ match
```

---

#### Test 1.3: Case Insensitivity
**Query:** `I9` vs `i9` vs `I9` vs `intel i9`  
**Expected:** All variants return same results  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=i9"
curl "http://localhost:5000/api/search?query=I9"
curl "http://localhost:5000/api/search?query=INTEL%20I9"
```
**Validation:**
- ✓ All three queries return same product IDs
- ✓ `fallbackLevel` is `null` for all
- ✓ Result count identical across queries

**Frontend Check:**
- Type "i9" and "I9" → identical results shown
- Case input has no effect on results

---

### TIER 2: Token Match Tests

These tests should return `fallbackLevel: 'token'` when no exact phrase matches.

#### Test 2.1: Multi-Term Partial Match
**Query:** `gaming monitor 4k`  
**Expected:** Products with ANY of: "gaming", "monitor", "4k"  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=gaming%20monitor%204k"
```
**Validation:**
- ✓ `fallbackLevel` is `'token'`
- ✓ Results contain products matching at least one keyword
- ✓ Log shows: `[TIER 2 TOKEN]`
- ✓ Result count > TIER 1 (broader results)

**Relevance Score Check:**
```javascript
// Token matches should have lower relevance than exact matches
result._rankingMeta.relevance < 0.85  // Less than 85%
```

**Frontend Check:**
- Results show with yellow/orange warning banner
- Message: "Results matching individual keywords: gaming, monitor, 4k"

---

#### Test 2.2: Two-Word Partial Match
**Query:** `mechanical keyboard`  
**Expected:** Products with "mechanical" OR "keyboard"  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=mechanical%20keyboard"
```
**Validation:**
- ✓ Check if exact phrase "mechanical keyboard" exists
  - If YES → `fallbackLevel: null`
  - If NO → `fallbackLevel: 'token'`
- ✓ All results contain at least one keyword
- ✓ Relevant products in top positions

---

### TIER 3: Unfiltered Fallback Tests

These tests should return `fallbackLevel: 'unfiltered'` when no matches found.

#### Test 3.1: Completely Nonexistent Product
**Query:** `zzzzzzz` (nonsense)  
**Expected:** All available products (unfiltered)  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=zzzzzzz"
```
**Validation:**
- ✓ `fallbackLevel` is `'unfiltered'`
- ✓ Result count = total products in database
- ✓ Log shows: `[TIER 3 UNFILTERED]`
- ✓ No filtering applied (random product order possible)

**Frontend Check:**
- Red/Warning banner displayed
- Message: "No products match 'zzzzzzz'. Showing all available items."
- All product categories displayed

---

#### Test 3.2: Misspelled Query
**Query:** `rtx 407` (missing digit)  
**Expected:** Depends on product database
- If "407" products exist → TIER 1/2
- If not → TIER 3 (all products)

**Command:**
```bash
curl "http://localhost:5000/api/search?query=rtx%20407"
```
**Validation:**
- ✓ Observe which tier is triggered based on data
- ✓ If TIER 3: Confirm all products returned

---

#### Test 3.3: Very Rare Product
**Query:** `obscure-brand-xyz`  
**Expected:** TIER 3 (assuming brand doesn't exist)  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=obscure-brand-xyz"
```
**Validation:**
- ✓ `fallbackLevel` is `'unfiltered'`
- ✓ All products returned (no filtering)
- ✓ Product variety covers all categories

---

## Scraper Resilience Tests

### Test 4.1: Single Scraper Timeout
**Scenario:** Simulate one scraper being very slow  
**Setup:**
1. Add artificial delay to one scraper
2. Run search query: `cpu`
3. Monitor logs

**Validation:**
- ✓ Search still completes (doesn't hang)
- ✓ `meta.stores_failed` shows 1
- ✓ Results still returned from other stores
- ✓ No `fallbackLevel` change (independent of scraper success)

**Log Check:**
```
[SearchService] scraper_rejection: timeout from pcworx
[SearchService] Scraping returned 2/3 stores successfully
```

---

### Test 4.2: All Scrapers Timeout
**Scenario:** All scrapers fail simultaneously  
**Setup:**
1. Stop all backend services briefly
2. Send search request
3. Monitor response

**Validation:**
- ✓ `success: false`
- ✓ Error message displayed
- ✓ `meta.stores_failed` = 3
- ✓ `results: []` (empty)

**Frontend Check:**
- Error message: "Unable to retrieve products. Please try again."
- Retry button available
- No partial results shown

---

## Cache Tests

### Test 5.1: Cache Hit
**Query:** `rtx 4070` (initial)  
**Expected:** `meta.cache_hit: false`
**Command:**
```bash
curl "http://localhost:5000/api/search?query=rtx%204070"
# Response includes: cache_hit: false

# Wait 1 second, repeat same query
curl "http://localhost:5000/api/search?query=rtx%204070"
# Response includes: cache_hit: true, cache_age_ms: ~1000
```
**Validation:**
- ✓ First request: `cache_hit: false`
- ✓ Second request (same query): `cache_hit: true`
- ✓ Results are identical
- ✓ Response time faster on cache hit

---

### Test 5.2: Cache Invalidation
**Scenario:** Empty result set isn't cached  
**Query:** `zzzzzzz` (returns 0 products)  
**Expected:** `cache_hit: false` on repeated queries

**Command:**
```bash
curl "http://localhost:5000/api/search?query=zzzzzzz"
# First request, tries to scrape

curl "http://localhost:5000/api/search?query=zzzzzzz"
# Second request, should scrape again (not cached)
```
**Validation:**
- ✓ Both requests show `cache_hit: false`
- ✓ Empty results not cached to avoid stale data
- ✓ Each request rescraped

---

## Performance Tests

### Test 6.1: Response Time Benchmark
**Query:** `cpu` (common query, should be cached)  
**Expected:** < 2000ms  
**Command:**
```bash
time curl "http://localhost:5000/api/search?query=cpu"
```
**Validation:**
- ✓ Total time < 2000ms
- ✓ `search_time_ms` in response < 2000ms
- ✓ All stores respond (no timeouts)

---

### Test 6.2: Load Test (Multiple Concurrent Queries)
**Scenario:** 10 simultaneous search requests  
**Command:**
```bash
for i in {1..10}; do
  curl "http://localhost:5000/api/search?query=cpu" &
done
wait
```
**Validation:**
- ✓ All 10 requests complete
- ✓ Response times consistent
- ✓ No "too many connections" errors
- ✓ No server crashes

---

## Ranking Tests

### Test 7.1: Score Distribution
**Query:** `rtx 4070`  
**Command:**
```bash
curl "http://localhost:5000/api/search?query=rtx%204070" | jq '.results[].\_score'
```
**Validation:**
- ✓ All scores between 0.0 - 1.0
- ✓ Scores for TIER 1 matches > 0.75
- ✓ Scores decrease as relevance decreases
- ✓ Relevance factor dominant (35% weight)

**Score Inspection:**
```javascript
// Top result should have highest score
response.results[0]._score >= response.results[1]._score

// All sub-scores in [0, 1]
result._rankingMeta.relevance in [0,1]
result._rankingMeta.price in [0,1]
result._rankingMeta.quality in [0,1]
result._rankingMeta.popularity in [0,1]
```

---

### Test 7.2: Factor Verification
**Query:** `rtx 4070` (high-end expensive product)  
**Expected:**
- High relevance (exact match)
- Lower price score (expensive, not in budget range)
- High quality (good reviews)
- Medium popularity (niche product)

**Validation:**
```javascript
result._rankingMeta.relevance > 0.80  // Exact match
result._rankingMeta.price < 0.60      // Expensive
result._rankingMeta.quality > 0.80    // Well-reviewed
result._rankingMeta.popularity > 0.50 // Some visibility
```

---

## Frontend Integration Tests

### Test 8.1: Empty Results Display
**Query:** User enters empty search → presses Enter  
**Expected:** 
- No request sent (frontend validation)
- Placeholder text: "Try searching for 'CPU', 'Monitor', etc."

**Validation:**
- ✓ No network request made
- ✓ Helper text displayed

---

### Test 8.2: Error State Recovery
**Scenario:** Search fails → user clicks retry  
**Expected:**
- Error shown on first attempt
- Retry button available
- Second attempt succeeds

**Command Sequence:**
1. Stop backend
2. Type "cpu" and search → Error shown
3. Start backend
4. Click "Retry" → Results shown

**Validation:**
- ✓ Error message clear
- ✓ Retry button prominent
- ✓ Button action refetches without resetting query

---

### Test 8.3: Fallback Notice Display
**Query:** `monitor display` (token match)  
**Expected:**
- Results displayed with notice
- Notice explains keyword matching
- User can still see products

**Validation:**
- ✓ Yellow/orange notice bar visible
- ✓ Text: "Results matching keywords: monitor, display"
- ✓ Products beneath notice fully visible
- ✓ Notice doesn't block interaction

---

## Debugging Tools

### Backend Logs
Monitor logs to understand fallback behavior:

```bash
# Terminal 1: Start backend with debug logging
DEBUG=* npm start

# Terminal 2: Run test query
curl "http://localhost:5000/api/search?query=cpu"

# Check logs for:
# [SearchService] Platform IDs loaded...
# [SearchService] Scraping: "cpu"...
# [RobustSearch] scraper success/rejection...
# [TIER 1 EXACT] / [TIER 2 TOKEN] / [TIER 3 UNFILTERED]
# Search completed in Xms with Y products
```

### Browser DevTools
```javascript
// In browser console, after searching
// Check response structure
const response = await fetch('/api/search?query=cpu').then(r => r.json());
console.log('Fallback Level:', response.fallbackLevel);
console.log('Result Count:', response.totalResults);
console.log('Top Score:', response.results[0]._score);
console.log('Search Time:', response.meta.search_time_ms);
```

---

## Test Matrix

| Test | Query | Expected Level | Frontend Message | Status |
|------|-------|----------------|-----------------|--------|
| 1.1  | `cpu` | TIER 1 | "Exact matches" | ☐ |
| 1.2  | `rtx 4070` | TIER 1 | "Exact matches" | ☐ |
| 1.3  | `I9` vs `i9` | TIER 1 | Same results | ☐ |
| 2.1  | `gaming monitor 4k` | TIER 2 | "Partial matches" | ☐ |
| 2.2  | `mechanical keyboard` | TIER 1/2 | Varies | ☐ |
| 3.1  | `zzzzzzz` | TIER 3 | "All items" | ☐ |
| 3.2  | `rtx 407` | TIER 2/3 | Varies | ☐ |
| 3.3  | `obscure-brand-xyz` | TIER 3 | "All items" | ☐ |
| 4.1  | Any (1 scraper down) | TIER 1-3 | Same | ☐ |
| 4.2  | Any (all down) | ERROR | Error message | ☐ |
| 5.1  | Repeated query | TIER 1 | Consistent | ☐ |
| 5.2  | `zzzzzzz` repeated | TIER 3 | Not cached | ☐ |
| 6.1  | `cpu` | - | < 2000ms | ☐ |
| 6.2  | 10x concurrent | - | All succeed | ☐ |
| 7.1  | `rtx 4070` | TIER 1 | Score > 0.75 | ☐ |
| 7.2  | `rtx 4070` | TIER 1 | Meta correct | ☐ |
| 8.1  | Empty input | - | No request | ☐ |
| 8.2  | Error + Retry | - | Error then success | ☐ |
| 8.3  | `monitor display` | TIER 2 | Notice shown | ☐ |

---

## Continuous Monitoring

After deployment, monitor:

1. **Fallback Tier Distribution**
   - TIER 1: Should be 70-80% of searches
   - TIER 2: Should be 15-25%
   - TIER 3: Should be < 5%
   - If TIER 3 common → improve product descriptions

2. **Search Latency**
   - p50 < 1000ms (cached)
   - p95 < 3000ms
   - p99 < 5000ms
   - If high → investigate scraper timeouts

3. **Scraper Success Rate**
   - Target: 99%+ (only rare timeouts)
   - If < 95% → investigate specific scraper

4. **Cache Hit Rate**
   - Target: 30-50% (depends on query diversity)
   - Low rates → cache timeout too short
   - High rates → cache timeout too long

