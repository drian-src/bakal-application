import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { Logo, Input, Button, Divider } from '../shared';
import GoogleButton from './GoogleButton';
import { loginUser, validateEmail } from '../../core/services/authService';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { email, password } = formData;

    // Validate email format
    if (!validateEmail(email)) {
      const errorMsg = 'Please enter a valid email address.';
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    // Validate password — at least 8 chars as per backend requirement
    if (!password || password.length < 8) {
      const errorMsg = 'Password must be at least 8 characters long.';
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    // Attempt login via backend
    console.log(`[Login] Attempting login for: ${email}`);
    const result = await loginUser(email, password);

    if (result.success) {
      console.log('[Login] Login successful, redirecting to home...');
      setError('');
      setTimeout(() => navigate('/home'), 800);
    } else {
      console.warn('[Login] Login failed:', result.message);
      setError(result.message);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('Google authentication will be available after configuring your Google Client ID.');
  };

  return (
    <AuthLayout illustrationPosition="left">
      <div className="auth-header">
        <div className="auth-logo">
          <Logo size="xlarge" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>
      </div>

      <Link to="/" className="auth-back-button">
        ←
      </Link>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="auth-error">
            <span>✕</span> {error}
          </div>
        )}
        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <Link to="/forgot-password" className="auth-link" style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
          Forgot password?
        </Link>

        <Button 
          type="submit" 
          variant="primary" 
          size="large" 
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>

        <Divider text="OR" />

        <GoogleButton 
          onClick={handleGoogleLogin}
          text="Continue with Google"
          disabled={isLoading}
        />
      </form>

      <div className="auth-footer">
        Don't have an account?{' '}
        <Link to="/signup">Sign up</Link>
      </div>
    </AuthLayout>
  );
};

export default Login;