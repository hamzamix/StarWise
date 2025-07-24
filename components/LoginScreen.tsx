
import React from 'react';
import { Button } from './ui/Button';
import { GithubIcon, SparklesIcon } from './icons/Icons';

interface LoginScreenProps {
    onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <div className="flex items-center gap-4 mb-4">
                 <SparklesIcon className="h-12 w-12 text-primary" />
                 <h1 className="text-5xl font-bold tracking-tighter">Starwise</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-md mb-8">
                Your GitHub stars, organized. Automatically tag and categorize your favorite repositories with the power of AI.
            </p>
            <Button onClick={onLogin} size="lg">
                <GithubIcon className="h-5 w-5 mr-2" />
                Sign in with GitHub
            </Button>
            <p className="text-xs text-muted-foreground mt-8">
                By signing in, you agree to connect your GitHub account.
            </p>
        </div>
    );
};

export default LoginScreen;
