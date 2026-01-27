

export default function AdminDashboard() {
    return (
        <div style={{ padding: '2rem', color: '#fff' }}>
            <h1>Admin Dashboard</h1>
            <p>Welcome, Administrator. This module was lazily loaded!</p>
            <div style={{ marginTop: '20px', border: '1px solid #ff4444', padding: '10px' }}>
                <h3>Confidential Admin Controls</h3>
                <button style={{ backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}>
                    Delete Database
                </button>
            </div>
        </div>
    );
}
