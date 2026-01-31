import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import Button from './Button';
import { Input, Select } from './Input';
import './LoginPage.css'; // Re-use login styles

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'student', // Default
        studentId: '', // If student
        staffId: '', // If staff
        campus: 'Athi River'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                ...formData,
                name: `${formData.firstName} ${formData.lastName}`
            };
            console.log('📡 Sending registration payload:', payload);

            const response = await api.post('/auth/register', payload);

            if (response.success || response.token) {
                // Auto login on success
                // Ensure we capture the token in the user object for api.js
                const userData = {
                    ...(response.data || response.user),
                    token: response.token
                };
                login(userData, userData?.role || formData.role);
                navigate('/');
            }
        } catch (err) {
            console.error('❌ Registration Error Details:', err);
            // If the server returned an error message or field-specific errors
            const errorMessage = err.message || (err.errors ? err.errors[0].message : 'Registration failed');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1 className="login-title">Create Account</h1>
                    <p className="login-subtitle">Join PataID community</p>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Input
                            name="firstName"
                            placeholder="First Name"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            name="lastName"
                            placeholder="Last Name"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <Input
                        type="email"
                        name="email"
                        placeholder="Email Address (e.g., student@university.ac.ke)"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number (e.g., 0712...)"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />

                    <Select
                        name="campus"
                        value={formData.campus}
                        onChange={handleChange}
                        options={[
                            { value: 'Athi River', label: 'Athi River' },
                            { value: 'Nairobi', label: 'Nairobi' },
                            { value: 'Mombasa', label: 'Mombasa' }
                        ]}
                        label="Campus"
                    />

                    <Select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        options={[
                            { value: 'student', label: 'Student' },
                            { value: 'staff', label: 'Staff' }
                        ]}
                        label="I am a..."
                    />

                    {formData.role === 'student' && (
                        <Input
                            name="studentId"
                            placeholder="Student ID (e.g., 12-3456)"
                            value={formData.studentId}
                            onChange={handleChange}
                            required
                        />
                    )}

                    {formData.role === 'staff' && (
                        <Input
                            name="staffId"
                            placeholder="Staff ID"
                            value={formData.staffId}
                            onChange={handleChange}
                            required
                        />
                    )}

                    <Input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        isLoading={isLoading}
                    >
                        Register
                    </Button>

                    <div className="login-footer">
                        <p>
                            Already have an account? <Link to="/login">Sign In</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;
