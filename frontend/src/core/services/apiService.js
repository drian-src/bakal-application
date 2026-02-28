/**
 * API Service - Centralized backend API communication
 * This module handles all HTTP requests to the Bakàl backend
 */

import { searchCache } from './searchCache';

/**
 * Backend API base URL from environment variable (Vite convention)
 * Configure in frontend/.env: VITE_API_URL=http://localhost:3000/api
 * 
 * Vite uses import.meta.env, not process.env (unlike Create React App which uses REACT_APP_*)
 * Fallback: http://localhost:3000/api
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Fetch wrapper with error handling
 */
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API Error' }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Call Error [${endpoint}]:`, error);
    throw error;
  }
};

// ─── SEARCH ENDPOINTS ───────────────────────────────────────────────────────

export const getStores = async () => {
  try {
    const response = await apiCall('/search/stores');
    return response.data?.stores || [];
  } catch (error) {
    console.error('Fetch stores failed:', error);
    return [];
  }
};

export const searchProducts = async (query, platform = 'all') => {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    // ✅ Check if results are already cached
    const cached = searchCache.get(normalizedQuery, platform);
    if (cached) {
      console.log(`[Cache HIT] Returning cached results for: "${normalizedQuery}" (platform: "${platform}")`);
      return cached;
    }

    // 🔄 No cache — fetch from backend (triggers scraping)
    console.log(`[Cache MISS] Fetching fresh results for: "${normalizedQuery}" (platform: "${platform}")`);
    const response = await apiCall(
      `/search?q=${encodeURIComponent(normalizedQuery)}${platform !== 'all' ? `&platform=${platform}` : ''}`
    );
    
    console.log('[apiService] Full API Response object:', response);
    console.log('[apiService] response.success:', response?.success);
    console.log('[apiService] response.data type:', typeof response?.data);
    console.log('[apiService] response.data:', response?.data);
    
    // Handle both response structures:
    // Structure 1 (if response.data is the full result object): { success: true, data: { search_id, query, total, products: [...], stores: [...] } }
    // Structure 2 (if response is the full result object): { success: true, search_id, query, total, products: [...], stores: [...] }
    const data = response.data || response || {};
    console.log('[apiService] Extracted data:', data);
    console.log('[apiService] data.search_id:', data?.search_id);
    console.log('[apiService] data.products length:', data?.products?.length);
    console.log('[apiService] data.stores length:', data?.stores?.length);
    
    // ✅ Store result in cache before returning
    searchCache.set(normalizedQuery, platform, data);
    
    // ✅ Persist cache to sessionStorage
    searchCache.saveToSession();
    
    return data;
  } catch (error) {
    console.error('Search failed:', error);
    console.error('[apiService.searchProducts] Error details:', {
      message: error.message,
      stack: error.stack
    });
    return [];
  }
};

export const getSearchResults = async (searchId, platform = 'all') => {
  try {
    const response = await apiCall(
      `/search/${searchId}/results${platform !== 'all' ? `?platform=${platform}` : ''}`
    );
    return response.data || {};
  } catch (error) {
    console.error('Fetch search results failed:', error);
    return {};
  }
};

export const getSearchHistory = async (limit = 50) => {
  try {
    const response = await apiCall(`/search/history?limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error('Fetch search history failed:', error);
    return [];
  }
};

export const clearSearchHistory = async () => {
  try {
    const response = await apiCall('/search/history', {
      method: 'DELETE',
    });
    return response;
  } catch (error) {
    console.error('Clear search history failed:', error);
    throw error;
  }
};

// ─── RECOMMENDATION ENDPOINTS ───────────────────────────────────────────────

export const getRecommendations = async (searchId) => {
  try {
    const response = await apiCall(`/recommendations/${searchId}`);
    return response.data || [];
  } catch (error) {
    console.error('Fetch recommendations failed:', error);
    return [];
  }
};

export const generateRecommendations = async (searchId) => {
  try {
    const response = await apiCall(`/recommendations/${searchId}`, {
      method: 'POST',
    });
    return response.data || [];
  } catch (error) {
    console.error('Generate recommendations failed:', error);
    return [];
  }
};

// ─── AUTH ENDPOINTS ────────────────────────────────────────────────────────

export const registerUser = async (email, password, name) => {
  try {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }
    
    return response;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }
    
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await apiCall('/auth/me');
    return response.data || null;
  } catch (error) {
    console.error('Fetch current user failed:', error);
    return null;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
};

// ─── PRODUCT ENDPOINTS ──────────────────────────────────────────────────────

export const getProductDetail = async (platform, productId) => {
  try {
    const response = await apiCall(`/products/${platform}/${productId}`);
    return response.data || null;
  } catch (error) {
    console.error('Fetch product detail failed:', error);
    return null;
  }
};

export const getAllProducts = async (page = 1, limit = 20) => {
  try {
    const response = await apiCall(`/products?page=${page}&limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error('Fetch all products failed:', error);
    return [];
  }
};

// ─── CATEGORY ENDPOINTS ─────────────────────────────────────────────────────

export const getCategories = async () => {
  try {
    const response = await apiCall('/categories');
    return response.data || [];
  } catch (error) {
    console.error('Fetch categories failed:', error);
    return [];
  }
};

export const getProductsByCategory = async (categoryId, page = 1, limit = 20) => {
  try {
    const response = await apiCall(`/categories/${categoryId}/products?page=${page}&limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error('Fetch products by category failed:', error);
    return [];
  }
};

// ─── FEATURED/RECOMMENDED ENDPOINTS ────────────────────────────────────────

export const getRecentProducts = async (limit = 10) => {
  try {
    const response = await apiCall(`/products/recent?limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error('Fetch recent products failed:', error);
    return [];
  }
};

export const getTopRatedProducts = async (limit = 10) => {
  try {
    const response = await apiCall(`/products/top-rated?limit=${limit}`);
    return response.data || [];
  } catch (error) {
    console.error('Fetch top rated products failed:', error);
    return [];
  }
};

export default {
  searchProducts,
  getSearchResults,
  getSearchHistory,
  clearSearchHistory,
  getRecommendations,
  generateRecommendations,
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getProductDetail,
  getAllProducts,
  getCategories,
  getProductsByCategory,
  getRecentProducts,
  getTopRatedProducts,
};