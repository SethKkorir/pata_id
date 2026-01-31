import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import Button from '../components/Button';
import EnhancedIDCard from '../components/EnhancedIDCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Input, Select } from '../components/Input';
import './SecurityDashboard.css';

import { api } from '../utils/api';

const SecurityDashboard = () => {
    const { user } = useAuth();
    const { success: notifySuccess, error: notifyError } = useNotify();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('incoming'); // incoming, verification, history
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const campusFilter = (user?.campus && user.campus !== 'All Campuses') ? user.campus : '';

            const [pendingRes, claimedRes, returnedRes] = await Promise.all([
                api.get(`/reports/search?status=pending&campus=${campusFilter}`),
                api.get(`/reports/search?status=claimed&campus=${campusFilter}`),
                api.get(`/reports/search?status=returned&campus=${campusFilter}`)
            ]);

            const allReports = [
                ...(pendingRes.data || []),
                ...(claimedRes.data || []),
                ...(returnedRes.data || [])
            ].map(r => ({
                id: r._id,
                type: r.idType,
                name: r.fullName,
                idNumber: r.maskedIdNumber || '*****',
                campus: r.campus,
                dateFound: new Date(r.createdAt).toLocaleDateString(),
                initials: r.fullName ? r.fullName.split(' ').map(n => n[0]).join('') : '?',
                status: r.status,
                location: r.specificLocation,
                verificationStatus: r.verificationStatus,
                claimantName: r.ownerId ? (r.ownerId.firstName ? `${r.ownerId.firstName} ${r.ownerId.lastName}` : 'Claimant') : 'Unknown',
            }));

            setReports(allReports);
        } catch (error) {
            console.error(error);
            notifyError('Error', 'Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchReports();
        }
    }, [user]);

    const handleVerify = (report) => {
        setSelectedReport(report);
    };

    const handleMarkReturned = async (reportId) => {
        if (!window.confirm('Are you sure you want to mark this item as returned/handed over?')) return;

        setIsSubmitting(true);
        try {
            await api.put(`/reports/${reportId}`, {
                status: 'returned',
                collectionPoint: 'Security Desk',
                collectionNotes: 'Handed over to owner after verification'
            });

            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: 'returned' } : r
            ));
            notifySuccess('Success', 'Item marked as returned successfully');
            setSelectedReport(null);
        } catch (error) {
            notifyError('Error', 'Failed to update report');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSecurityConfirm = async (reportId) => {
        setIsSubmitting(true);
        try {
            // Logic to confirm verification (from security side)
            // For now let's just update the status to verified
            await api.put(`/reports/${reportId}`, { status: 'verified' });

            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: 'verified' } : r
            ));
            notifySuccess('Success', 'Report verified by security');
            setSelectedReport(null);
        } catch (error) {
            notifyError('Error', 'Failed to verify report');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    const filteredReports = reports.filter(r =>
    (r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.idNumber.includes(searchQuery))
    );

    return (
        <div className="security-dashboard">
            <header className="security-header">
                <div className="guard-info">
                    <h1>Security Portal</h1>
                    <p>{user?.campus} Campus • {user?.name}</p>
                </div>
                <div className="status-indicator online">
                    <span className="dot"></span> Online
                </div>
            </header>

            <div className="security-controls">
                <Input
                    placeholder="Scan ID or Search Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon="🔍"
                />
            </div>

            <nav className="security-tabs">
                <button
                    className={activeTab === 'incoming' ? 'active' : ''}
                    onClick={() => setActiveTab('incoming')}
                >
                    New ({reports.filter(r => r.status === 'pending').length})
                </button>
                <button
                    className={activeTab === 'verification' ? 'active' : ''}
                    onClick={() => setActiveTab('verification')}
                >
                    To Handover ({reports.filter(r => r.status === 'claimed').length})
                </button>
                <button
                    className={activeTab === 'history' ? 'active' : ''}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </nav>

            <main className="security-content">
                {activeTab === 'incoming' && (
                    <div className="report-list">
                        {filteredReports
                            .filter(r => r.status === 'pending' || r.status === 'verified')
                            .map(report => (
                                <div key={report.id} className={`security-card ${report.status === 'verified' ? 'verified' : ''}`}>
                                    <div className="card-header">
                                        <span className={`badge ${report.status}`}>{report.status === 'verified' ? 'Verified' : 'New Report'}</span>
                                        <span className="time">{report.dateFound}</span>
                                    </div>
                                    <h3>{report.type === 'student' ? 'Student ID' : 'Staff ID'}</h3>
                                    <p className="location">📍 {report.location}</p>
                                    <p className="name">Name: {report.name}</p>
                                    <Button size="sm" onClick={() => handleVerify(report)}>
                                        Details
                                    </Button>
                                </div>
                            ))}
                    </div>
                )}

                {activeTab === 'verification' && (
                    <div className="verification-list">
                        {filteredReports
                            .filter(r => r.status === 'claimed')
                            .map(report => (
                                <div key={report.id} className="security-card urgent">
                                    <div className="card-header">
                                        <span className="badge warning">Waiting for Handover</span>
                                    </div>
                                    <h3>Claimant: {report.claimantName}</h3>
                                    <p>ID Owner: {report.name}</p>
                                    <div className="actions">
                                        <Button variant="outline" size="sm" onClick={() => handleVerify(report)}>Verify Identity</Button>
                                        <Button variant="primary" size="sm" onClick={() => handleMarkReturned(report.id)}>
                                            Confirm Handover
                                        </Button>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-list">
                        {filteredReports
                            .filter(r => r.status === 'returned')
                            .map(report => (
                                <div key={report.id} className="security-card history">
                                    <div className="card-header">
                                        <span className="badge success">Returned</span>
                                        <span className="time">{report.dateFound}</span>
                                    </div>
                                    <h3>{report.name}</h3>
                                    <p>ID: {report.idNumber}</p>
                                    <p className="location">Returned from: {report.campus}</p>
                                </div>
                            ))}
                    </div>
                )}
            </main>

            {/* Details Modal */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>ID Report Details</h2>
                            <button className="close-modal" onClick={() => setSelectedReport(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-group">
                                <label>Report Status</label>
                                <span className={`status-tag ${selectedReport.status}`}>{selectedReport.status}</span>
                            </div>
                            <div className="detail-grid">
                                <div>
                                    <label>Full Name</label>
                                    <p>{selectedReport.name}</p>
                                </div>
                                <div>
                                    <label>ID Number (Masked)</label>
                                    <p>{selectedReport.idNumber}</p>
                                </div>
                                <div>
                                    <label>Campus</label>
                                    <p>{selectedReport.campus}</p>
                                </div>
                                <div>
                                    <label>Location Found</label>
                                    <p>{selectedReport.location}</p>
                                </div>
                            </div>

                            {selectedReport.status === 'claimed' && (
                                <div className="claim-info">
                                    <h4>Claimant Information</h4>
                                    <p><strong>Name:</strong> {selectedReport.claimantName}</p>
                                    <p className="verification-note">Please ask the claimant to provide their original ID or the verification token shown on their phone.</p>
                                </div>
                            )}

                            <div className="modal-actions">
                                {selectedReport.status === 'pending' && (
                                    <Button variant="primary" onClick={() => handleSecurityConfirm(selectedReport.id)} isLoading={isSubmitting}>
                                        Verify Found Item
                                    </Button>
                                )}
                                {selectedReport.status === 'claimed' && (
                                    <Button variant="primary" onClick={() => handleMarkReturned(selectedReport.id)} isLoading={isSubmitting}>
                                        Complete Handover
                                    </Button>
                                )}
                                <Button variant="secondary" onClick={() => setSelectedReport(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Scan FAB */}
            <button className="fab-scan">
                📷
            </button>
        </div>
    );
};

export default SecurityDashboard;
