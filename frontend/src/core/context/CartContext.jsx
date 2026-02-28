import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  getCart,
  addToCart as addToCartAPI,
  updateCartItem as updateCartItemAPI,
  removeFromCart as removeFromCartAPI,
  clearCart as clearCartAPI,
} from '../services/cartService';
import { isAuthenticated } from '../services/authService';

// ─── localStorage cache helpers ───────────────────────────────────────────────
const CACHE_KEY = 'bakal_cart_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — after this, a background re-fetch runs

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    if (!data || !savedAt) return null;
    return { data, isStale: Date.now() - savedAt > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

function writeCache(cartData) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: cartData, savedAt: Date.now() })
    );
  } catch {
    // localStorage quota exceeded or private mode — fail silently
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // fail silently
  }
}
// ──────────────────────────────────────────────────────────────────────────────

const EMPTY_CART = { id: null, items: [], count: 0, totalPrice: 0 };

export const CartContext = createContext(null);

/**
 * CartProvider — wrap this around the entire app (above <Routes />).
 * Manages one shared cart state for all components.
 */
export const CartProvider = ({ children, notificationContext }) => {
  // Try to hydrate from localStorage instantly so cart appears without waiting
  const cached = readCache();
  const [cart, setCartState] = useState(
    cached && !cached.isStale ? cached.data : EMPTY_CART
  );
  const [loading, setLoading] = useState(false);
  // initialLoading = true only when we have NO cached data and haven't fetched yet
  const [initialLoading, setInitialLoading] = useState(
    !cached || cached.isStale
  );

  // Stable notify reference — same pattern as before, prevents infinite loop
  const notify = useMemo(
    () =>
      notificationContext || {
        success: (msg) => console.log('✓', msg),
        error:   (msg) => console.error('✕', msg),
        info:    (msg) => console.log('ℹ', msg),
      },
    [notificationContext]
  );

  // Internal setter that always keeps localStorage in sync
  const setCart = useCallback((cartData) => {
    setCartState(cartData);
    if (cartData && cartData.items && cartData.items.length > 0) {
      writeCache(cartData);
    } else {
      clearCache(); // don't cache an empty cart
    }
  }, []);

  /**
   * fetchCart — calls GET /api/cart and updates shared state.
   * silent=true means no loading spinner (used for background re-validation).
   */
  const fetchCart = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!isAuthenticated()) {
          setCart(EMPTY_CART);
          clearCache();
          setInitialLoading(false);
          return;
        }

        if (!silent) setLoading(true);

        const data = await getCart();
        console.log('[CartContext] fetchCart result:', data?.items?.length, 'items');
        setCart(data);
      } catch (error) {
        console.error('[CartContext] fetchCart error:', error);
        if (!silent) notify?.error?.('Failed to load cart');
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [notify, setCart]
  );

  /**
   * On app start: if we have fresh cache, skip the fetch.
   * If cache is stale or missing, fetch normally.
   * If cache is stale but present, show cached data instantly then re-validate silently.
   */
  useEffect(() => {
    if (!isAuthenticated()) {
      setInitialLoading(false);
      return;
    }

    const cached = readCache();

    if (cached && !cached.isStale) {
      // Fresh cache — already loaded into state, no fetch needed
      console.log('[CartContext] Using fresh cache, skipping fetch');
      setInitialLoading(false);
      return;
    }

    if (cached && cached.isStale) {
      // Stale cache — show it instantly (already in state), then silently re-validate
      console.log('[CartContext] Stale cache — showing cached data, re-validating silently');
      setInitialLoading(false);
      fetchCart({ silent: true });
      return;
    }

    // No cache — full fetch with loading state
    console.log('[CartContext] No cache — fetching cart');
    fetchCart({ silent: false });
  }, []); // ← empty array: runs ONCE on app mount only. fetchCart is stable via useCallback.

  /** Add item to cart */
  const addToCart = useCallback(
    async (productId, quantity = 1) => {
      try {
        if (!isAuthenticated()) {
          notify?.error?.('Please log in first');
          return false;
        }
        setLoading(true);
        const result = await addToCartAPI(productId, quantity);
        // Always fetch fresh data after mutation so product details are populated
        await fetchCart({ silent: true });
        notify?.success?.('Item added to cart');
        setLoading(false);
        return true;
      } catch (error) {
        console.error('[CartContext] addToCart error:', error);
        notify?.error?.(error.message || 'Failed to add to cart');
        setLoading(false);
        return false;
      }
    },
    [notify, fetchCart]
  );

  /** Remove item from cart */
  const removeFromCart = useCallback(
    async (itemId) => {
      try {
        setLoading(true);
        // Optimistic update for instant UI response
        setCart(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== itemId),
          count: Math.max(0, (prev.count || 0) - 1),
        }));
        await removeFromCartAPI(itemId);
        // Re-fetch to get accurate totals and count from server
        await fetchCart({ silent: true });
        notify?.success?.('Item removed');
        setLoading(false);
        return true;
      } catch (error) {
        console.error('[CartContext] removeFromCart error:', error);
        notify?.error?.(error.message || 'Failed to remove item');
        await fetchCart({ silent: true }); // revert optimistic update
        setLoading(false);
        return false;
      }
    },
    [notify, fetchCart, setCart]
  );

  /** Update item quantity */
  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      try {
        if (quantity < 1) { notify?.error?.('Quantity must be at least 1'); return false; }
        setLoading(true);
        setCart(prev => ({
          ...prev,
          items: prev.items.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
        await updateCartItemAPI(itemId, quantity);
        await fetchCart({ silent: true });
        notify?.success?.('Quantity updated');
        setLoading(false);
        return true;
      } catch (error) {
        console.error('[CartContext] updateQuantity error:', error);
        notify?.error?.(error.message || 'Failed to update quantity');
        await fetchCart({ silent: true });
        setLoading(false);
        return false;
      }
    },
    [notify, fetchCart, setCart]
  );

  /** Clear entire cart */
  const clearCart = useCallback(async () => {
    try {
      setLoading(true);
      setCart(EMPTY_CART); // optimistic
      clearCache();
      await clearCartAPI();
      notify?.success?.('Cart cleared');
      setLoading(false);
      return true;
    } catch (error) {
      console.error('[CartContext] clearCart error:', error);
      notify?.error?.(error.message || 'Failed to clear cart');
      await fetchCart({ silent: true });
      setLoading(false);
      return false;
    }
  }, [notify, fetchCart, setCart]);

  const value = useMemo(
    () => ({
      cart,
      cartCount: cart?.items?.length || 0,
      loading,
      initialLoading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      refetch: fetchCart,
    }),
    [cart, loading, initialLoading, addToCart, removeFromCart, updateQuantity, clearCart, fetchCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
