# Frontend-Backend Integration Guide

This guide explains how the Bakàl frontend and backend are now structured and connected.

## 📁 Project Structure

```
bakal-dev/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── core/services/
│   │   │   ├── apiService.js       ← Backend API client
│   │   │   ├── authService.js      ← Auth logic
│   │   │   └── ...
│   │   ├── presentation/
│   │   │   └── ...components
│   │   └── main.jsx
│   ├── .env.example    ← Frontend configuration template
│   ├── vite.config.js
│   └── package.json
│
└── backend/             # Node.js + Express backend
    ├── src/
    │   ├── app.js
    │   ├── routes/
    │   │   ├── authRoutes.js
    │   │   ├── searchRoutes.js
    │   │   └── recommendationRoutes.js
    │   ├── controllers/
    │   ├── services/
    │   └── ...
    ├── .env.example    ← Backend configuration template
    ├── docker-compose.yml
    └── package.json
```

## 🔧 API Integration Architecture

### Removed Mock Data
All hardcoded product data has been removed from these components:
- `TopRatedProducts.jsx` - Now fetches from `/api/products/recent`
- `SearchResultPage.jsx` - Now fetches from `/api/search`
- `ProductDetailPage.jsx` - Now fetches from `/api/products/:platform/:id`
- `CategorySection.jsx` - Now fetches from `/api/categories`
- `ProductGrid.jsx` - Now fetches from `/api/products`

### New API Service Layer
Located at: `frontend/src/core/services/apiService.js`

This centralized service handles:
- ✅ Authentication endpoints (`/api/auth/*`)
- ✅ Search endpoints (`/api/search/*`)
- ✅ Recommendation endpoints (`/api/recommendations/*`)
- ✅ Product endpoints (`/api/products/*`)
- ✅ Category endpoints (`/api/categories/*`)
- ✅ Token management (localStorage)
- ✅ Error handling

## 🚀 Setup Instructions

### Prerequisites
- Node.js 20+
- npm or yarn
- Git

### Step 1: Configure Backend

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required variables:
#   - SUPABASE_URL
#   - SUPABASE_SERVICE_ROLE_KEY
#   - JWT_SECRET
#   - GOOGLE_CLIENT_ID (optional, for Google OAuth)
#   - FRONTEND_URL (should be http://localhost:5173 for dev)
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install

# Install Playwright browsers (required for scraping)
npx playwright install chromium
```

### Step 3: Configure Frontend

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required variables:
#   - REACT_APP_API_URL (should be http://localhost:3000/api)
#   - REACT_APP_GOOGLE_CLIENT_ID (if using Google OAuth)
```

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 5: Start Both Services

#### Option A: Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

#### Option B: Docker Compose (Backend only)

```bash
cd backend
docker-compose up -d
# Backend runs in container on http://localhost:3000
```

Then start frontend separately:
```bash
cd frontend
npm run dev
```

## 📡 Backend API Endpoints

### Authentication
```
POST   /api/auth/register         - Register new user
POST   /api/auth/login            - Login user
GET    /api/auth/me               - Get current user
GET    /api/auth/google           - Initiate Google OAuth
GET    /api/auth/google/callback  - Google OAuth callback
```

### Search
```
GET    /api/search?q=...          - Search products across platforms
GET    /api/search/:searchId/results - Get cached search results
```

### Recommendations
```
GET    /api/recommendations/:searchId      - Get recommendations
POST   /api/recommendations/:searchId      - Generate recommendations
```

### Products
```
GET    /api/products                       - Get all products
GET    /api/products/:platform/:id         - Get product details
GET    /api/products/recent?limit=10       - Get recent products
GET    /api/products/top-rated?limit=10    - Get top-rated products
```

### Categories
```
GET    /api/categories                     - Get all categories
GET    /api/categories/:id/products        - Get products in category
```

## 🔌 Frontend Usage Examples

### Using the API Service

```jsx
import { 
  searchProducts, 
  getRecommendations,
  getProductDetail 
} from '@/core/services/apiService';

// Search products
const results = await searchProducts('laptop');

// Get product details
const product = await getProductDetail('pcexpress', '1');

// Get recommendations
const recommendations = await getRecommendations('search-id-123');
```

### Fetching in Components

Example from `SearchResultPage.jsx`:

```jsx
const [filteredProducts, setFilteredProducts] = useState({});
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      const response = await searchProducts(query, activePlatform);
      setFilteredProducts(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchSearchResults();
}, [query, activePlatform]);
```

## 🔐 CORS Configuration

### Backend
The backend is configured to accept requests from the frontend:

```javascript
// backend/src/app.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
```

### Frontend
The `.env` file specifies the backend URL:

```
REACT_APP_API_URL=http://localhost:3000/api
```

## 🧪 Testing the Connection

### Check Backend Health
```bash
curl http://localhost:3000/health
```

### Test Search Endpoint
```bash
curl "http://localhost:3000/api/search?q=phone"
```

### Test with Frontend
1. Open browser console (F12)
2. Try a search in the frontend
3. Check Network tab to see API calls
4. Verify responses match expected format

## 🐛 Troubleshooting

### CORS Errors
- ✅ Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
- ✅ Check that `REACT_APP_API_URL` in frontend `.env` matches backend URL

### 404 Errors on API Calls
- ✅ Verify backend is running on correct port (default: 3000)
- ✅ Check that `.env` files have correct URLs
- ✅ Ensure backend routes are implemented for the endpoints

### Missing Playwright Browsers
```bash
cd backend
npx playwright install chromium
```

### Port Already in Use
```bash
# Change PORT in .env or kill process using the port
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

## 📝 Environment Variables Checklist

### Backend (.env)
- [ ] `NODE_ENV=development`
- [ ] `PORT=3000`
- [ ] `FRONTEND_URL=http://localhost:5173`
- [ ] `SUPABASE_URL` (or your database URL)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET`

### Frontend (.env)
- [ ] `REACT_APP_API_URL=http://localhost:3000/api`
- [ ] `REACT_APP_GOOGLE_CLIENT_ID` (if using OAuth)

## 🎯 Next Steps

1. **Complete Backend Implementation**
   - Implement remaining endpoints
   - Set up database schema
   - Configure authentication

2. **Frontend Component Updates**
   - Replace all TODO comments in components
   - Add error boundaries
   - Implement loading states properly

3. **Testing**
   - Write unit tests for API service
   - Test all endpoints
   - End-to-end testing

4. **Deployment**
   - Set up CI/CD pipeline
   - Configure production environment variables
   - Deploy to cloud (Vercel for frontend, Heroku/Railway for backend)

## 📚 Related Documentation

- [Backend README](../backend/README.md)
- [Frontend README](../frontend/README.md)
- [API Documentation](../backend/README.md#api-endpoints)
