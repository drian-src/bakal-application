import { useContext } from 'react';
import { CartContext } from '../context/CartContext';

/**
 * useCart — reads from the shared CartContext.
 * CartProvider must be mounted above this component in the tree.
 * Cart state is shared across ALL components — no duplicate fetches.
 */
export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      '[useCart] No CartContext found. ' +
      'Make sure <CartProvider> wraps your app in main.jsx or App.jsx.'
    );
  }

  return context;
};

export default useCart;
