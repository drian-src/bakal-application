# Project Structure Quick Reference

## Directory Map

```
src/
│
├── core/                          # Non-UI logic and utilities
│   ├── constants/                 # App-wide constants
│   ├── hooks/                     # Custom React hooks
│   ├── utils/                     # Utility functions
│   ├── images/                    # Image assets
│   └── icons/                     # Icon assets
│
├── domain/                        # Business logic layer (for growth)
│   ├── models/                    # Data models/interfaces
│   └── services/                  # API and business services
│
├── presentation/                  # UI Components (organized by feature)
│   │
│   ├── shared/                    # Reusable components used everywhere
│   │   ├── Button.jsx             # Primary button component
│   │   ├── Input.jsx              # Form input component
│   │   ├── Logo.jsx               # App logo component
│   │   ├── Divider.jsx            # Visual divider
│   │   ├── Rating.jsx             # Star rating display
│   │   ├── PriceTag.jsx           # Price display component
│   │   ├── PlatformBadge.jsx      # Platform badges
│   │   ├── NotFound.jsx           # 404 page
│   │   └── index.js               # Barrel exports (for easy importing)
│   │
│   ├── auth/                      # Authentication feature
│   │   ├── Login.jsx              # Login page
│   │   ├── Signup.jsx             # Signup page
│   │   ├── ForgotPassword.jsx     # Password recovery
│   │   ├── VerifyCode.jsx         # Code verification
│   │   ├── ResetPassword.jsx      # Password reset
│   │   ├── GoogleButton.jsx       # OAuth integration
│   │   ├── PasswordStrength.jsx   # Password validator
│   │   └── Auth.css               # Auth-specific styles
│   │
│   ├── landing/                   # Landing/Marketing page
│   │   ├── LandingPage.jsx        # Main landing page
│   │   └── LandingPage.css        # Landing styles
│   │
│   ├── home/                      # Home & Search features
│   │   ├── HomePage.jsx           # Main home page
│   │   ├── HomePage.css           # Home styles
│   │   ├── sections/              # Home page sections
│   │   │   ├── Header/            # Search header
│   │   │   ├── CategoryProducts/  # Product categories
│   │   │   ├── Advertisements/    # Ad section
│   │   │   └── ProductListing/    # Product grid
│   │   │
│   │   └── search/                # Search results feature
│   │       ├── SearchResultPage.jsx
│   │       ├── SearchResultPage.css
│   │       ├── SearchSummary/     # Search info header
│   │       ├── Filters/           # Filter panel
│   │       ├── PlatformSelector/  # Platform tabs
│   │       └── RecommendedProducts/ # Recommended section
│   │
│   ├── product/                   # Product detail feature
│   │   ├── ProductDetailPage.jsx  # Product page
│   │   └── ProductDetailPage.css  # Product styles
│   │
│   ├── profile/                   # User profile feature
│   │   ├── ProfilePage.jsx        # Profile page
│   │   └── ProfilePage.css        # Profile styles
│   │
│   └── layouts/                   # Layout components
│       ├── AuthLayout.jsx         # Auth page wrapper
│       ├── MainLayout.jsx         # App page wrapper
│       └── [Layout styles]
│
├── styles/                        # Global styles
│   ├── variables.css              # CSS variables & theme
│   └── globals.css                # Global CSS rules
│
├── routes/
│   └── AppRoutes.jsx              # All route definitions
│
├── App.jsx                        # Root component
└── main.jsx                       # Entry point
```

## Quick Import Examples

### Importing Shared Components
```jsx
// Using barrel export (recommended)
import { Button, Logo, Input } from '../shared';

// Or individual import
import Button from '../shared/Button';
```

### Importing from Features
```jsx
// Auth components
import Login from '../presentation/auth/Login';

// Home components
import HomePage from '../presentation/home/HomePage';

// Search component
import SearchResultPage from '../presentation/home/search/SearchResultPage';
```

### Importing Assets
```jsx
// Images
import logo from '../../core/images/logo.png';
import banner from '../../core/images/hero-landing.svg';

// Icons (when using icon components)
import { HomeIcon } from '../../core/icons';
```

## Feature Routes

| Route | Component | File |
|-------|-----------|------|
| `/` | Landing Page | `presentation/landing/LandingPage.jsx` |
| `/login` | Login | `presentation/auth/Login.jsx` |
| `/signup` | Signup | `presentation/auth/Signup.jsx` |
| `/forgot-password` | Forgot Password | `presentation/auth/ForgotPassword.jsx` |
| `/verify-code` | Code Verification | `presentation/auth/VerifyCode.jsx` |
| `/reset-password` | Password Reset | `presentation/auth/ResetPassword.jsx` |
| `/home` | Home Dashboard | `presentation/home/HomePage.jsx` |
| `/search` | Search Results | `presentation/home/search/SearchResultPage.jsx` |
| `/product/:platform/:productId` | Product Details | `presentation/product/ProductDetailPage.jsx` |
| `/profile` | User Profile | `presentation/profile/ProfilePage.jsx` |
| `/*` | 404 Not Found | `presentation/shared/NotFound.jsx` |

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Component Patterns

### Using Shared Components
```jsx
import { Button, Logo } from '../shared';

export default function MyComponent() {
  return (
    <>
      <Logo size="medium" />
      <Button variant="primary" onClick={handleClick}>
        Click Me
      </Button>
    </>
  );
}
```

### Adding New Features
1. Create new folder in `presentation/`
2. Add pages and components
3. Import shared components as needed
4. Update `AppRoutes.jsx` with new routes
5. Add route to route table (above)

### Adding Shared Components
1. Create component in `presentation/shared/`
2. Create corresponding CSS file
3. Export from `presentation/shared/index.js`
4. Use barrel import everywhere

## CSS Variables

All styling uses CSS variables from `src/styles/variables.css`:

```css
/* Colors */
--primary: #0a1a3a;
--text-primary: #FFFFFF;
--bg-light: #F9FAFB;

/* Spacing */
--spacing-xs: 0.5rem;
--spacing-sm: 0.75rem;
--spacing-md: 1rem;

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* See full list in variables.css */
```

Use these variables for consistency:
```css
.my-component {
  color: var(--text-primary);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-md);
}
```

## Tips

- ✅ Always use barrel exports from `shared/index.js`
- ✅ Keep shared components truly reusable
- ✅ Use CSS variables for colors and spacing
- ✅ Organize components by feature
- ✅ Keep routes in `AppRoutes.jsx`
- ✅ Use relative imports within features
- ⚠️ Don't import from sibling features directly
- ⚠️ Don't create new global CSS files, use variables

## Adding a New Page

1. Create feature folder: `src/presentation/myfeature/`
2. Create page component: `MyFeaturePage.jsx`
3. Create styles: `MyFeaturePage.css`
4. Add route in `src/routes/AppRoutes.jsx`:
```jsx
import MyFeaturePage from '../presentation/myfeature/MyFeaturePage';
// ... in Routes:
<Route path="/myfeature" element={<MyFeaturePage />} />
```

Done! Your new page is ready.
