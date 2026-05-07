/**
 * API Service - Centralized backend API communication
 * This module handles all HTTP requests to the Bakàl backend
 */

import { searchCache } from './searchCache';
import { normalizeProductsPlatform } from '@/core/utils/storeNormalizer';

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
    console.log(`[API] Calling ${options.method || 'GET'} ${url}`, { hasToken: !!token });
    
    const response = await fetch(url, {
      ...options,
      method: options.method || 'GET',
      headers,
      credentials: 'include',
      mode: 'cors',
    });

    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API Error' }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Call Error [${endpoint}]:`, error.message || error);
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

export const searchProducts = async (query, platform = 'all', options = {}) => {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    const { dealsOnly = false, minDiscount = 0, page = 1, pageSize = 20 } = options;
    
    // Check if results are already cached
    const cached = searchCache.get(normalizedQuery, platform);
    if (cached) {
      console.log(`[Cache HIT] Returning cached results for: "${normalizedQuery}" (platform: "${platform}", page: ${page})`);
      // Return paginated slice of cached data
      const startIdx = (page - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      return {
        ...cached,
        products: (cached.products || []).slice(startIdx, endIdx),
        pagination: {
          page,
          pageSize,
          totalCount: cached.products?.length || 0,
          totalPages: Math.ceil((cached.products?.length || 0) / pageSize)
        }
      };
    }

    // No cache — fetch from backend (triggers scraping)
    console.log(`[Cache MISS] Fetching fresh results for: "${normalizedQuery}" (platform: "${platform}", page: ${page})`);
    const url = `/search?q=${encodeURIComponent(normalizedQuery)}${platform !== 'all' ? `&store=${platform}` : ''}&page=${page}&pageSize=${pageSize}${dealsOnly ? '&dealsOnly=true' : ''}${minDiscount > 0 ? `&minDiscount=${minDiscount}` : ''}`;
    const response = await apiCall(url);
    
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
    
    // 🆕 NORMALIZE PLATFORM NAMES: Handle various formats and map to standard platform IDs
    // Uses storeNormalizer to handle:
    // - Missing or null platforms → 'Marketplace'
    // - Various format variants → standard IDs (pcexpress, pcworx, villman)
    // - Consistent display names
    const normalizedProducts = normalizeProductsPlatform(data.products || []);
    
    // Log sample product for debugging
    if (normalizedProducts.length > 0) {
      console.log('[apiService] Sample normalized product:', {
        id: normalizedProducts[0].id,
        title: normalizedProducts[0].title?.substring(0, 50),
        platform: normalizedProducts[0].platform,
        platform_id: normalizedProducts[0].platform_id,
        platformId: normalizedProducts[0].platformId,
      });
    }
    
    // Return with normalized products
    const normalizedData = {
      ...data,
      products: normalizedProducts,
    };
    
    // Store result in cache before returning (cache full dataset)
    if (page === 1) {
      searchCache.set(normalizedQuery, platform, normalizedData);
      searchCache.saveToSession();
    }
    
    return normalizedData;
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
    return response.searchHistory || [];
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

export const trackInteraction = async (eventType, options = {}) => {
  try {
    await apiCall('/recommendations/track', {
      method: 'POST',
      body: JSON.stringify({ eventType, ...options }),
    });
  } catch (error) {
    console.warn('[Rec] trackInteraction failed (ignored):', error.message);
  }
};

// ─── PRODUCTS ENDPOINTS ────────────────────────────────────────────────────

export const getFeaturedProducts = async () => {
  try {
    const response = await apiCall('/products/featured');
    return response.data || [];
  } catch (error) {
    console.error('Fetch featured products failed:', error);
    return [];
  }
};

export const getPersonalizedRecommendations = async (limit = 10) => {
  try {
    const response = await apiCall(`/recommendations?limit=${limit}`);
    return response?.data || { recommendations: [], count: 0, strategy: 'none' };
  } catch (error) {
    console.error('[Rec] getPersonalizedRecommendations failed:', error.message);
    return { recommendations: [], count: 0, strategy: 'none' };
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

export const getProductDetail = async (productId, _platformIgnored) => {
  // Platform is not needed — products are fetched by UUID only.
  // The backend /api/products/:id route handles all platforms.
  try {
    const response = await apiCall(`/products/${productId}`);
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

/**
 * Fetch products from the database matching a keyword.
 * Used by CategoriesGrid — no scraping, instant results from DB.
 *
 * @param {string} keyword - e.g. 'laptop', 'smartphone'
 * @param {number} limit   - max results (default 8)
 * @returns {{ keyword, count, products: Array }} or { products: [] } on error
 */
export const getCategoryProducts = async (keyword, limit = 8) => {
  try {
    const response = await apiCall(
      `/categories/products?keyword=${encodeURIComponent(keyword)}&limit=${limit}`
    );
    return response.data || { keyword, count: 0, products: [] };
  } catch (error) {
    console.error(`[apiService] getCategoryProducts failed for "${keyword}":`, error);
    return { keyword, count: 0, products: [] };
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

// ─── SAVED SEARCHES ENDPOINTS ───────────────────────────────────────────────

export const savedSearchesApi = {
  /**
   * Fetch all saved searches for the current user
   */
  getAll: async (limit = 50) => {
    try {
      const response = await apiCall(`/user/saved-searches?limit=${limit}`);
      return response.savedSearches || [];
    } catch (error) {
      console.error('Fetch saved searches failed:', error);
      return [];
    }
  },

  /**
   * Save a new search query
   */
  save: async (query) => {
    try {
      const response = await apiCall('/user/saved-searches', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      return { success: true, savedSearch: response.savedSearch };
    } catch (error) {
      console.error('Save search failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove a saved search
   */
  remove: async (id) => {
    try {
      const response = await apiCall(`/user/saved-searches/${id}`, {
        method: 'DELETE',
      });
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Remove saved search failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Mark a saved search as run (reset new_count)
   */
  markRun: async (id) => {
    try {
      const response = await apiCall(`/user/saved-searches/${id}/run`, {
        method: 'PATCH',
      });
      return { success: true };
    } catch (error) {
      console.error('Mark saved search run failed:', error);
      return { success: false, error: error.message };
    }
  },
};

export default {
  searchProducts,
  getSearchResults,
  getSearchHistory,
  clearSearchHistory,
  trackInteraction,
  getPersonalizedRecommendations,
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getProductDetail,
  getAllProducts,
  getCategories,
  getProductsByCategory,
  getCategoryProducts,
  getRecentProducts,
  getTopRatedProducts,
  savedSearchesApi,
};