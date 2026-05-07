# Pagination Quick Reference

## API Endpoint

```
GET /api/search?q=<query>&page=<page>&pageSize=<pageSize>&limit=<limit>
```

## Query Parameters

| Parameter | Type | Default | Range | Notes |
|-----------|------|---------|-------|-------|
| `q` | string | required | - | Search query |
| `page` | integer | 1 | 1+ | Current page (1-based) |
| `pageSize` | integer | 20 | 1-100 | Results per page |
| `limit` | integer | null | 1-? | Pre-pagination limit (optional) |

## Response Structure

```javascript
{
  "success": true,
  "data": {
    "search_id": "string",          // Search record ID
    "query": "string",              // Normalized query
    "total": 45,                    // After limit, before pagination
    "allProductsCount": 45,
    "fallbackLevel": null,          // 'exact' | 'token' | 'unfiltered'
    "stores": [...],                // Store metadata with item counts
    "products": [                   // THIS PAGE'S RESULTS ONLY
      {
        "id": 1,
        "title": "string",
        "price": 699.99,
        "rating": 4.9,
        "reviews_count": 200,
        "platform": "pcexpress",
        "_score": 0.892,            // Final ranking score
        "_rankingMeta": {           // Factor breakdown
          "relevance": 0.95,
          "price": 0.85,
          "quality": 0.92,
          "popularity": 0.78
        }
      },
      // ... more products
    ],
    "pagination": {
      "page": 1,                    // Current page
      "pageSize": 20,               // Results per page
      "totalCount": 45,             // Total matching products
      "totalPages": 3               // Total pages available
    }
  }
}
```

## Common Patterns

### Fetch Page 1

```javascript
const url = new URL('/api/search', 'http://localhost:5000');
url.searchParams.set('q', 'cpu');
url.searchParams.set('page', '1');
url.searchParams.set('pageSize', '20');

const response = await fetch(url);
const data = await response.json();
console.log(data.data.pagination); // { page: 1, pageSize: 20, totalCount: 45, totalPages: 3 }
```

### Fetch Next Page

```javascript
function nextPage(currentPage, pageSize) {
  return currentPage + 1;
}

const nextPageNum = nextPage(data.data.pagination.page, data.data.pagination.pageSize);
// Make request with page={nextPageNum}
```

### Check If More Pages

```javascript
const { page, totalPages } = data.data.pagination;
const hasNextPage = page < totalPages;
const hasPrevPage = page > 1;
```

### Show Results Counter

```javascript
const { page, pageSize, totalCount } = pagination;
const start = (page - 1) * pageSize + 1;
const end = Math.min(page * pageSize, totalCount);
console.log(`${start}-${end} of ${totalCount}`);
// Output: "1-20 of 45"
```

### Load More Button

```jsx
<button 
  disabled={pagination.page >= pagination.totalPages}
  onClick={() => loadNextPage()}
>
  Load More ({pagination.page}/{pagination.totalPages})
</button>
```

### Page Selector

```jsx
// Show clickable page numbers
{Array.from({ length: pagination.totalPages }).map((_, i) => (
  <button
    key={i + 1}
    className={pagination.page === i + 1 ? 'active' : ''}
    onClick={() => goToPage(i + 1)}
  >
    {i + 1}
  </button>
))}
```

## Practical Examples

### React Hook

```javascript
function useSearch(query, page = 1, pageSize = 20) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    const url = new URL('/api/search', window.location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('page', page);
    url.searchParams.set('pageSize', pageSize);

    fetch(url)
      .then(r => r.json())
      .then(json => {
        setData(json.data);
        setError(null);
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [query, page, pageSize]);

  return { data, loading, error };
}

// Usage
const { data, loading } = useSearch('cpu', 1, 20);
```

### Vue 3 Composable

