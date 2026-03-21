/**
 * Cart Service - Shopping cart API endpoints
 * Handles all cart-related HTTP requests to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Fetch wrapper with error handling for cart endpoints
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
    console.log(`[Cart API] Calling ${options.method || 'GET'} ${url}`, { hasToken: !!token });
    
    const response = await fetch(url, {
      ...options,
      method: options.method || 'GET',
      headers,
      credentials: 'include',
      mode: 'cors',
    });

    console.log(`[Cart API] Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API Error' }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Cart API Error [${endpoint}]:`, error.message || error);
    throw error;
  }
};

// ─── CART ENDPOINTS ─────────────────────────────────────────────────────────

/**
 * GET /api/cart
 * Fetch the current user's cart with all items and product details
 */
export const getCart = async () => {
  try {
    const response = await apiCall('/cart');
    return response.data || { id: null, items: [], count: 0, totalPrice: 0 };
  } catch (error) {
    console.error('Failed to fetch cart:', error);
    throw error;
  }
};

/**
 * POST /api/cart
 * Add a product to the cart
 * @param {string} productId - The product ID
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Object} Updated cart data
 */
export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await apiCall('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
    return response.data || {};
  } catch (error) {
    console.error('Failed to add to cart:', error);
    throw error;
  }
};

/**
 * PUT /api/cart/:itemId
 * Update the quantity of a cart item
 * @param {string} itemId - The cart item ID
 * @param {number} quantity - New quantity
 * @returns {Object} Updated cart data
 */
export const updateCartItem = async (itemId, quantity) => {
  try {
    const response = await apiCall(`/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
    return response.data || {};
  } catch (error) {
    console.error('Failed to update cart item:', error);
    throw error;
  }
};

/**
 * DELETE /api/cart/:itemId
 * Remove a specific item from the cart
 * @param {string} itemId - The cart item ID
 * @returns {Object} Updated cart data
 */
export const removeFromCart = async (itemId) => {
  try {
    const response = await apiCall(`/cart/${itemId}`, {
      method: 'DELETE',
    });
    return response.data || { cart: {} };
  } catch (error) {
    console.error('Failed to remove from cart:', error);
    throw error;
  }
};

/**
 * DELETE /api/cart
 * Clear the entire cart
 * @returns {Object} Empty cart data
 */
export const clearCart = async () => {
  try {
    const response = await apiCall('/cart', {
      method: 'DELETE',
    });
    return response.data || { id: null, items: [], count: 0, totalPrice: 0 };
  } catch (error) {
    console.error('Failed to clear cart:', error);
    throw error;
  }
};

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
