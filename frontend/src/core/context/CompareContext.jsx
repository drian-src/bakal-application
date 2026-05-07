import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CompareContext = createContext(null);

const CACHE_KEY = 'bakal_compare_list';
const MAX_COMPARE = 4;

function readCompareCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCompareCache(list) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // fail silently
  }
}

/**
 * CompareProvider — manage product comparison list globally.
 * Max 4 products to prevent overwhelming UI.
 */
export const CompareProvider = ({ children }) => {
  const [compareList, setCompareListState] = useState(() => readCompareCache());

  // Sync to localStorage whenever list changes
  const setCompareList = useCallback((list) => {
    setCompareListState(list);
    writeCompareCache(list);
  }, []);

  /**
   * Add product to compare list (max 4)
   * Prevents duplicates by product ID
   */
  const addToCompare = useCallback(
    (product) => {
      if (!product || !product.id) return;

      setCompareList((prev) => {
        // Already in list?
        if (prev.some((p) => p.id === product.id)) {
          return prev;
        }

        // List full?
        if (prev.length >= MAX_COMPARE) {
          return prev;
        }

        return [...prev, product];
      });
    },
    [setCompareList]
  );

  /**
   * Remove product from compare list
   */
  const removeFromCompare = useCallback(
    (productId) => {
      setCompareList((prev) => prev.filter((p) => p.id !== productId));
    },
    [setCompareList]
  );

  /**
   * Clear entire compare list
   */
  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, [setCompareList]);

  /**
   * Check if product is already in compare list
   */
  const isInCompare = useCallback(
    (productId) => {
      return compareList.some((p) => p.id === productId);
    },
    [compareList]
  );

  /**
   * Check if can add more products
   */
  const canAddMore = useMemo(() => {
    return compareList.length < MAX_COMPARE;
  }, [compareList]);

  const value = useMemo(
    () => ({
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      canAddMore,
      maxCompare: MAX_COMPARE,
    }),
    [compareList, addToCompare, removeFromCompare, clearCompare, isInCompare, canAddMore]
  );

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
};

/**
 * Hook: useCompare() — access compare state and actions anywhere
 */
export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within CompareProvider');
  }
  return context;
};
