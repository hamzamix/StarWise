import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { User } from './types';
import { apiService } from './services/apiService';
import { LoaderIcon } from './components/icons/Icons';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const checkUserSession = useCallback(async () => {
        try {
            const currentUser = await apiService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.log("No active session found.");
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUserSession();
    }, [checkUserSession]);

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
    
    return (
        <div className="min-h-screen bg-background font-sans">
           {user ? (
               <Dashboard user={user} onLogout={handleLogout} />
           ) : (
               <LoginScreen />
           )}
        </div>
    );
}

export default App;
