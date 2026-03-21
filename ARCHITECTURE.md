# Project Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BAKÀL E-COMMERCE PLATFORM                           │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────────┐
                            │   Web Browser    │
                            │  :5173 (Vite)    │
                            └────────┬─────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
            ┌───────▼────────┐          ┌─────────────▼────────┐
            │   Frontend     │          │    API Service       │
            │   (React)      │          │  (apiService.js)     │
            │                │          │                      │
            │ • Auth Pages   │          │ • searchProducts()   │
            │ • Home         │          │ • getProductDetail() │
            │ • Search       │──────────│ • getCategories()    │
            │ • Products     │   FETCH  │ • loginUser()        │
            │ • Profile      │   JSON   │ • getCurrentUser()   │
            │                │          │ • Error Handling     │
            │                │          │ • Token Management   │
            └────────────────┘          └──────────┬───────────┘
                                                   │
                                    HTTP REST API (:3000)
                                                   │
            ┌──────────────────────────────────────▼──────────────────────────┐
            │             BACKEND (Node.js + Express)                         │
            ├──────────────────────────────────────────────────────────────────┤
            │                                                                  │
            │  Routes:                          Controllers:                  │
            │  • /api/auth/*        ─────────►  AuthController               │
            │  • /api/search*       ─────────►  SearchController             │
            │  • /api/products*     ─────────►  ProductController            │
            │  • /api/categories*   ─────────►  CategoryController           │
            │  • /api/recommendations*  ───►    RecommendationController     │
            │                                                                 │
            │  Middleware:                      Services:                    │
            │  • Authentication    ─────────►   ProductService              │
            │  • CORS              ─────────►   SearchService               │
            │  • Rate Limiting     ─────────►   RecommendationService       │
            │  • Error Handler     ─────────►   ScraperService              │
            │                                                                 │
            └──────────────────┬───────────────────────────────────────────┬──┘
                               │                                           │
                              │ PostgreSQL                    │ Playwright
                              │ (Supabase)                    │ (Scraping)
                              │                               │
        ┌─────────────────────▼──────┐           ┌───────────▼────────┐
        │   DATABASE                 │           │  SCRAPERS          │
        │  • Users                   │           │ • PCExpress        │
        │  • Search History          │           │ • VillMan          │
        │  • Products                │           │ • PCWorx           │
        │  • Recommendations         │           │ • Lazada           │
        │  • Platforms               │           │ • Shopee           │
        │  • Vectors (pgvector)      │           │ • Etc.             │
        └────────────────────────────┘           └────────────────────┘
```

---

## 📡 API Communication Flow

```
Frontend Component
        │
        ├─► Check if data needed (useEffect)
        │
        ├─► Call apiService function
        │   ├─ Attach auth token (if exists)
        │   ├─ Add CORS headers
        │   └─ Send JSON request
        │
        └─► Receive Response
            ├─ Save to state (setState)
            ├─ Render UI with data
            └─ Handle errors if any


Example: Search Products
══════════════════════════════════════════════════════════════════════

User Types "Laptop" in search:
        │
        ├─► SearchResultPage queries apiService
        │   └─► searchProducts('laptop', 'all')
        │
        ├─► Frontend makes HTTP request:
        │   POST http://localhost:3000/api/search?q=laptop&platform=all
        │   Headers: {
        │     'Content-Type': 'application/json',
        │     'Authorization': 'Bearer <token>'  (if logged in)
        │   }
        │
        ├─► Backend searches database
        │   └─► SearchController.search()
        │       └─► Queries: Users, Products, Platforms
        │
        └─► Returns Results:
            {
              "success": true,
              "data": {
                "pcexpress": [...products],
                "villman": [...products],
                "pcworx": [...products]
              }
            }
```

---

## 🔐 Authentication Flow

```
User Login/Register
        │
        ├─► Frontend Form (Signup/Login) component
        │   └─► Submits email, password
        │
        ├─► Calls apiService:
        │   ├─ registerUser() - POST /api/auth/register
        │   └─ loginUser()    - POST /api/auth/login
        │
        ├─► Backend validates & processes
        │   ├─ Hash password
        │   ├─ Query database for user
        │   └─ Generate JWT token
        │
        └─► Frontend receives token
            ├─ Saves to localStorage (authToken)
            ├─ All future requests include Authorization header
            └─ Redirects to dashboard
```

---

## 🗂️ File Organization

### Frontend Components Using API

```
presentation/
│
├── auth/ (Authentication Pages)
│   ├── Login.jsx         ← Uses loginUser()
│   ├── Signup.jsx        ← Uses registerUser()
│   └── ...
│
├── home/
│   ├── HomePage.jsx
│   └── sections/
│       ├── ProductListing/
│       │   ├── TopRatedProducts.jsx      ← Uses getRecentProducts()
│       │   └── ProductGrid.jsx           ← Uses getAllProducts()
│       │
│       └── CategoryProducts/
│           └── CategorySection.jsx       ← Uses getCategories()
│
├── home/search/
│   └── SearchResultPage.jsx              ← Uses searchProducts()
│
└── product/
    └── ProductDetailPage.jsx             ← Uses getProductDetail()
```

### API Service

```
core/services/
│
└── apiService.js
    ├── Authentication
    │   ├── registerUser()
    │   ├── loginUser()
    │   ├── getCurrentUser()
    │   └── logoutUser()
    │
    ├── Search
    │   ├── searchProducts()
    │   └── getSearchResults()
    │
    ├── Recommendations
    │   ├── getRecommendations()
    │   └── generateRecommendations()
    │
    └── Products
        ├── getProductDetail()
        ├── getAllProducts()
        ├── getRecentProducts()
        ├── getTopRatedProducts()
        ├── getCategories()
        └── getProductsByCategory()
```

---

## 🔄 Data Flow Examples

### 1. Product Search Flow

```
User searches "bluetooth headphones"
        │
        └─► SearchResultPage.jsx
            ├─► useState([products, loading, error])
            │
            └─► useEffect(() => {
                  if (query) {
                    searchProducts(query)
                      .then(setProducts)
                      .catch(setError)
                  }
                }, [query])
            │
            └─► Renders results with filters
                ├─ Price filter
                ├─ Rating filter
                └─ Platform tabs
```

### 2. Product Detail Flow

```
User clicks product card
        │
        └─► navigate('/product/pcexpress/1')
            │
            └─► ProductDetailPage.jsx
                ├─► useEffect(() => {
                │     getProductDetail('pcexpress', '1')
                │       .then(setProduct)
                │       .catch(setError)
                └─► Renders:
                    ├─ Product image
                    ├─ Title, price, rating
                    ├─ Description, features
                    └─ Add to cart button
```

### 3. Category Browse Flow

```
Home page loads
        │
        └─► HomePage.jsx renders CategorySection
            │
            └─► CategorySection.jsx
                ├─► useEffect(() => {
                │     getCategories()
                │       .then(setCategories)
                │       .catch(setError)
                │   }, [])
                │
                └─► Maps categories to CategoryRow
                    └─► Each row shows products in category
```

---

## 🌐 Environment Setup

```
Development Environment
═══════════════════════════════════════════════════════════════════

Frontend (.env)
├─ REACT_APP_API_URL = http://localhost:3000/api
├─ REACT_APP_GOOGLE_CLIENT_ID = (if using OAuth)
└─ REACT_APP_ENV = development

Backend (.env)
├─ NODE_ENV = development
├─ PORT = 3000
├─ FRONTEND_URL = http://localhost:5173
├─ SUPABASE_URL = (your Supabase project URL)
├─ SUPABASE_SERVICE_ROLE_KEY = (your key)
├─ JWT_SECRET = (random secret key)
├─ GOOGLE_CLIENT_ID = (if using OAuth)
└─ GOOGLE_CLIENT_SECRET = (if using OAuth)
```

---

## 🚀 Development Workflow

```
1. Start Backend
   ├─ cd backend
   ├─ npm install (first time)
   ├─ Copy .env.example → .env
   ├─ Edit .env with credentials
   └─ npm run dev
      └─► Server: http://localhost:3000

2. Start Frontend (in new terminal)
   ├─ cd frontend
   ├─ npm install (first time)
   ├─ Copy .env.example → .env
   ├─ Edit .env (REACT_APP_API_URL)
   └─ npm run dev
      └─► App: http://localhost:5173

3. Test in Browser
   ├─ Open http://localhost:5173
   ├─ Open Console (F12)
   ├─ Try a search
   ├─ Watch Network tab for API calls
   └─ Check for errors in console
```

---

## 📊 Component State Management

```
Components use React Hooks:

const [products, setProducts] = useState([])      ← Data storage
const [loading, setLoading] = useState(false)     ← Loading state
const [error, setError] = useState(null)          ← Error handling

useEffect(() => {
  fetchData()  ← Call API service
    .then(data => setProducts(data))
    .catch(err => setError(err))
    .finally(() => setLoading(false))
}, [dependencies])

Rendering:
{loading && <Spinner />}
{error && <Error message={error} />}
{products.length > 0 && products.map(renderCard)}
```

---

## 🔌 Adding a New Endpoint

```
1. Backend: Create route and controller
   routes/myRoutes.js:
   router.get('/api/my-data', authenticate, MyController.getData)

2. Backend: Create service logic
   services/MyService.js:
   async getData() { ... query database ... }

3. Frontend: Add to API service
   apiService.js:
   export const getMyData = async () => {
     return await apiCall('/my-data')
   }

4. Frontend: Use in component
   MyComponent.jsx:
   useEffect(() => {
     getMyData()
       .then(setData)
       .catch(setError)
   }, [])
```

---

## 📈 Performance Considerations

```
Optimizations:
✓ API calls only when needed (useEffect dependencies)
✓ Error boundaries for failures
✓ Loading states prevent UI freezing
✓ Token in localStorage (no repeated auth)
✓ CORS headers optimized
✓ Rate limiting on backend
✓ Database query optimization
✓ Caching for repeated searches
```

---

**This architecture enables efficient, scalable development and easy feature additions!**
