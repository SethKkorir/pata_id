import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';

// Components
import Header from './components/Header';
import Footer from './components/Footer';


// Pages
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ReportPage from './pages/ReportPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './components/RegisterPage'; // Import RegisterPage
import AdminDashboard from './pages/AdminDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import ClaimVerificationPage from './pages/ClaimVerificationPage';
import ProfilePage from './pages/ProfilePage';
import HelpPage from './pages/HelpPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <div className="App">
            <Header />
            <main className="main-content">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/claim/:id" element={<ClaimVerificationPage />} />

                {/* Protected Routes - Students/Staff */}
                <Route path="/profile" element={
                  <ProtectedRoute allowedRoles={['student', 'staff']}>
                    <ProfilePage />
                  </ProtectedRoute>
                } />

                {/* Protected Routes - Security */}
                <Route path="/security" element={
                  <ProtectedRoute allowedRoles={['security']}>
                    <SecurityDashboard />
                  </ProtectedRoute>
                } />

                {/* Protected Routes - Admin Only */}
                <Route path="/admin/*" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminRoutes />
                  </ProtectedRoute>
                } />

                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

// Admin Sub-routes
const AdminRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="users" element={<AdminUsersPage />} />
    <Route path="reports" element={<AdminReportsPage />} />
    <Route path="settings" element={<AdminSettingsPage />} />
  </Routes>
);

const NotFoundPage = () => (
  <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
    <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
      Page not found
    </p>
    <a href="/" style={{
      display: 'inline-block',
      padding: '0.75rem 1.5rem',
      background: 'var(--primary)',
      color: 'white',
      borderRadius: 'var(--radius-lg)',
      textDecoration: 'none',
      fontWeight: '500'
    }}>
      Return Home
    </a>
  </div>
);

export default App;