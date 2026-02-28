import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '../home/sections/Header/HomeHeader';
import { useCart } from '../../core/hooks/useCart';
import { ConfirmDialog } from '../shared';
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, loading, removeFromCart, updateQuantity, clearCart } = useCart();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleRemoveItem = (itemId) => {
    removeFromCart(itemId);
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    updateQuantity(itemId, newQuantity);
  };

  const handleClearCart = async () => {
    await clearCart();
    setShowClearConfirm(false);
  };

  const handleContinueShopping = () => {
    navigate('/home');
  };

  const handleProceedCheckout = () => {
    // TODO: Implement checkout flow
    alert('Checkout functionality coming soon!');
  };

  const items = cart.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="cart-page">
      <HomeHeader hideSearch />
      <main className="cart-content">
        <div className="cart-container">
          {/* Page Header */}
          <div className="cart-header">
            <div className="cart-title-section">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <h1 className="cart-title">Your Cart</h1>
            </div>
            {!isEmpty && (
              <span className="items-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
            )}
          </div>

          {/* Empty State */}
          {isEmpty ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <h2 className="empty-title">Your cart is empty</h2>
              <p className="empty-description">
                Start shopping to add items to your cart and get the best deals on tech products!
              </p>
              <button className="continue-shopping-btn" onClick={handleContinueShopping}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="cart-layout">
              {/* Left Column - Cart Items */}
              <div className="cart-items-section">
                <div className="items-list">
                  {items.map((item) => (
                    <div key={item.id} className="cart-item-card">
                      <div className="item-image">
                        {item.product ? (
                          <img
                            src={item.product.image_url || 'https://via.placeholder.com/100'}
                            alt={item.product.title}
                            className="product-thumbnail"
                          />
                        ) : (
                          <div className="placeholder-image">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" opacity="0.3">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <path d="M21 15l-5-5L5 21"/>
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="item-details">
                        <h3 className="item-title">
                          {item.product?.title || 'Product'}
                        </h3>
                        <div className="item-metadata">
                          {item.product?.platform && (
                            <span className="platform-badge">{item.product.platform}</span>
                          )}
                          {item.product?.price && (
                            <span className="unit-price">
                              ₱{item.product.price?.toLocaleString()} each
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="item-quantity">
                        <div className="quantity-controls">
                          <button
                            className="qty-btn"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={loading || item.quantity <= 1}
                            title="Decrease quantity"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="qty-input"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value, 10);
                              if (!isNaN(newQty)) {
                                handleUpdateQuantity(item.id, newQty);
                              }
                            }}
                            min="1"
                            disabled={loading}
                          />
                          <button
                            className="qty-btn"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={loading}
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="item-subtotal">
                        <div className="subtotal-label">Subtotal</div>
                        <div className="subtotal-value">
                          {item.product ? `₱${(item.product.price * item.quantity)?.toLocaleString()}` : '₱0'}
                        </div>
                      </div>

                      <button
                        className="item-remove-btn"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={loading}
                        title="Remove from cart"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Order Summary */}
              <div className="order-summary-section">
                <div className="summary-card">
                  <h2 className="summary-title">Order Summary</h2>

                  <div className="summary-line">
                    <span className="summary-label">Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                    <span className="summary-value">₱{cart.totalPrice?.toLocaleString() || '0'}</span>
                  </div>

                  <div className="summary-line">
                    <span className="summary-label">Shipping</span>
                    <span className="summary-value shipping-free">Free</span>
                  </div>

                  <div className="summary-divider" />

                  <div className="summary-total">
                    <span className="total-label">Total</span>
                    <span className="total-value">₱{cart.totalPrice?.toLocaleString() || '0'}</span>
                  </div>

                  <button
                    className="checkout-btn"
                    onClick={handleProceedCheckout}
                    disabled={loading || isEmpty}
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    className="clear-cart-btn"
                    onClick={() => setShowClearConfirm(true)}
                    disabled={loading}
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Confirm Dialog for Clear Cart */}
      {showClearConfirm && (
        <ConfirmDialog
          title="Clear Cart?"
          message="Are you sure you want to remove all items from your cart? This action cannot be undone."
          confirmText="Clear"
          cancelText="Cancel"
          onConfirm={handleClearCart}
          onCancel={() => setShowClearConfirm(false)}
          isDestructive
        />
      )}
    </div>
  );
};

export default CartPage;
