import React, { useEffect, useContext } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { NotificationProvider, NotificationContext } from './presentation/shared/Notification';
import { CartProvider } from './core/context/CartContext';
import { searchCache } from './core/services/searchCache';

function AppContent() {
  const notificationContext = useContext(NotificationContext);

  useEffect(() => {
    // Load search cache from sessionStorage on app startup
    searchCache.loadFromSession();
  }, []);

  return (
    <CartProvider notificationContext={notificationContext}>
      <AppRoutes />
    </CartProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;