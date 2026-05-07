# Bakàl - Intelligent Shopping Assistant

> AI-powered cross-platform e-commerce search and recommendation engine

## 🎯 Project Overview

Bakàl is a full-stack web application that helps Filipino consumers find and compare products across multiple online platforms (PCExpress, VillMan, PCWorx, etc.) using AI-powered recommendations and intelligent search.

### Architecture

```
bakal-dev/
├── frontend/           ← React + Vite + Router (Port 5173)
│   └── TODO: Fetch product data from backend
│
├── backend/            ← Node.js + Express + PostgreSQL (Port 3000)
│   └── Handles search, recommendations, and data scraping
│
└── INTEGRATION_GUIDE.md ← Setup instructions for both services
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20 or higher
- **Git** for version control

### 1️⃣ Setup & Install

```bash
# Backend setup
cd backend
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with your configuration

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
# Edit .env - set REACT_APP_API_URL=http://localhost:3000/api
```

### 2️⃣ Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server: http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App: http://localhost:5173
```

### 3️⃣ Verify Connection

Open browser console and check that API calls work:
- Search for a product → should call backend `/api/search`
- View product detail → should call backend `/api/products/:id`

---

## 📋 Project Status

### ✅ Completed
- [x] Separated frontend and backend into distinct directories
- [x] Integrated backend codebase from `only-backend` branch
- [x] Removed all hardcoded product data from frontend
- [x] Created centralized API service layer (`apiService.js`)
- [x] Updated CORS configuration for cross-origin requests
- [x] Created comprehensive integration guide
- [x] Updated environment variable templates
- [x] Configured project structure documentation

### 🔄 In Progress
- [ ] Complete backend API endpoint implementation
- [ ] Integrate frontend components with API service
- [ ] Set up user authentication flow
- [ ] Implement search and recommendation features

### 📋 TODO
- [ ] Database schema and migrations
- [ ] User authentication endpoints
- [ ] Product scraping and indexing
- [ ] Search algorithm optimization
- [ ] Recommendation engine fine-tuning
- [ ] Performance optimization
- [ ] Testing (unit & integration)
- [ ] Deployment pipeline (CI/CD)

---

## 🏗️ Service Structure

### **Frontend** (`frontend/`)
- **Framework**: React 18 + Vite + React Router
- **Styling**: Plain CSS with CSS variables
- **API Communication**: Centralized `apiService.js`
- **State Management**: React hooks
- **Port**: 5173 (dev)

**Key Components:**
- Authentication (Login/Signup/Google OAuth)
- Product Search with Filters
- Product Details
- User Profile
- Category Browsing

**Removed:**
- ❌ All mock/hardcoded product data
- ❌ Fake API calls
- ❌ Sample product lists

### **Backend** (`backend/`)
- **Runtime**: Node.js 20 + Express
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: JWT + Google OAuth 2.0
- **Scraping**: Playwright + Chromium
- **Port**: 3000 (dev)

**Key Features:**
- Cross-platform product search
- Intelligent recommendations
- Real-time data scraping
- User authentication
- Rate limiting & security

---

## 🔌 API Integration

### Backend Endpoints Available
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/search` - Search products
- `GET /api/recommendations/:searchId` - Get recommendations
- `GET /api/products` - List products
- `GET /api/categories` - List categories

### Frontend API Service
File: `frontend/src/core/services/apiService.js`

```javascript
// Import and use in components
import { 
  searchProducts, 
  getProductDetail,
  getRecommendations 
} from '@/core/services/apiService';

// Example: Search products
const results = await searchProducts('laptop');
```

---

## 📝 Environment Configuration

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
JWT_SECRET=your_secret
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_GOOGLE_CLIENT_ID=your_client_id
REACT_APP_ENV=development
```

**See**: [.env.example files](./backend/.env.example) and [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

---

## 🐳 Docker Setup (Backend Only)

```bash
cd backend
docker-compose up -d
# Backend runs on http://localhost:3000
```

Then start frontend separately:
```bash
cd frontend
npm run dev
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | Complete setup & connection guide |
| [frontend/README.md](./frontend/README.md) | Frontend architecture & components |
| [backend/README.md](./backend/README.md) | Backend API & features |

---

## 🔧 Development Workflow

### Adding a New Component
1. Create component in appropriate folder under `presentation/`
2. Import API service if data is needed
3. Use `useState` + `useEffect` for data fetching
4. Handle loading and error states

### Adding a New API Endpoint
1. Define route in backend `routes/`
2. Create controller method
3. Add function to frontend `apiService.js`
4. Import and use in component

### Testing the Connection
```bash
# Check backend health
curl http://localhost:3000/health

# Test search endpoint
curl "http://localhost:3000/api/search?q=phone"

# Monitor frontend console for API errors
```

---

## 🚨 Troubleshooting

### CORS Errors
- ✅ Verify `FRONTEND_URL` in backend `.env`
- ✅ Check `REACT_APP_API_URL` in frontend `.env`
- ✅ Ensure both match your actual URLs

### API 404 Errors
- ✅ Backend endpoints may not be implemented yet
- ✅ Check backend README for available endpoints
- ✅ Verify route definitions in backend

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

---

## 👥 Team Workflow

### Branch Strategy
- `main` → Production-ready code
- `development-3` → Frontend development  ← Currently active
- `only-backend` → Backend development

### Setup from Git
```bash
# Clone repository
git clone https://github.com/yourorg/bakal-web.git
cd bakal-dev

# Both frontend and backend are now in separate folders
cd frontend && npm install
cd ../backend && npm install
```

---

## 📊 Performance

### Frontend
- Vite for fast module replacement
- CSS variables for efficient theming
- React hooks for minimal re-renders

### Backend
- Rate limiting on all routes
- Database connection pooling
- Playwright browser reuse for scraping

---

## 🔐 Security Features

✅ CORS protection  
✅ Helmet.js security headers  
✅ JWT authentication  
✅ Environment variable isolation  
✅ Rate limiting  
✅ Secure password handling  

---

## 📦 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy `dist/` folder
```

### Backend (Heroku/Railway/AWS)
```bash
npm install
npm start
# Set environment variables
```

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed deployment instructions.

---

## 📞 Support

For issues or questions:
1. Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
2. Review [backend/README.md](./backend/README.md)
3. Check [frontend/README.md](./frontend/README.md)
4. Open an issue on GitHub

---

## 📄 License

Proprietary - All rights reserved

---

**Last Updated**: February 20, 2026  
**Status**: 🔗 Frontend & Backend Connected
