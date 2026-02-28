import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  getCart,
  addToCart as addToCartAPI,
  updateCartItem as updateCartItemAPI,
  removeFromCart as removeFromCartAPI,
  clearCart as clearCartAPI,
} from '../services/cartService';
import { isAuthenticated } from '../services/authService';
import { NotificationContext } from '../../presentation/shared/Notification';

/**
 * useCart - Custom hook for cart management
 * Handles fetching, updating, and managing shopping cart state
 * 
 * Returns:
 *   - cart: Current cart object with items and totalPrice
 *   - cartCount: Number of items in cart
 *   - loading: Loading state
 *   - addToCart: Function to add item to cart
 *   - removeFromCart: Function to remove item from cart
 *   - updateQuantity: Function to update item quantity
 *   - clearCart: Function to clear entire cart
 */
export const useCart = () => {
  const [cart, setCart] = useState({
    id: null,
    items: [],
    count: 0,
    totalPrice: 0,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Get notification context
  const notificationContext = useContext(NotificationContext);

  // useMemo keeps the fallback object reference stable across renders.
  // Without this, a new object is created every render → fetchCart's useCallback
  // dependency changes every render → useEffect fires every render → infinite loop.
  const notify = useMemo(
    () =>
      notificationContext || {
        success: (msg) => console.log('✓', msg),
        error: (msg) => console.error('✕', msg),
        info: (msg) => console.log('ℹ', msg),
      },
    [notificationContext]
  );

  /**
   * Fetch cart data from backend
   */
  const fetchCart = useCallback(async () => {
    try {
      if (!isAuthenticated()) {
        console.log('[useCart] Not authenticated - setting empty cart');
        setCart({ id: null, items: [], count: 0, totalPrice: 0 });
        setInitialLoading(false);
        return;
      }

      const data = await getCart();
      console.log('[useCart] Fetched cart:', data);
      console.log('[useCart] Cart items:', data?.items?.length || 0);
      setCart(data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      notify?.error?.('Failed to load cart');
    } finally {
      setInitialLoading(false);
    }
  }, [notify]);

  /**
   * Fetch cart on component mount
   */
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  /**
   * Add item to cart
   */
  const addToCart = useCallback(
    async (productId, quantity = 1) => {
      try {
        if (!isAuthenticated()) {
          notify?.error?.('Please log in first');
          return false;
        }

        setLoading(true);

        // Optimistic update
        const existingItem = cart.items.find(item => item.productId === productId);
        if (existingItem) {
          setCart(prev => ({
            ...prev,
            items: prev.items.map(item =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          }));
        } else {
          // Placeholder for new item (will be replaced with full data from server)
          setCart(prev => ({
            ...prev,
            items: [
              ...prev.items,
              {
                id: `temp-${Date.now()}`,
                productId,
                quantity,
                product: null,
              },
            ],
          }));
        }

        // Call API
        const result = await addToCartAPI(productId, quantity);
        
        // Refresh cart data from server
        const updatedCart = result.cart || result;
        setCart(updatedCart);
        
        notify?.success?.('Item added to cart');
        setLoading(false);
        return true;
      } catch (error) {
        console.error('Failed to add to cart:', error);
        notify?.error?.(error.message || 'Failed to add to cart');
        // Revert optimistic update by fetching fresh data
        await fetchCart();
        setLoading(false);
        return false;
      }
    },
    [cart.items, notify, fetchCart]
  );

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback(
    async (itemId) => {
      try {
        setLoading(true);

        // Optimistic update
        setCart(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== itemId),
        }));

        // Call API
        const result = await removeFromCartAPI(itemId);
        const updatedCart = result.cart || result;
        setCart(updatedCart);
        
        notify?.success?.('Item removed from cart');
        setLoading(false);
        return true;
      } catch (error) {
        console.error('Failed to remove from cart:', error);
        notify?.error?.(error.message || 'Failed to remove item');
        // Revert optimistic update
        await fetchCart();
        setLoading(false);
        return false;
      }
    },
    [notify, fetchCart]
  );

  /**
   * Update item quantity
   */
  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      try {
        if (quantity < 1) {
          notify?.error?.('Quantity must be at least 1');
          return false;
        }

        setLoading(true);

        // Optimistic update
        setCart(prev => ({
          ...prev,
          items: prev.items.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));

        // Call API
        const result = await updateCartItemAPI(itemId, quantity);
        const updatedCart = result.cart || result;
        setCart(updatedCart);
        
        notify?.success?.('Quantity updated');
        setLoading(false);
        return true;
      } catch (error) {
        console.error('Failed to update quantity:', error);
        notify?.error?.(error.message || 'Failed to update quantity');
        // Revert optimistic update
        await fetchCart();
        setLoading(false);
        return false;
      }
    },
    [notify, fetchCart]
  );

  /**
   * Clear entire cart
   */
  const clearCartFn = useCallback(async () => {
    try {
      setLoading(true);

      // Optimistic update
      setCart({ id: null, items: [], count: 0, totalPrice: 0 });

      // Call API
      const result = await clearCartAPI();
      setCart(result);
      
      notify?.success?.('Cart cleared');
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to clear cart:', error);
      notify?.error?.(error.message || 'Failed to clear cart');
      // Revert optimistic update
      await fetchCart();
      setLoading(false);
      return false;
    }
  }, [notify, fetchCart]);

  return {
    cart,
    cartCount: cart.items?.length || 0,
    loading,
    initialLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart: clearCartFn,
    refetch: fetchCart,
  };
};

export default useCart;
