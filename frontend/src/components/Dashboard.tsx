import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './Header';
import { RepoCard } from './RepoCard';
import { Repository, User } from '../types';
import { Input } from './ui/Input';
import { LoaderIcon } from './icons/Icons';
import { apiService } from '../services/apiService';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [allRepos, setAllRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const loadRepos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const repos = await apiService.getStarredRepos();
            setAllRepos(repos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load repositories.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRepos();
    }, [loadRepos]);

    const filteredRepos = useMemo(() => {
        if (!searchTerm) return allRepos;
        const lowercasedFilter = searchTerm.toLowerCase();
        return allRepos.filter(repo => {
            return (
                repo.full_name.toLowerCase().includes(lowercasedFilter) ||
                (repo.description && repo.description.toLowerCase().includes(lowercasedFilter)) ||
                repo.tags.some(tag => tag.name.toLowerCase().includes(lowercasedFilter))
            );
        });
    }, [searchTerm, allRepos]);
    
    const handleRepoTagChange = (repoId: number, updatedRepo: Repository) => {
        setAllRepos(prevRepos => 
            prevRepos.map(repo => 
                repo.id === repoId ? updatedRepo : repo
            )
        );
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header user={user} onLogout={onLogout} />
            <main className="container mx-auto px-4 py-8 flex-grow">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Starred Repositories</h1>
                    <p className="text-muted-foreground">Search, manage, and categorize your stars.</p>
                </div>
                
                <div className="mb-6">
                    <Input
                        type="text"
                        placeholder="Search by name, description, or tag..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-lg"
                        aria-label="Search repositories"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground">Fetching your stars...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16 text-destructive">
                        <p>Error: {error}</p>
                    </div>
                ) : (
                    <>
                        {filteredRepos.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {filteredRepos.map(repo => (
                                    <RepoCard 
                                        key={repo.id} 
                                        repo={repo}
                                        onTagsChange={(updatedRepo) => handleRepoTagChange(repo.id, updatedRepo)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-muted-foreground">
                                    {allRepos.length > 0 ? 'No repositories found for your search.' : 'No starred repositories found.'}
                                </p>
                            </div>
                        )}
                    </>
                 )}
            </main>
            <footer className="text-center py-4 border-t border-border text-xs text-muted-foreground">
                Starwise by AI
            </footer>
        </div>
    );
};

export default Dashboard;
