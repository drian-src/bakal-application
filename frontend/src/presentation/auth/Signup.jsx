import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout'
import { Logo, Input, Button, Divider } from '../shared'
import GoogleButton from './GoogleButton'
import PasswordRequirements from './PasswordStrength'
import { registerUser, validateEmail, validatePassword } from '../../core/services/authService';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
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

    const { fullName, email, password, confirmPassword } = formData;

    // Validate full name
    if (!fullName || fullName.trim().length === 0) {
      const errorMsg = 'Full name is required.';
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      const errorMsg = 'Please enter a valid email address.';
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid || password.length < 8) {
      const errorMsg = 'Password must be at least 8 characters and meet 3 requirements.';
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match.';
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    // Attempt registration via backend
    const result = await registerUser(fullName, email, password);

    if (result.success) {
      setError('');
      setTimeout(() => navigate('/home'), 1000);
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setError('Google authentication will be available after configuring your Google Client ID.');
  };

  return (
    <AuthLayout>
      <div className="auth-header">
        <div className="auth-logo">
          <Logo size="xlarge" />
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join Bakàl and start shopping smarter</p>
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
          label="Full Name"
          type="text"
          name="fullName"
          placeholder="Enter your name"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <div>
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <PasswordRequirements password={formData.password} />
        </div>

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        <Button 
          type="submit" 
          variant="primary" 
          size="large" 
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <Divider text="OR" />

        <GoogleButton 
          onClick={handleGoogleSignup}
          text="Sign up with Google"
          disabled={isLoading}
        />
      </form>

      <div className="auth-footer">
        Already have an account?{' '}
        <Link to="/login">Log in</Link>
      </div>
    </AuthLayout>
  );
};

export default Signup;