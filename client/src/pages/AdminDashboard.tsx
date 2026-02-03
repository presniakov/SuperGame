
import { useEffect, useState, useCallback } from 'react';
import { ProfileType, SessionType } from '../types';
import type { IGameResult } from '../types';

interface User {
    _id: string;
    username: string;
    role: string;
    date: string;
    preferences?: {
        profile: ProfileType;
        forceSessionType?: SessionType;
    };
    totalSessionsPlayed?: number;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');
    // Robust Runtime Check: If we are not on localhost, we are in production.
    // This ignores build-time flags which might be flaky if the build process varies.
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = isLocal ? (import.meta.env.VITE_API_URL || 'http://localhost:4000') : '';

    const fetchUsers = useCallback(async () => {
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
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message || 'Error loading users');
            } else {
                setError('Error loading users');
            }
        } finally {
            setLoading(false);
        }
    }, [API_BASE, token]);

    const [configSession, setConfigSession] = useState<SessionType | ''>('');

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/me`, {
                headers: { 'x-auth-token': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.preferences?.forceSessionType) {
                    setConfigSession(data.preferences.forceSessionType);
                } else {
                    setConfigSession('');
                }
            }
        } catch (e: unknown) {
            console.error("Failed to load config", e);
        }
    }, [API_BASE, token]);

    const saveConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                },
                body: JSON.stringify({ forceSessionType: configSession })
            });
            if (res.ok) {
                alert('Session Config Saved!');
            } else {
                alert('Failed to save.');
            }
        } catch {
            alert('Error saving config');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchConfig();
    }, [fetchUsers, fetchConfig]);

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
        } catch {
            alert('Failed to update role');
        }
    };

    const updateProfile = async (userId: string, newProfile: ProfileType) => {
        try {
            const res = await fetch(`${API_BASE}/api/user/${userId}/preferences`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                },
                body: JSON.stringify({ profile: newProfile })
            });
            if (!res.ok) throw new Error('Failed to update profile');
            fetchUsers();
        } catch {
            alert('Failed to update profile');
        }
    };

    const updateSessionType = async (userId: string, type: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/user/${userId}/preferences`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                },
                body: JSON.stringify({ forceSessionType: type })
            });
            if (!res.ok) throw new Error('Failed to update session');
            fetchUsers();
        } catch {
            alert('Failed to update session');
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/user/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                }
            });
            if (!res.ok) throw new Error('Failed to delete user');

            // Refresh list
            fetchUsers();
        } catch (err: unknown) {
            alert('Failed to delete user');
            console.error(err);
        }
    };

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userHistory, setUserHistory] = useState<IGameResult[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);

    const viewStats = async (user: User) => {
        setSelectedUser(user);
        setStatsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/user/${user._id}/history`, {
                headers: { 'x-auth-token': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setUserHistory(data);
            }
        } catch (e: unknown) {
            console.error(e);
            alert('Failed to load user history');
        } finally {
            setStatsLoading(false);
        }
    };

    const closeStats = () => {
        setSelectedUser(null);
        setUserHistory([]);
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
                    <label>Next Session Type:</label>
                    <select
                        value={configSession}
                        onChange={(e) => setConfigSession(e.target.value as SessionType)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #555', background: '#333', color: 'white', minWidth: '150px' }}
                    >
                        <option value="">Auto (Cycle)</option>
                        {Object.values(SessionType).map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
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
                    This forces a specific session strategy for YOUR next game.
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
                            <th style={{ padding: '0.5rem' }}>Profile</th>
                            <th style={{ padding: '0.5rem' }}>Session Override</th>
                            <th style={{ padding: '0.5rem' }}>ID</th>
                            <th style={{ padding: '0.5rem' }}>Action</th>
                            <th style={{ padding: '0.5rem' }}>Stats</th>
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
                                <td style={{ padding: '0.5rem' }}>
                                    <select
                                        value={user.preferences?.profile || ProfileType.CASUAL}
                                        onChange={(e) => updateProfile(user._id, e.target.value as ProfileType)}
                                        style={{
                                            background: '#333',
                                            color: 'white',
                                            border: '1px solid #555',
                                            padding: '0.25rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {Object.values(ProfileType).map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                    <select
                                        value={user.preferences?.forceSessionType || ''}
                                        onChange={(e) => updateSessionType(user._id, e.target.value)}
                                        style={{
                                            background: '#333',
                                            color: 'white',
                                            border: '1px solid #555',
                                            padding: '0.25rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem',
                                            width: '120px'
                                        }}
                                    >
                                        <option value="">Auto</option>
                                        {Object.values(SessionType).map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>
                                        Total: {user.totalSessionsPlayed || 0}
                                    </div>
                                </td>
                                <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#555' }}>
                                    {user._id}
                                </td>
                                <td style={{ padding: '0.5rem', display: 'flex', gap: '10px' }}>
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
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Are you SURE you want to delete user "${user.username}"?\n\nThis will permanently delete the user and ALL their game history.\nThis action cannot be undone.`)) {
                                                deleteUser(user._id);
                                            }
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #ef4444',
                                            color: '#ef4444',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            marginLeft: '10px'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Delete
                                    </button>
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                    <button
                                        onClick={() => viewStats(user)}
                                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Stats
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Stats Modal */}
            {selectedUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#16213e', padding: '2rem', borderRadius: '8px',
                        width: '80%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto',
                        border: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2>Stats: {selectedUser.username}</h2>
                            <button onClick={closeStats} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        {statsLoading ? <p>Loading...</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #333' }}>
                                        <th style={{ padding: '0.5rem' }}>Date</th>
                                        <th style={{ padding: '0.5rem' }}>Score</th>
                                        <th style={{ padding: '0.5rem' }}>Max Speed</th>
                                        <th style={{ padding: '0.5rem' }}>Accuracy</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userHistory.map((game, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '0.5rem' }}>{new Date(game.date).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem', color: '#d97706' }}>
                                                {game.statistics?.totalScore || Math.floor(game.score || 0)}
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>{game.statistics?.maxSpeed?.toFixed(1) || '-'}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                {game.statistics?.errorRateFirst23 ?
                                                    (100 - (game.statistics.errorRateFirst23 + game.statistics.errorRateLast13) / 2).toFixed(1) + '%'
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {userHistory.length === 0 && (
                                        <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No games played</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
