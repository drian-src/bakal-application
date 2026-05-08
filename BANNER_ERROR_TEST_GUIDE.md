# 🔍 Banner Error Diagnosis Test Guide

## Step 1: Check Database Status
**Endpoint**: `/api/diagnostic/banner-data`
**Method**: GET (no auth required)

### Test via curl:
```bash
curl http://localhost:3000/api/diagnostic/banner-data | jq
```

### Expected Response:
```json
{
  "success": true,
  "diagnostic": {
    "database": {
      "connected": true
    },
    "platforms": {
      "count": 3,
      "list": [
        { "id": "uuid-1", "name": "PCExpress" },
        { "id": "uuid-2", "name": "VillMan" },
        { "id": "uuid-3", "name": "PCWorx" }
      ]
    },
    "products": {
      "total": 150,
      "onSale": 45,
      "available": 140,
      "featured": 3,
      "samples": [
        {
          "id": "product-uuid",
          "title": "Product Name",
          "is_on_sale": true,
          "is_available": true,
          "discount_percent": 25,
          "platform": "PCExpress"
        }
      ]
    }
  }
}
```

### Troubleshooting:
- **Database not connected**: Check Supabase connection string in `.env`
- **Total = 0**: No products in database (need to seed data)
- **onSale = 0**: No products marked as `is_on_sale = true`
- **featured = 0**: No products with `is_on_sale=true AND is_available=true`

---

## Step 2: Check Banner Endpoint
**Endpoint**: `/api/banners/featured-deals`
**Method**: GET (no auth required)

### Test via curl:
```bash
curl http://localhost:3000/api/banners/featured-deals | jq
```

### Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "12345-uuid",
      "productTitle": "Gaming Laptop RTX 4090",
      "productImage": "https://...",
      "currentPrice": 89999,
      "originalPrice": 119999,
      "discountPercent": 25,
      "platformName": "PCExpress",
      "rating": 4.5,
      "reviewsCount": 245,
      "isOnSale": true,
      "promoLabel": "Limited Time Offer"
    }
  ],
  "count": 1
}
```

### Issues:
- **Empty array**: Database has no featured products
- **Missing id field**: Response malformed
- **500 error**: Check backend console for errors

---

## Step 3: Check Frontend Logs
**Location**: Browser DevTools (F12) → Console tab

### Test:
1. Refresh http://localhost:5173
2. Look for logs starting with:
   - `[AdvertSliderHome]` - fetch logs
   - `[bannerController]` - will appear in Network response body

### Expected Console Output:
```
[AdvertSliderHome] Fetching /api/banners/featured-deals...
[AdvertSliderHome] Response status: 200
[AdvertSliderHome] Response data: {...full data...}
[AdvertSliderHome] Data items: [{idx: 0, hasId: true, id: "uuid-123", title: "..."}]
[AdvertSliderHome] Setting products: 1
[AdvertSliderHome] Shuffled products: [{id: "uuid-123", title: "..."}]
```

### If no logs appear:
- Backend might be crashing
- Check backend terminal for errors
- Try curl test in Step 1 & 2 first

---

## Step 4: Test Click Navigation
**Test**: Click "Shop Now" button on banner

### Expected Console Output:
```
[AdvertSliderHome] handleProductClick called with product: {
  id: "uuid-123",
  title: "Product Name",
  hasId: true,
  productDetailUrl: "/product/pcexpress/uuid-123",
  keys: [...all fields...]
}
[AdvertSliderHome] Navigating to: /product/pcexpress/uuid-123
```

### If Error Appears:
```
Error: No product ID provided. Product object: {
  // Shows the product object without id field
}
```

---

## Step 5: Check Network Tab
**Location**: DevTools → Network tab

### Test:
1. Refresh page (Ctrl+R)
2. Filter by "featured-deals"
3. Click on `/api/banners/featured-deals` request
4. Check "Response" tab

### Look for:
- Status: **200 OK**
- Response body contains `id` field for each product
- Cache-Control header: `public, max-age=3600`

---

## Common Issues & Fixes

### Issue 1: "No product ID provided" Error
**Possible Causes**:
1. **Database has no featured products** → Run Step 1 diagnostic
2. **Response missing id field** → Check step 2 endpoint response
3. **Endpoint returns empty array** → Check if `is_on_sale=true` products exist

**Fix**: Use INSERT statement to create test products

### Issue 2: Endpoint returns 500 error
**Causes**: Backend crash or database connection issue

**Diagnose**:
1. Check backend terminal for error stack trace
2. Verify `.env` has SUPABASE_URL and SUPABASE_KEY
3. Test `/health` endpoint: `curl http://localhost:3000/health`

### Issue 3: Empty featured products array
**Cause**: No products with `is_on_sale=true`

**Fix**: Update database
```sql
UPDATE products SET is_on_sale = true LIMIT 3;
-- or
UPDATE products SET is_on_sale = true 
WHERE platform_id IN (SELECT id FROM platforms LIMIT 3);
```

### Issue 4: Frontend shows "Featured deals not available"
**Causes**:
1. Endpoint returns empty data
2. Response has error
3. Network request failed

**Debug**:
1. Check console logs (Step 3)
2. Check Network tab (Step 5)
3. Run diagnostic (Step 1)

---

## Complete Test Flow
```bash
# Terminal 1: Start Backend
cd bakal-application/backend
npm start

# Terminal 2: Run Diagnostics
curl http://localhost:3000/api/diagnostic/banner-data | jq

# Terminal 3: Start Frontend  
cd bakal-application/frontend
npm run dev

# Browser: Open http://localhost:5173
# 1. Open DevTools (F12)
# 2. Check Console tab for [AdvertSliderHome] logs
# 3. Check Network tab for /api/banners/featured-deals response
# 4. Click "Shop Now" and verify navigation works
```

---

## What to Report
If issue persists, provide:
1. **Diagnostic response** (Step 1)
2. **Banner endpoint response** (Step 2)
3. **Console logs** (Step 3)
4. **Network tab response** (Step 5)
5. **Backend terminal output** (error stack trace)
