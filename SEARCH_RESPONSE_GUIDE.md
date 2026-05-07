# Search API Response Guide

## Overview

The Search API now includes intelligent fallback filtering to ensure users always receive results, even if exact matches aren't found. The response includes a `fallbackLevel` field to help the frontend understand how results were obtained.

## Response Structure

```json
{
  "success": true,
  "query": "rtx 4070",
  "fallbackLevel": null,
  "totalResults": 12,
  "results": [
    {
      "id": "pcexpress-001",
      "title": "NVIDIA RTX 4070 Graphics Card",
      "price": 599.99,
      "rating": 4.8,
      "reviews_count": 250,
      "platform": "pcexpress",
      "_score": 0.8942,
      "_rankingMeta": {
        "relevance": 0.95,
        "price": 0.85,
        "quality": 0.92,
        "popularity": 0.78
      }
    },
    {
      "id": "villman-002",
      "title": "RTX 4070 Ti Super OC Edition",
      "price": 749.99,
      "rating": 4.9,
      "reviews_count": 180,
      "platform": "villman",
      "_score": 0.8756,
      "_rankingMeta": {
        "relevance": 0.92,
        "price": 0.78,
        "quality": 0.94,
        "popularity": 0.82
      }
    }
  ],
  "meta": {
    "search_time_ms": 2145,
    "stores_queried": 3,
    "cache_hit": false
  }
}
```

## Fallback Levels

### Level 1: Exact Match (fallbackLevel: null)

**Triggered when:** Query phrase appears verbatim in product title (case-insensitive)

**Example:**
- Query: `"RTX 4070"`
- Matches: "NVIDIA RTX 4070", "RTX 4070 Ti", etc.
- Frontend message: "Exact matches for 'RTX 4070'"

```javascript
// In frontend search component
if (response.fallbackLevel === null) {
  showStatus(`Exact matches for "${query}"`);
}
```

### Level 2: Token Match (fallbackLevel: 'token')

**Triggered when:** No exact match found, but individual keywords from the query appear in product titles

**Example:**
- Query: `"gaming monitor 4k"`
- Matches products containing: "gaming" OR "monitor" OR "4k"
- Products: "Gaming Monitor 2K", "4K Display Gaming", "Large Monitor"
- Frontend message: "Results matching individual keywords"

```javascript
// In frontend search component
if (response.fallbackLevel === 'token') {
  showStatus(`Results matching keywords: ${query.split(' ').join(', ')}`);
}
```

### Level 3: Unfiltered (fallbackLevel: 'unfiltered')

**Triggered when:** No exact match or token match found; returns all available products

**Example:**
- Query: `"xyz nonexistent"`
- Returns: All products from all stores
- Frontend message: "Showing available products (no specific matches found)"

```javascript
// In frontend search component
if (response.fallbackLevel === 'unfiltered') {
  showStatus(`No products match "${query}". Showing all available items.`);
}
```

## Ranking Factors

Each product includes a `_score` (0.0 - 1.0) computed from four factors:

- **Relevance** (35%): How well the title matches the search query
  - Token matching in title (title weight 2x, description weight 1x)
  - Normalized to [0, 1]
  - Formula: `(title_hits × 2 + desc_hits × 1) / (2 × tokens.length)`

- **Price** (25%): How well the price fits within market range
  - Budget-fit metric: `1 - (normalized_position_in_price_range)`
  - Products at median price score highest
  - Normalized to [0, 1]

- **Quality** (25%): Product rating and review count
  - Combines rating (60%) + logarithmic review count (40%)
  - Formula: `(0.6 × rating/5) + (0.4 × log(1 + reviews)/log_max)`
  - Normalized to [0, 1]

- **Popularity** (15%): How many users have viewed/reviewed
  - Logarithmic scaling prevents outliers
  - Formula: `log(1 + views) / log_max, log(1 + reviews) / log_max`
  - Normalized to [0, 1]

### Final Score Calculation

