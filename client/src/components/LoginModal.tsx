import React, { useState } from 'react';
import './LoginModal.css';

interface LoginModalProps {
    onClose: () => void;
    onSuccess: (username: string) => void;
}

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (type: 'login' | 'register') => {
        if (!username.trim() || !password.trim()) {
            setError('Username and password are required');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`http://localhost:4000/api/auth/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.msg || 'Authentication failed');
            }

            onSuccess(data.user.username);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>&times;</button>
                <h2 className="modal-title">Welcome</h2>

                <div className="form-group">
                    <label>Username</label>
                    <input
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Enter your username"
                    />
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        onKeyDown={(e) => e.key === 'Enter' && handleAuth('login')}
                    />
                </div>

                {error && <div className="error-msg">{error}</div>}

                <div className="modal-actions">
                    <button className="btn-primary" onClick={() => handleAuth('login')} disabled={loading}>
                        {loading ? '...' : 'Login'}
                    </button>
                    <button className="btn-secondary" onClick={() => handleAuth('register')} disabled={loading}>
                        Register
                    </button>
                </div>
            </div>
        </div>
    );
}
