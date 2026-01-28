

import { useEffect, useState } from 'react';

interface User {
    _id: string;
    username: string;
    role: string;
    date: string;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');
    // Fallback to direct server URL if env var is missing (avoids "undefined/api" bug)
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/all`, {
                headers: { 'x-auth-token': token || '' }
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to fetch users: ${res.status} ${errText}`);
            }
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error loading users');
        } finally {
            setLoading(false);
        }
    };

    const [configSpeed, setConfigSpeed] = useState(40);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/me`, {
                headers: { 'x-auth-token': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.preferences?.startSpeed) {
                    setConfigSpeed(data.preferences.startSpeed);
                }
            }
        } catch (e) {
            console.error("Failed to load config", e);
        }
    };

    const saveConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                },
                body: JSON.stringify({ startSpeed: parseInt(String(configSpeed)) })
            });
            if (res.ok) {
                alert('Start Speed Saved!');
            } else {
                alert('Failed to save.');
            }
        } catch (e) {
            alert('Error saving config');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchConfig();
    }, []);

    const updateRole = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/user/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                },
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error('Failed to update role');

            // Refresh list
            fetchUsers();
        } catch (err) {
            alert('Failed to update role');
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Loading...</div>;

    return (
        <div style={{ padding: '2rem', color: '#fff' }}>
            <h1>Admin Dashboard</h1>
            <p style={{ color: '#aaa', marginBottom: '2rem' }}>User Management System</p>

            {error && <div style={{ color: '#ff4444' }}>{error}</div>}

            {/* Game Configuration Panel */}
            <div style={{
                background: '#1a1a2e',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #333',
                marginBottom: '2rem'
            }}>
                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '1rem' }}>Game Configuration</h3>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label>Next Session Start Speed:</label>
                    <input
                        type="number"
                        value={configSpeed}
                        onChange={(e) => setConfigSpeed(parseInt(e.target.value))}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #555', background: '#333', color: 'white' }}
                    />
                    <button
                        onClick={saveConfig}
                        style={{
                            background: '#d97706',
                            color: 'black',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Save Configuration
                    </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                    This setting applies to YOUR next game session.
                </p>
            </div>

            <div style={{
                background: '#1a1a2e',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #333'
            }}>
                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '1rem' }}>Registered Users</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: '#888' }}>
                            <th style={{ padding: '0.5rem' }}>Username</th>
                            <th style={{ padding: '0.5rem' }}>Role</th>
                            <th style={{ padding: '0.5rem' }}>ID</th>
                            <th style={{ padding: '0.5rem' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id} style={{ borderTop: '1px solid #333' }}>
                                <td style={{ padding: '0.75rem 0.5rem' }}>{user.username}</td>
                                <td style={{ padding: '0.5rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        background: user.role === 'admin' ? '#d97706' : '#333',
                                        color: user.role === 'admin' ? '#000' : '#ccc',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        {user.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#555' }}>
                                    {user._id}
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                    {user.role === 'user' ? (
                                        <button
                                            onClick={() => updateRole(user._id, 'admin')}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid #d97706',
                                                color: '#d97706',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(217, 119, 6, 0.1)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            Promote
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => updateRole(user._id, 'user')}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid #555',
                                                color: '#888',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.borderColor = '#aaa'}
                                            onMouseOut={e => e.currentTarget.style.borderColor = '#555'}
                                        >
                                            Demote
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