```
final_score = (0.35 × relevance) + (0.25 × price) + (0.25 × quality) + (0.15 × popularity)
```

## Error Responses

### Empty Result Set (All Scrapers Failed)

```json
{
  "success": false,
  "error": "Unable to retrieve products. Please try again.",
  "query": "search_term",
  "fallbackLevel": null,
  "totalResults": 0,
  "results": [],
  "meta": {
    "stores_queried": 3,
    "stores_failed": 3,
    "cache_hit": false
  }
}
```

### Partial Scraper Failure (Some Stores Work)

```json
{
  "success": true,
  "query": "rtx 4070",
  "fallbackLevel": "token",
  "totalResults": 8,
  "results": [
    // Results from successful scrapers only
  ],
  "meta": {
    "stores_queried": 3,
    "stores_failed": 1,
    "failed_stores": ["pcworx"],
    "cache_hit": false
  }
}
```

## Case Sensitivity

All matching is **case-insensitive**:

| Query | Matches |
|-------|---------|
| `"cpu"` | "CPU", "Cpu", "processor" (with aliases) |
| `"RTX"` | "rtx", "RTX", "RTX 4070" |
| `"monitor"` | "MONITOR", "Monitor", "Gaming Monitor" |

## Query Normalization

Before matching, queries are normalized:

1. **Trim**: Remove leading/trailing whitespace
2. **Lowercase**: Convert to lowercase
3. **Split**: Tokenize on whitespace for multi-word matching

| Input | Normalized | Matched As |
|-------|-----------|-----------|
| `"  CPU  "` | `"cpu"` | Single token |
| `"gaming monitor"` | `["gaming", "monitor"]` | Token match |
| `"rtx     4070"` | `"rtx     4070"` | Exact phrase (internal spaces preserved) |

## Frontend Integration Example

```jsx
// SearchResults.jsx
export function SearchResults({ query, response }) {
  if (!response.success) {
    return (
      <div className="error">
        <p>Search failed: {response.error}</p>
      </div>
    );
  }

  if (response.results.length === 0) {
    return (
      <div className="no-results">
        <h3>No Results</h3>
        <p>
          {response.fallbackLevel === 'token'
            ? `No exact matches for "${query}". Showing products with matching keywords.`
            : response.fallbackLevel === 'unfiltered'
            ? `Could not find products matching "${query}". Showing all available items.`
            : `No products found for "${query}`.`}
        </p>
      </div>
    );
  }

  return (
    <div className="results">
      <div className="header">
        <h2>Results for "{query}"</h2>
        {response.fallbackLevel && (
          <p className="fallback-notice">
            {response.fallbackLevel === 'token'
              ? 'Showing partial matches'
              : 'Showing all available products'}
          </p>
        )}
      </div>
      <div className="product-grid">
        {response.results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <p className="result-count">
        Found {response.totalResults} results in {response.meta.search_time_ms}ms
      </p>
    </div>
  );
}
```

## Debugging

The response includes metadata for troubleshooting:

```json
{
  "meta": {
    "search_time_ms": 2145,        // Total search duration
    "stores_queried": 3,            // Number of stores attempted
    "stores_failed": 0,             // Number of stores that failed
    "failed_stores": [],            // Which stores failed (if any)
    "cache_hit": false,             // Whether result came from cache
    "cache_age_ms": null            // Age of cached result (if cached)
  }
}
```

### Performance Guidelines

- **Search time < 1000ms**: Excellent
- **Search time 1000-3000ms**: Good (typical)
- **Search time > 3000ms**: Investigate scraper timeouts
- **stores_failed > 0**: Some platforms unavailable; show partial results

## Next Steps

1. **Frontend Implementation**: Use `fallbackLevel` to show appropriate messages
2. **Monitoring**: Track which queries trigger TIER 2/3 fallbacks
3. **Optimization**: If TIER 3 (unfiltered) is common, consider:
   - Improving product descriptions
   - Adding aliases for common product types
   - Adjusting relevance scoring weights

