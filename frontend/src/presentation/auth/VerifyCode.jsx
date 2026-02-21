import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { Logo, Button } from '../shared';
import './Auth.css';

const VerifyCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Verification code submitted:', code);
    navigate('/reset-password');
  };

  const handleResend = () => {
    console.log('Resend code clicked');
  };

  return (
    <AuthLayout showIllustration={false}>
      <div className="auth-header">
        <div className="auth-logo">
          <Logo size="xlarge" />
        </div>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          We sent a verification code to your email address
        </p>
      </div>

      <Link to="/" className="auth-back-button">
        ←
      </Link>

      <form onSubmit={handleSubmit} className="auth-form">
        <div>
          <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
            Verification Code
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
            required
          />
        </div>

        <Button type="submit" variant="primary" size="large" fullWidth>
          Verify Code
        </Button>

        <div className="resend-link">
          Didn't receive the code?{' '}
          <button type="button" onClick={handleResend}>
            Resend
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default VerifyCode;