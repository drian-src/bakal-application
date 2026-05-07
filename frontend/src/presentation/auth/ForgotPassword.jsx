import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { Logo, Input, Button } from '../shared';
import './Auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Reset code requested for:', email);
    navigate('/verify-code');
  };

  return (
    <AuthLayout showIllustration={false}>
      <div className="auth-header">
        <div className="auth-logo">
          <Logo size="xlarge" />
        </div>
        <h1 className="auth-title">Forgot password?</h1>
        <p className="auth-subtitle">
          No worries, we'll send you reset instructions
        </p>
      </div>

      <Link to="/" className="auth-back-button">
        ←
      </Link>

      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" variant="primary" size="large" fullWidth>
          Send Reset Code
        </Button>

        <Link to="/login" className="auth-link">
          ← Back to login
        </Link>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;