import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../utils/api';
import Button from './Button';
import EnhancedIDCard from './EnhancedIDCard';
import { Select, Input } from './Input';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reports');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  const tabs = [
    { id: 'reports', label: 'All Reports', icon: '📋', count: 24 },
    { id: 'pending', label: 'Pending', icon: '⏳', count: 8 },
    { id: 'verified', label: 'Verified', icon: '✅', count: 12 },
    { id: 'claimed', label: 'Claimed', icon: '🎉', count: 4 },
    { id: 'analytics', label: 'Analytics', icon: '📊', count: null },
    { id: 'users', label: 'Users', icon: '👥', count: 156 }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'claimed', label: 'Claimed' },
    { value: 'returned', label: 'Returned' }
  ];

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalReports: 0,
    recoveryRate: '0%',
    avgRecoveryTime: '0 days',
    activeUsers: 0
  });

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await api.get('/admin/dashboard');
        if (statsRes.success) {
          // Provide fallback values if data is missing
          const data = statsRes.data || {};
          setStats({
            totalReports: data.totalReports || 0,
            recoveryRate: data.recoveryRate ? `${Math.round(data.recoveryRate)}%` : '0%',
            // avgRecoveryTime might be number of days
            avgRecoveryTime: data.avgRecoveryTime ? `${Math.round(data.avgRecoveryTime)} days` : '0 days',
            activeUsers: data.activeUsers || 0 // Backend might not send this yet, defaulting to 0
          });
        }

        // Also fetch recent reports for the grid
        const reportsRes = await api.get('/reports/search?limit=10'); // Get top 10 recent
        if (reportsRes.success) {
          setReports(reportsRes.data.map(r => ({
            id: r._id,
            type: r.idType,
            name: r.fullName,
            idNumber: r.maskedIdNumber || '*****',
            campus: r.campus,
            dateFound: new Date(r.createdAt).toLocaleDateString(),
            initials: r.fullName ? r.fullName.split(' ').map(n => n[0]).join('') : '?',
            status: r.status,
            finderContact: r.finderContact || 'Hidden',
            ownerContact: 'Hidden' // Privacy
          })));
        }

      } catch (error) {
        console.error('Failed to load dashboard data', error);
      }
    };

    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const handleBulkAction = (action) => {
    console.log(`${action} selected items:`, selectedItems);
    // Implement bulk action logic
  };

  const handleExport = () => {
    // Implement export logic
    console.log('Exporting data...');
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Welcome back, {user?.name || 'Admin'}</p>
        </div>
        <div className="admin-actions">
          <Button variant="outline-accent" onClick={handleExport}>
            Export Data
          </Button>
          <Button variant="primary">
            + New Report
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">📋</div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.totalReports}</h3>
            <p className="stat-label">Total Reports</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">✅</div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.recoveryRate}</h3>
            <p className="stat-label">Recovery Rate</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon accent">⏱️</div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.avgRecoveryTime}</h3>
            <p className="stat-label">Avg. Recovery Time</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">👥</div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.activeUsers}</h3>
            <p className="stat-label">Active Users</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.count !== null && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="admin-filters">
        <div className="filter-section">
          <div className="filter-group">
            <label className="filter-label">Status Filter</label>
            <Select
              options={statusOptions}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <Input
              type="text"
              placeholder="Search by name, ID, or campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bulk-actions">
          <Button
            variant="outline-accent"
            size="sm"
            onClick={() => handleBulkAction('verify')}
            disabled={selectedItems.length === 0}
          >
            Verify Selected ({selectedItems.length})
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => handleBulkAction('delete')}
            disabled={selectedItems.length === 0}
          >
            Delete Selected
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {activeTab === 'analytics' ? (
          <div className="analytics-view">
            <h2>Analytics Dashboard</h2>
            <p>Detailed analytics coming soon...</p>
            {/* Add charts and graphs here */}
          </div>
        ) : activeTab === 'users' ? (
          <div className="users-view">
            <h2>User Management</h2>
            <p>User management interface coming soon...</p>
            {/* Add user table here */}
          </div>
        ) : (
          <div className="reports-grid">
            {reports
              .filter(report =>
                filterStatus === 'all' || report.status === filterStatus
              )
              .filter(report =>
                !searchQuery ||
                report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                report.campus.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(report => (
                <EnhancedIDCard
                  key={report.id}
                  {...report}
                  showActions={false}
                />
              ))
            }
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <div className="quick-actions">
        <h3 className="quick-actions-title">Quick Actions</h3>
        <div className="action-buttons">
          <button className="quick-action-btn">
            <span className="action-icon">📞</span>
            <span className="action-label">Call Security</span>
          </button>
          <button className="quick-action-btn">
            <span className="action-icon">📧</span>
            <span className="action-label">Email Report</span>
          </button>
          <button className="quick-action-btn">
            <span className="action-icon">🔄</span>
            <span className="action-label">Refresh Data</span>
          </button>
          <button className="quick-action-btn">
            <span className="action-icon">⚙️</span>
            <span className="action-label">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;