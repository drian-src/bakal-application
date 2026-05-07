import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button, Logo } from '.';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <Logo size="large" />
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-description">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary" size="large" title="Back to Home" aria-label="Back to Home">
            <Home size={20} strokeWidth={1.5} /> Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;