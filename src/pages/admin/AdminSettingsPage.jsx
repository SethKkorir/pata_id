import React from 'react';
import Button from '../../components/Button';
import './AdminStyles.css';

const AdminSettingsPage = () => {
    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1>System Settings</h1>
                <Button variant="primary">Save Changes</Button>
            </div>

            <div className="admin-filters" style={{ flexDirection: 'column', gap: '2rem' }}>
                <div className="setting-group">
                    <h3>General Settings</h3>
                    <p style={{ color: '#64748b' }}>Configure platform-wide defaults.</p>
                    {/* Add form inputs here */}
                </div>

                <div className="setting-group">
                    <h3>Notification Preferences</h3>
                    <p style={{ color: '#64748b' }}>Manage email and SMS templates.</p>
                </div>

                <div className="setting-group">
                    <h3>Security</h3>
                    <p style={{ color: '#64748b' }}>Password policies and access control.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsPage;
