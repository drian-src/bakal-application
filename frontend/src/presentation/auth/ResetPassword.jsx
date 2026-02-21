import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { Logo, Input, Button } from '../shared';
import PasswordStrength from './PasswordStrength';
import './Auth.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Password reset submitted:', formData);
    navigate('/login');
  };

  return (
    <AuthLayout showIllustration={false}>
      <div className="auth-header">
        <div className="auth-logo">
          <Logo size="xlarge" />
        </div>
        <h1 className="auth-title">Set new password</h1>
        <p className="auth-subtitle">
          Your new password must be different from previously used passwords
        </p>
      </div>

      <Link to="/" className="auth-back-button">
        ←
      </Link>

      <form onSubmit={handleSubmit} className="auth-form">
        <div>
          <Input
            label="New Password"
            type="password"
            name="newPassword"
            placeholder="Create a strong password"
            value={formData.newPassword}
            onChange={handleChange}
            required
          />
          <PasswordStrength password={formData.newPassword} />
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

        <Button type="submit" variant="primary" size="large" fullWidth>
          Reset Password
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;