# Authentication Testing Guide

## Overview

This guide explains the authentication fixes applied to the system and provides step-by-step instructions to verify they work correctly. The main issue was that users could bypass login and access the homepage directly. This has been fixed through stricter token validation.

## What Was Fixed

### 1. **ProtectedRoute Component (Frontend)**
**File:** `frontend/src/core/services/authUtils.jsx`

**Problem:** The ProtectedRoute component wasn't properly enforcing authentication. It wasn't waiting for backend validation before rendering content, allowing users to access protected routes without valid tokens.

**Solution Applied:**
- Added explicit `isReady` state flag to properly track validation completion
- Implemented two-stage validation:
  1. **Fast Check:** Is token in localStorage? (local, immediate)
  2. **Strict Check:** Is token valid according to backend? (network request to `/api/auth/me`)
- Made backend validation **fail-closed**: If backend is unreachable, deny access instead of allowing it

**Key Code Changes:**
```javascript
// Now properly waits for BOTH checks before rendering
if (!isReady) {
  return null; // Show nothing while checking auth
}

// Route requires auth (like /home) → redirect to login if invalid
if (requiredAuth && authState === 'invalid') {
  return <Navigate to="/login" replace />;
}

// Backend unreachable → returns false, denies access
// (Don't allow unverified tokens)
return false; // on network error
```

### 2. **Login Form Validation (Frontend)**
**File:** `frontend/src/presentation/auth/Login.jsx`

**Problem:** Password validation required only 6 characters, but backend requires 8.

**Solution Applied:**
- Updated client-side validation to match backend requirement (8 characters minimum)
- Added console logging for debugging login flow

### 3. **Frontend Environment Variables**
**File:** `frontend/.env.example`

**Problem:** Example file used React environment variable prefix (REACT_APP_*) but app uses Vite prefix (VITE_*).

**Solution Applied:**
- Updated .env.example to use correct VITE_* prefix
- Ensures proper API URL configuration

## Architecture: How Authentication Works

```
User opens app
    ↓
ProtectedRoute checks: Is token in localStorage?
    ├─ NO → Show login page
    └─ YES → Fetch /api/auth/me with token
         ├─ 200 OK → Valid token, show protected content
         ├─ 401/403 → Invalid/expired token, clear localStorage, show login
         └─ Network Error → Backend unreachable, show login (fail-closed)

User logs in
    ↓
POST /api/auth/login (email, password)
    ↓
Backend verifies credentials → Generates JWT
    ↓
Frontend stores token in localStorage
    ↓
ProtectedRoute validates token with /api/auth/me
    ↓
User sees homepage

User closes session / logs out
    ↓
localStorage.removeItem('authToken') → token cleared
    ↓
Next app open → ProtectedRoute finds no token
    ↓
User redirected to /login
```

## Pre-Testing Checklist

### Backend Setup
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Fill in required values:
  ```
  JWT_SECRET=your_very_secret_key_here_min_32_chars
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
  ```
- [ ] Install Playwright browsers: `cd backend && npx playwright install`
- [ ] Install dependencies: `npm install`

### Frontend Setup
- [ ] Copy `frontend/.env.example` to `frontend/.env`
- [ ] Set `VITE_API_URL=http://localhost:3000/api` (or your backend URL)
- [ ] Install dependencies: `npm install`

## Testing Scenarios

### Scenario 1: Fresh App Load (No Token)
**Expected:** User sees login page, not homepage

**Steps:**
1. Clear browser localStorage: Open DevTools → Application → Storage → Clear All
2. Reload app at `http://localhost:5173`
3. **Expected Result:** See login page immediately (no home page)
4. **Verification:** Check console for messages:
   ```
   [ProtectedRoute] Auth check complete (isReady=true)
   ```

### Scenario 2: Login With Valid Credentials
**Expected:** User redirected to homepage after successful login

**Steps:**
1. Start at login page
2. Enter valid email and password (min 8 chars)
3. Click login button
4. **Expected Result:** 
   - Page loads briefly
   - Redirects to `/home` after 800ms
   - Homepage visible with authenticated user header
5. **Verification:** Check console for:
   ```
   [Login] Attempting login for: user@example.com
   [Login] Login successful, redirecting to home...
   ```

### Scenario 3: Login With Invalid Credentials
**Expected:** Error message shown, user stays on login page

**Steps:**
1. Start at login page
2. Enter valid email but wrong password
3. Click login button
4. **Expected Result:**
   - Error message appears: "Invalid email or password" or similar
   - Still on login page (no redirect)
5. **Verification:** Check console for:
   ```
   [Login] Login failed: Invalid email or password
   ```

### Scenario 4: Logout and Return
**Expected:** After logout, cannot access protected routes

**Steps:**
1. Login successfully (see Scenario 2)
2. Click logout button (usually in profile/header menu)
3. **Expected Result:** Redirected to `/login`
4. Reload app (`Ctrl+R`)
5. **Expected Result:** Still at login page (token cleared)
6. **Verification:** Check localStorage in DevTools:
   ```
   localStorage.getItem('authToken') === null
   ```

### Scenario 5: Direct URL Navigation (Unauthenticated)
**Expected:** Can't access protected routes directly by URL

**Steps:**
1. Clear localStorage (restart app without token)
2. Try accessing `http://localhost:5173/home` directly in URL bar
3. **Expected Result:** Redirected to `/login` immediately
4. Try accessing `http://localhost:5173/profile`
5. **Expected Result:** Redirected to `/login`
6. Try accessing `http://localhost:5173/cart`
7. **Expected Result:** Redirected to `/login`

### Scenario 6: Already Authenticated User
**Expected:** If user already logged in, accessing /login redirects to /home

