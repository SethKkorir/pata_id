import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/utils/api';
import Button from './Button';
import Input from './Input';
import './LoginPage.css';

import { useNotify } from '../../src/contexts/NotificationContext';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('student'); // student, security, admin
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    adminCode: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from query param
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect');

  const userTypes = [
    { id: 'student', label: 'Student/Staff', icon: '👨‍🎓' },
    { id: 'security', label: 'Security Guard', icon: '👮' },
    { id: 'admin', label: 'Administrator', icon: '👔' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (activeTab === 'student') {
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.password) newErrors.password = 'Password is required';
    } else if (activeTab === 'security') {
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      if (!formData.password) newErrors.password = 'Password is required';
    } else if (activeTab === 'admin') {
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.password) newErrors.password = 'Password is required';
      if (!formData.adminCode) newErrors.adminCode = 'Admin code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { success: notifySuccess, error: notifyError } = useNotify();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const identifier = activeTab === 'security' ? formData.phone : formData.email;
      const { data, token } = await api.post('/auth/login', {
        identifier,
        password: formData.password,
        role: activeTab === 'admin' ? 'admin' : activeTab === 'security' ? 'security' : undefined,
      });

      const userData = { ...data, token };
      login(userData, userData.role);

      notifySuccess(`Welcome back, ${userData.firstName || 'User'}!`, 'Login successful');

      // 1. Check if there's a specific redirect requested
      if (redirectPath) {
        navigate(redirectPath);
        return;
      }

      // 2. Otherwise default to role-based dashboard
      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (userData.role === 'security') {
        navigate('/security');
      } else {
        navigate('/');
      }

    } catch (error) {
      setErrors({ submit: error.message || 'Invalid credentials. Please try again.' });
      notifyError('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Implement password reset logic
    console.log('Forgot password clicked for:', activeTab);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Welcome to PataID</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {/* User Type Tabs */}
        <div className="user-type-tabs">
          {userTypes.map(type => (
            <button
              key={type.id}
              className={`user-type-tab ${activeTab === type.id ? 'active' : ''}`}
              onClick={() => setActiveTab(type.id)}
            >
              <span className="tab-icon">{type.icon}</span>
              <span className="tab-label">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {activeTab === 'student' && (
            <>
              <Input
                type="text"
                name="email"
                placeholder="Email, Phone, or ID Number"
                value={formData.email}
                onChange={handleChange}
                label="Identifier"
                error={errors.email}
                required
              />
              <Input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                label="Password"
                error={errors.password}
                required
              />
            </>
          )}

          {activeTab === 'security' && (
            <>
              <Input
                type="tel"
                name="phone"
                placeholder="+254 712 345 678"
                value={formData.phone}
                onChange={handleChange}
                label="Phone Number"
                error={errors.phone}
                required
              />
              <Input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                label="Password"
                error={errors.password}
                required
              />
              <p className="security-note">
                Security guards use phone-based authentication. Contact admin if you don't have credentials.
              </p>
            </>
          )}

          {activeTab === 'admin' && (
            <>
              <Input
                type="email"
                name="email"
                placeholder="admin@university.ac.ke"
                value={formData.email}
                onChange={handleChange}
                label="Admin Email"
                error={errors.email}
                required
              />
              <Input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                label="Password"
                error={errors.password}
                required
              />
              <Input
                type="text"
                name="adminCode"
                placeholder="Enter admin access code"
                value={formData.adminCode}
                onChange={handleChange}
                label="Admin Code"
                error={errors.adminCode}
                required
              />
            </>
          )}

          {errors.submit && (
            <div className="error-message">
              {errors.submit}
            </div>
          )}

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="forgot-password"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
          >
            Sign In
          </Button>

          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              {activeTab === 'student' ? (
                <Link to="/register">Register as student/staff</Link>
              ) : (
                <span className="contact-admin">
                  Contact university administration
                </span>
              )}
            </p>
          </div>
        </form>
      </div>

      <div className="login-features">
        <div className="feature">
          <ShieldIcon />
          <h3>Secure & Verified</h3>
          <p>All data is encrypted and verified by campus authorities</p>
        </div>
        <div className="feature">
          <CommunityIcon />
          <h3>Community Trust</h3>
          <p>Join thousands of students and staff using PataID</p>
        </div>
      </div>
    </div>
  );
};

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const CommunityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default LoginPage;