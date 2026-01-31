import React, { useState, useEffect } from 'react';
import Button from '../../components/Button';
import { Input, Select } from '../../components/Input';
import './AdminStyles.css';

import { api } from '../../utils/api';

const AdminUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                let endpoint = '/admin/users';
                if (searchQuery) endpoint += `?search=${searchQuery}`;

                const response = await api.get(endpoint);

                if (response.success && response.data) {
                    const formattedUsers = response.data.map(u => ({
                        id: u._id,
                        name: `${u.firstName} ${u.lastName}`,
                        email: u.email || u.phone, // Handle phone-only users
                        role: u.role,
                        status: u.isVerified ? 'verified' : 'pending' // Map boolean to status string
                    }));
                    setUsers(formattedUsers);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };

        const debounce = setTimeout(() => {
            fetchUsers();
        }, 300); // Debounce search

        return () => clearTimeout(debounce);
    }, [searchQuery]);

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1>User Management</h1>
                <Button variant="primary">+ Add User</Button>
            </div>

            <div className="admin-filters">
                <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`role-badge ${user.role}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>{user.status}</td>
                                <td>
                                    <Button size="sm" variant="outline">Edit</Button>
                                    <Button size="sm" variant="danger" style={{ marginLeft: '0.5rem' }}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUsersPage;