**Steps:**
1. Login successfully (see Scenario 2)
2. Try accessing `http://localhost:5173/login` directly
3. **Expected Result:** Redirected to `/home` 
4. Try accessing `http://localhost:5173/signup`
5. **Expected Result:** Redirected to `/home`

### Scenario 7: Backend Unreachable During Auth Check
**Expected:** User sees login page (fail-closed behavior)

**Steps:**
1. Start backend and login successfully
2. Stop backend server (`Ctrl+C` in backend terminal)
3. Reload frontend (`Ctrl+R`)
4. **Expected Result:** 
   - Blank screen briefly (showing nothing during check)
   - Then redirected to `/login`
5. **Verification:** Check console for:
   ```
   [ProtectedRoute] Backend unreachable during token validation
   ```

### Scenario 8: Token Expires
**Expected:** After token expiry, user can't access protected routes

**Steps:**
1. Login successfully
2. Wait for JWT expiry (default 7 days, or ask admin to reduce)
3. Try accessing `/home`
4. **Expected Result:** Redirected to `/login`
5. **Verification:** Check console for:
   ```
   [ProtectedRoute] Backend auth validation failed (401). Token cleared.
   ```

## Debugging Commands

### Check Auth Token Status
```javascript
// In browser console:
localStorage.getItem('authToken')  // Should be null (no token) or long JWT string
localStorage.getItem('currentUser') // Should be null or user JSON object
```

### Test Backend Token Validation
```bash
# Get a valid JWT first (login via UI or API)
# Then test the /me endpoint:
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Expected 200 OK response:
# {"success": true, "data": {"id": "...", "email": "...", "name": "..."}}

# With invalid token (should return 401):
# {"success": false, "message": "Invalid token."}
```

### Check Backend Auth Logs
```bash
# Backend logs token validation attempts
tail -f backend/logs/error.log | grep -i auth

# Look for messages like:
# Token verified for user...
# Invalid token...
# Token expired...
```

## Common Issues and Solutions

### Issue 1: Always Redirects to Login
**Symptoms:** After login, still see login page; can't access homepage

**Possible Causes:**
- [ ] Backend not running on port 3000
- [ ] JWT_SECRET missing or different in .env
- [ ] Token validation endpoint `/api/auth/me` failing
- [ ] Browser cookies blocked

**Solutions:**
1. Verify backend is running: `npm start` in `backend/` folder
2. Check backend console for errors
3. Test `/api/auth/me` endpoint manually with curl
4. Clear browser localStorage and try fresh login

### Issue 2: Can Access /home Without Login
**Symptoms:** Can navigate to homepage without valid token

**Possible Causes:**
- [ ] ProtectedRoute component not working
- [ ] Token validation not strict enough
- [ ] Old frontend code not refreshed

**Solutions:**
1. Hard refresh frontend: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache: DevTools → Application → Storage → Clear All
3. Check console for ProtectedRoute messages
4. Verify token validation is returning false on network errors

### Issue 3: Login Button Does Nothing
**Symptoms:** Click login, nothing happens; no error message

**Possible Causes:**
- [ ] Backend not running
- [ ] API URL incorrect in frontend .env
- [ ] Network error reaching backend

**Solutions:**
1. Check backend is running: `npm start` in `backend/`
2. Verify `VITE_API_URL` in frontend/.env points to correct backend
3. Check browser console for fetch errors
4. Test backend manual: `curl http://localhost:3000/api/auth/me`

### Issue 4: CORS Errors in Console
**Symptoms:** Console shows "CORS error" or "blocked by CORS policy"

**Possible Causes:**
- [ ] Backend CORS configuration incorrect
- [ ] Backend not running

**Solutions:**
1. Check backend is running
2. Verify CORS headers in backend (should allow http://localhost:5173)
3. Check backend logs for error messages

## Files Modified

### Frontend Changes
1. **`frontend/src/core/services/authUtils.jsx`**
   - Enhanced ProtectedRoute with explicit isReady flag
   - Stricter backend validation (fail-closed on network errors)
   - Proper two-stage validation (localStorage + backend)

2. **`frontend/src/presentation/auth/Login.jsx`**
   - Updated password validation to require 8 characters (matching backend)
   - Added console logging for debugging

3. **`frontend/.env.example`**
   - Fixed environment variable prefix from REACT_APP_* to VITE_*

### Backend
- No changes needed; existing `/api/auth/me` endpoint works correctly
- Ensure JWT_SECRET is set in .env

## Verification Checklist

- [ ] Fresh app load shows login page (not homepage)
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Logout clears token and shows login page
- [ ] Direct URL navigation without token redirects to login
- [ ] Already authenticated user redirected from /login to /home
- [ ] Backend unreachable, shows login (fail-closed)
- [ ] Search works while authenticated
- [ ] Cart operations work while authenticated
- [ ] Profile page shows correct user data

## Next Steps

1. **Start Backend:**
   ```bash
   cd backend
   npm install          # If first time
   npm start           # Start server on port 3000
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm install         # If first time
   npm run dev        # Start on http://localhost:5173
   ```

3. **Run Tests:**
   - Follow scenarios 1-8 above
   - Document any failures with screenshots/console logs

4. **Report Issues:**
   - If any scenario fails, note:
     - Browser console errors
     - Backend logs (errors/warnings)
     - Network tab (failed requests)
     - localStorage state

## Support

For detailed debugging:
1. Enable DEBUG logging in backend: `LOG_LEVEL=debug` in .env
2. Open browser DevTools (F12) and check Console tab
3. Check Network tab to see actual API requests/responses
4. Check Application tab to see localStorage contents

---

**Last Updated:** 2026-03-07
**Auth Status:** ✅ Fixed - Strict token validation enforced
