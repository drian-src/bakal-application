import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages - Presentation Layer
import LandingPage from '../presentation/landing/LandingPage';
import Login from '../presentation/auth/Login';
import AuthCallback from '../presentation/auth/AuthCallback';
import ForgotPassword from '../presentation/auth/ForgotPassword';
import VerifyCode from '../presentation/auth/VerifyCode';
import ResetPassword from '../presentation/auth/ResetPassword';
import HomePage from '../presentation/home/HomePage';
import SearchResultPage from '../presentation/home/search/SearchResultPage';
import ProductDetailPage from '../presentation/product/ProductDetailPage';
import ProfilePage from '../presentation/profile/ProfilePage';
import CartPage from '../presentation/cart/CartPage';
import NotFound from '../presentation/shared/NotFound';
import HomeHeader from '../presentation/home/sections/Header/HomeHeader';
import { ProtectedRoute } from '../core/services/authUtils.jsx';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Auth Routes */}
      <Route path="/login" element={<ProtectedRoute requiredAuth={false}><Login /></ProtectedRoute>} />

      {/* Google OAuth callback — NO ProtectedRoute wrapper.
          Token is not in localStorage yet when this page loads.
          Wrapping in ProtectedRoute would cause an infinite redirect loop. */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-code" element={<VerifyCode />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected Home & Search Routes */}
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><><HomeHeader /><SearchResultPage /></></ProtectedRoute>} />
      <Route path="/product/:platform/:productId" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
      
      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;