```javascript
import { ref, computed } from 'vue';

export function useSearch(query) {
  const page = ref(1);
  const pageSize = ref(20);
  const data = ref(null);
  const loading = ref(false);

  const fetchResults = async () => {
    loading.value = true;
    const url = new URL('/api/search', window.location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('page', page.value);
    url.searchParams.set('pageSize', pageSize.value);

    const response = await fetch(url);
    data.value = await response.json();
    loading.value = false;
  };

  const nextPage = () => {
    if (page.value < data.value.data.pagination.totalPages) {
      page.value++;
      fetchResults();
    }
  };

  const prevPage = () => {
    if (page.value > 1) {
      page.value--;
      fetchResults();
    }
  };

  return { data, loading, page, pageSize, fetchResults, nextPage, prevPage };
}
```

## Error Handling

### Invalid Page Number

```javascript
// Request: page=999 (exceeds totalPages)
// Response: results = [], but pagination metadata still correct
if (data.data.pagination.page > data.data.pagination.totalPages) {
  showError('Page not found');
}
```

### Empty Results

```javascript
if (data.data.products.length === 0) {
  if (data.data.pagination.totalCount === 0) {
    showMessage('No products found');
  } else {
    showError('Invalid page number');
  }
}
```

### Network Error

```javascript
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.statusText);
  const data = await response.json();
} catch (error) {
  console.error('Search failed:', error);
  showRetryButton();
}
```

## Optimization Tips

### Prevent Extra Requests

```javascript
// Don't refetch if page hasn't changed
const prevPage = useRef(1);
useEffect(() => {
  if (page === prevPage.current) return;
  prevPage.current = page;
  // Fetch results
}, [page]);
```

### Cache Results

```javascript
const cache = new Map();

function getCached(query, page, pageSize) {
  const key = `${query}:${page}:${pageSize}`;
  return cache.get(key);
}

function setCached(query, page, pageSize, data) {
  const key = `${query}:${page}:${pageSize}`;
  cache.set(key, data);
  // Auto-clear old entries if cache grows too large
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}
```

### Pre-fetch Next Page

```javascript
async function prefetchNextPage(query, currentPage, pageSize) {
  if (currentPage >= totalPages) return; // No more pages
  
  const key = `${query}:${currentPage + 1}:${pageSize}`;
  if (cache.has(key)) return; // Already cached
  
  // Fetch in background
  const url = new URL('/api/search', window.location.origin);
  url.searchParams.set('q', query);
  url.searchParams.set('page', currentPage + 1);
  url.searchParams.set('pageSize', pageSize);

  fetch(url)
    .then(r => r.json())
    .then(data => setCached(query, currentPage + 1, pageSize, data))
    .catch(err => console.warn('Prefetch failed:', err));
}
```

## Testing Checklist

- [ ] Pagination works on first page
- [ ] Pagination works on middle pages
- [ ] Pagination works on last page
- [ ] Requesting page beyond totalPages returns empty results
- [ ] Results count matches pagination metadata
- [ ] Page size parameter is respected (1-100)
- [ ] Default page size is 20
- [ ] Previous/Next buttons disable at boundaries
- [ ] Page counter shows correct numbers
- [ ] Switching page sizes resets to page 1
- [ ] Search query changes reset to page 1
- [ ] Results are ranked (not just paginated)

## API Examples

### Get Results 1-20 (default)
```bash
GET /api/search?q=cpu
# page=1, pageSize=20
```

### Get Results 21-40
```bash
GET /api/search?q=cpu&page=2
# page=2, pageSize=20
```

### Get Results 41-50
```bash
GET /api/search?q=cpu&page=3&pageSize=20
# totalPages=3, last page has 5 results (45 total)
```

### Custom Page Size (50 per page)
```bash
GET /api/search?q=cpu&pageSize=50
# First page: products 1-50
# Second page: products 51-100
```

### Combine Limit + Pagination
```bash
GET /api/search?q=cpu&limit=100&page=1&pageSize=20
# Limit to 100 total, return page 1 (20-50)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Getting wrong number of results | Check `pageSize` (default 20, max 100) |
| Empty results on page > 1 | Verify `totalPages` not exceeded |
| Results not ranked | Pagination applied AFTER ranking (not the issue) |
| Parameter not working | Check spelling (`page`, `pageSize`, not `pg`, `size`) |
| Too slow | Reduce `pageSize`, increase cache TTL |

