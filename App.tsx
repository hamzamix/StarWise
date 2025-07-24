
import React, { useState, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { User } from './types';

// Mock user for demonstration purposes
const MOCK_USER: User = {
    name: 'GitHub User',
    avatarUrl: 'https://picsum.photos/seed/user/40/40',
};

function App() {
    const [user, setUser] = useState<User | null>(null);

    const handleLogin = useCallback(() => {
        // In a real app, this would be the callback after a successful GitHub OAuth flow
        setUser(MOCK_USER);
    }, []);

    const handleLogout = useCallback(() => {
        setUser(null);
    }, []);

    return (
        <div className="min-h-screen bg-background font-sans">
            {user ? (
                <Dashboard user={user} onLogout={handleLogout} />
            ) : (
                <LoginScreen onLogin={handleLogin} />
            )}
        </div>
    );
}

export default App;
