# Bakàl Backend

AI-powered cross-platform product search and recommendation engine.

## Stack

- **Runtime**: Node.js 20 + Express
- **Database**: Supabase (PostgreSQL + pgvector)
- **Scraping**: Playwright (Chromium)
- **Auth**: JWT + Google OAuth 2.0

---

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Copy env
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET

# 3. Run DB schema in Supabase SQL editor
# (paste contents of schema.sql)

# 4. Install Playwright browsers
npx playwright install chromium

# 5. Start dev server
npm run dev
```

---

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Email/password registration |
| POST | `/api/auth/login` | Email/password login |
| GET  | `/api/auth/google` | Initiate Google OAuth |
| GET  | `/api/auth/google/callback` | Google OAuth callback |
| GET  | `/api/auth/me` | Get current user profile (requires token) |

### Search

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?q=...` | Trigger cross-platform search |
| GET | `/api/search/:searchId/results` | Get results for a past search |

### Recommendations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/recommendations/:searchId` | Generate recommendations |
| GET  | `/api/recommendations/:searchId` | Get existing recommendations |

---

## Example Responses

### POST `/api/auth/login`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "Juan dela Cruz",
      "auth_provider": "email",
      "created_at": "2024-01-10T08:00:00.000Z",
      "last_login": "2024-01-15T12:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GET `/api/search?q=bluetooth+earphones`

```json
{
  "success": true,
  "data": {
    "search_id": "7f3d9b2e-1a4c-4f8e-b5d2-9e8c7a6b5d4e",
    "query": "bluetooth earphones",
    "total": 9,
    "products": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "JBL Tune 720BT Wireless On-Ear Headphones",
        "price": 1999.00,
        "rating": 4.7,
        "reviews_count": 3241,
        "seller_name": "JBL Official Store",
        "product_url": "https://www.lazada.com.ph/products/jbl-tune-720bt-...",
        "image_url": "https://ph-live.slatic.net/p/jbl-720bt.jpg",
        "platform": "lazada"
      },
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "title": "Xiaomi Redmi Buds 4 Active TWS Earbuds",
        "price": 799.00,
        "rating": 4.5,
        "reviews_count": 8920,
        "seller_name": "Xiaomi Official",
        "product_url": "https://shopee.ph/product/xiaomi-redmi-buds-4-...",
        "image_url": "https://cf.shopee.ph/file/redmi-buds-4.jpg",
        "platform": "shopee"
      },
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-012345678902",
        "title": "TOZO T12 Mini Wireless Earbuds",
        "price": 1200.00,
        "rating": 4.3,
        "reviews_count": 512,
        "seller_name": "TOZO Store PH",
        "product_url": "https://www.tiktok.com/shop/product/tozo-t12-...",
        "image_url": "https://p16-oec-va.ibyteimg.com/tozo-t12.jpg",
        "platform": "tiktok"
      }
    ]
  }
}
```

### POST `/api/recommendations/:searchId`

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "JBL Tune 720BT Wireless On-Ear Headphones",
      "price": 1999.00,
      "rating": 4.7,
      "reviews_count": 3241,
      "seller_name": "JBL Official Store",
      "product_url": "https://www.lazada.com.ph/products/jbl-tune-720bt-...",
      "image_url": "https://ph-live.slatic.net/p/jbl-720bt.jpg",
      "platform": "lazada",
      "score": 0.8712
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Xiaomi Redmi Buds 4 Active TWS Earbuds",
      "price": 799.00,
      "rating": 4.5,
      "reviews_count": 8920,
      "seller_name": "Xiaomi Official",
      "product_url": "https://shopee.ph/product/xiaomi-redmi-buds-4-...",
      "image_url": "https://cf.shopee.ph/file/redmi-buds-4.jpg",
      "platform": "shopee",
      "score": 0.8340
    }
  ]
}
```

---

## Architecture

```
Request → Controller → Service → Repository → Supabase
                    ↓
              Scraper Layer
         (Google → Platform URLs → Playwright)
```

### Scoring Algorithm (Recommendation)

Score = 0.4 × (rating/5) + 0.3 × (reviews/maxReviews) + 0.3 × (1 - normalizedPrice)

---

## Environment Variables

See `.env.example` for the full list.

---

## Docker

```bash
docker-compose up --build
```

---

## Future Roadmap

- BullMQ job queues for async scraping
- OpenAI embeddings for semantic product similarity
- pgvector cosine similarity recommendations
- Caching layer (Redis)
- Pagination on search results