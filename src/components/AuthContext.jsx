import React, { createContext, useState, useContext, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import UnauthorizedPage from './UnauthorizedPage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem('pataid_user');
    const storedRole = localStorage.getItem('pataid_role');
    
    if (storedUser && storedRole) {
      setUser(JSON.parse(storedUser));
      setUserRole(storedRole);
    }
    setLoading(false);
  }, []);

  const login = (userData, role) => {
    setUser(userData);
    setUserRole(role);
    localStorage.setItem('pataid_user', JSON.stringify(userData));
    localStorage.setItem('pataid_role', role);
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('pataid_user');
    localStorage.removeItem('pataid_role');
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('pataid_user', JSON.stringify(newUser));
  };

  const value = {
    user,
    userRole,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { userRole, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <UnauthorizedPage />;
  }

  return children;
};
