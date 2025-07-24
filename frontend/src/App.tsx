
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Using react-router for navigation
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { User } from './types';
import { apiService } from './services/apiService';
import { LoaderIcon } from './components/icons/Icons';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    const checkUserSession = useCallback(async () => {
        try {
            const currentUser = await apiService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.log("No active session found.");
            setUser(null);
            // If user is on the dashboard without a session, redirect to login
            if (location.pathname.startsWith('/dashboard')) {
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    }, [location.pathname, navigate]);

    useEffect(() => {
        checkUserSession();
    }, [checkUserSession]);

    // This effect handles the redirection after OAuth callback
    useEffect(() => {
        if (!loading && user && location.pathname !== '/dashboard') {
            navigate('/dashboard');
        }
    }, [user, loading, location.pathname, navigate]);


    const handleLogout = async () => {
        await apiService.logout();
        setUser(null);
        navigate('/');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <LoaderIcon className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    // Use path to decide which component to show
    const isDashboard = location.pathname.startsWith('/dashboard');

    return (
        <div className="min-h-screen bg-background font-sans">
            {user && isDashboard ? (
                <Dashboard user={user} onLogout={handleLogout} />
            ) : (
                <LoginScreen />
            )}
        </div>
    );
}

export default App;
