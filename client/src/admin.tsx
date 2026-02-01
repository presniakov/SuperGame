import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Direct import is fine here since this entire bundle is "lazy" by definition of being a separate page
import AdminDashboard from './pages/AdminDashboard'

import { useState, useEffect } from 'react'

// Simple Auth Guard component
function AdminGuard({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/';
                return;
            }

            try {
                // Verify token and role with backend
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const apiUrl = isLocal ? (import.meta.env.VITE_API_URL || 'http://localhost:4000/api') : '/api';
                const res = await fetch(`${apiUrl}/user/me`, {
                    headers: { 'x-auth-token': token }
                });

                if (!res.ok) throw new Error('Failed to fetch user');

                const user = await res.json();
                if (user.role === 'admin') {
                    setAuthorized(true);
                } else {
                    // If not admin, kick them out
                    alert('Unauthorized access');
                    window.location.href = '/';
                }
            } catch (err) {
                console.error(err);
                window.location.href = '/';
            }
        };

        checkAuth();
    }, []);

    if (authorized === null) {
        return <div style={{ color: 'white', padding: '20px' }}>Verifying Admin Privileges...</div>;
    }

    return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AdminGuard>
            <Suspense fallback={<div>Loading Admin Interface...</div>}>
                <AdminDashboard />
            </Suspense>
        </AdminGuard>
    </StrictMode>,
)
