import React, { useState, useEffect } from 'react';
import Button from '../../components/Button';
import { Input, Select } from '../../components/Input';

import './AdminStyles.css';

import { api } from '../../utils/api';

const AdminReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Data
    useEffect(() => {
        const fetchReports = async () => {
            try {
                // Determine query params
                let query = '';
                if (filterStatus !== 'all') {
                    query += `?status=${filterStatus}`;
                }

                // If search query exists, we might need to handle it. 
                // Currently backend supports `name` or `idNumber` or `campus`.
                // For simplified UI, let's just fetch filtering by status and filter client side or implement robust search later
                // The backend endpoint `/api/reports/search` returns `{ data: [...] }`

                const response = await api.get(`/reports/search${query}`);

                if (response.success && response.data) {
                    const formattedReports = response.data.map(r => ({
                        id: r._id,
                        type: r.idType,
                        name: r.fullName,
                        idNumber: r.maskedIdNumber || '*****',
                        campus: r.campus,
                        dateFound: new Date(r.createdAt).toLocaleDateString(),
                        status: r.status,
                        initials: r.fullName ? r.fullName.split(' ').map(n => n[0]).join('') : '?'
                    }));
                    setReports(formattedReports);
                }
            } catch (error) {
                console.error("Failed to fetch reports", error);
            }
        };

        fetchReports();
    }, [filterStatus]); // Re-fetch when filter changes

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'verified', label: 'Verified' },
        { value: 'claimed', label: 'Claimed' },
        { value: 'returned', label: 'Returned' }
    ];

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1>Report Management</h1>
                <Button variant="primary">+ Create Report</Button>
            </div>

            <div className="admin-filters">
                <Select
                    options={statusOptions}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                />
                <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID Type</th>
                            <th>Name</th>
                            <th>Campus</th>
                            <th>Status</th>
                            <th>Date Found</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(report => (
                            <tr key={report.id}>
                                <td>
                                    <span className={`badge ${report.type}`}>
                                        {report.type}
                                    </span>
                                </td>
                                <td>{report.name}</td>
                                <td>{report.campus}</td>
                                <td>
                                    <span className={`status-badge ${report.status}`}>
                                        {report.status}
                                    </span>
                                </td>
                                <td>{report.dateFound}</td>
                                <td>
                                    <Button size="sm" variant="outline">Edit</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminReportsPage;
