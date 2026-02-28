import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { NotificationProvider } from './presentation/shared/Notification';
import { searchCache } from './core/services/searchCache';

function App() {
  useEffect(() => {
    // Load search cache from sessionStorage on app startup
    searchCache.loadFromSession();
  }, []);

  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;