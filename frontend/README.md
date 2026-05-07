# Bakàl - Intelligent Shopping Assistant
A modern, responsive React frontend for the Bakàl e-commerce shopping assistant platform. Built with Vite, React Router, and plain CSS.

**Status**: 🔗 **Now connected to backend API** | See [Integration Guide](../INTEGRATION_GUIDE.md) for setup instructions

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Backend running on `http://localhost:3000` (or configured URL)

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env - set REACT_APP_API_URL to your backend URL

# 3. Start development server
npm run dev
# Open http://localhost:5173
```

### Environment Variables
```env
# Backend API endpoint
REACT_APP_API_URL=http://localhost:3000/api

# Google OAuth (optional)
REACT_APP_GOOGLE_CLIENT_ID=your_client_id

# Deployment environment
REACT_APP_ENV=development
```

## 🌐 Backend Integration

All product data has been migrated from mock data to live backend APIs. Components now fetch data from:

| Component | Endpoint | Status |
|-----------|----------|--------|
| SearchResultPage | `GET /api/search` | ✅ Connected |
| ProductDetailPage | `GET /api/products/:platform/:id` | ✅ Connected |
| TopRatedProducts | `GET /api/products/recent` | ✅ Connected |
| CategorySection | `GET /api/categories` | ✅ Connected |
| ProductGrid | `GET /api/products` | ✅ Connected |

**API Service**: `src/core/services/apiService.js` - Centralized backend communication with error handling and token management.

## 🎨 Design Philosophy

- **Warm & Friendly**: Filipino consumer-focused aesthetic with orange brand colors
- **Modern & Clean**: Minimal clutter with strong visual hierarchy
- **Distinctive Typography**: Playfair Display for headings, DM Sans for body text
- **Animated Interactions**: Smooth transitions and micro-interactions throughout
- **Fully Responsive**: Desktop-first design that adapts beautifully to mobile

## 📁 Project Structure

```
src/
├── core/
│   └── services/
│       ├── apiService.js        # 🆕 Backend API client
│       ├── authService.js       # Authentication logic
│       └── ...
│
├── presentation/
│   ├── auth/                    # Authentication pages & components
│   ├── home/                    # Home & search features
│   ├── product/                 # Product details page
│   ├── profile/                 # User profile page
│   ├── landing/                 # Landing/marketing page
│   ├── layouts/                 # Layout wrappers
│   └── shared/                  # Shared UI components
│
├── routes/
│   └── AppRoutes.jsx            # Route configuration
│
├── styles/
│   ├── globals.css              # Global styles & utilities
│   ├── variables.css            # CSS custom properties
│   └── auth.css                 # Auth page shared styles
│
├── App.jsx
└── main.jsx
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## 🎨 Design System

### Colors

- **Primary**: `#FF6B00` - Brand orange for CTAs and highlights
- **Secondary**: `#1F2937` - Dark text and headers
- **Background**: `#F9FAFB` - Light gray background
- **Borders**: `#E5E7EB` - Subtle dividers
- **Error**: `#DC2626` - Validation errors
- **Success**: `#16A34A` - Success states

### Typography

- **Display Font**: Playfair Display (headings)
- **Body Font**: DM Sans (paragraphs, UI text)

### Components

#### Button
Variants: `primary`, `secondary`, `outline`, `ghost`
Sizes: `small`, `medium`, `large`

```jsx
<Button variant="primary" size="large" fullWidth>
  Click Me
</Button>
```

#### Input
With label, error handling, and password toggle

```jsx
<Input
  label="Email Address"
  type="email"
  name="email"
  placeholder="you@example.com"
  value={email}
  onChange={handleChange}
  error={errors.email}
  required
/>
```

#### Logo
Customizable size with optional text

```jsx
<Logo size="medium" showText={true} />
```

## 📄 Pages

### Landing Page (`/`)
- Hero section with headline and CTA
- Feature cards showcasing key benefits
- CTA section for conversion
- Footer with branding

### Authentication Flow

1. **Login** (`/login`) - Email/password with Google OAuth option
2. **Sign Up** (`/signup`) - Registration with password strength indicator
3. **Forgot Password** (`/forgot-password`) - Email verification step
4. **Verify Code** (`/verify-code`) - Code verification
5. **Reset Password** (`/reset-password`) - New password creation

### 404 Page (`*`)
Friendly error page with navigation back to home

## 🎯 Key Features

- ✅ Modern, accessible UI components
- ✅ Smooth animations and transitions
- ✅ Password strength indicator
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Clean routing with React Router
- ✅ CSS custom properties for theming
- ✅ Consistent visual language
- ✅ Form validation ready
- ✅ Google OAuth UI integration

## 🔧 Technical Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Plain CSS with CSS Variables
- **Fonts**: Google Fonts (Playfair Display, DM Sans)

## 📝 Notes

- This is a **UI-only implementation** with no backend integration
- No API calls or mock data logic included
- All interactions are UI state only
- Ready for backend integration when needed

## 🎨 Asset Requirements

Place the following assets in their respective directories:

- `src/assets/images/logo.png` - Bakàl logo
- `src/assets/images/hero-landing.png` - Landing page hero image
- `src/assets/images/auth-illustration.png` - Auth pages illustration

## 🚫 What's NOT Included

- Backend API integration
- State management (Redux, Zustand, etc.)
- Mock data or fake API calls
- Authentication logic
- Protected routes
- Form validation library
- Testing setup

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🎓 Code Quality

- Clean, readable code structure
- Consistent naming conventions
- Component-based architecture
- Reusable UI components
- Semantic HTML
- Accessible markup

## 📄 License

Proprietary - All rights reserved

---

Built with ❤️ for Filipino shoppers