
import React from 'react';
import { User } from '../types';
import { Button } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { SparklesIcon } from './icons/Icons';

interface HeaderProps {
    user: User;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center mx-auto px-4">
                <div className="mr-4 flex items-center">
                    <a href="/" className="flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-primary" />
                        <span className="font-bold">Starwise</span>
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <div className="flex items-center space-x-2">
                        <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
                        <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                    </div>
                    <ThemeToggle />
                    <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
                </div>
            </div>
        </header>
    );
};
