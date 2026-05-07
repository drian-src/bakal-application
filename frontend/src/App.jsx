import React, { useEffect, useContext } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { NotificationProvider, NotificationContext } from './presentation/shared/Notification';
import { CartProvider } from './core/context/CartContext';
import { CompareProvider } from './core/context/CompareContext';
import { ThemeProvider } from './core/context/ThemeContext';
import CompareBar from './presentation/shared/CompareBar';
import { searchCache } from './core/services/searchCache';
import { clearInvalidUsers } from './core/services/authService';

function AppContent() {
  const notificationContext = useContext(NotificationContext);

  useEffect(() => {
    // Clear any old users with invalid email domains
    const wasCleared = clearInvalidUsers();
    if (wasCleared) {
      console.log('[App] Invalid user credentials have been cleared');
    }
    
    // Load search cache from sessionStorage on app startup
    searchCache.loadFromSession();
  }, []);

  return (
    <CartProvider notificationContext={notificationContext}>
      <CompareProvider>
        <AppRoutes />
        <CompareBar />
      </CompareProvider>
    </CartProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;