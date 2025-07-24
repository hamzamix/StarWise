
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { RepoCard } from './RepoCard';
import { fetchStarredRepos } from '../services/githubService';
import { Repository, User } from '../types';
import { Input } from './ui/Input';
import { LoaderIcon } from './icons/Icons';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [allRepos, setAllRepos] = useState<Repository[]>([]);
    const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadRepos = async () => {
            setLoading(true);
            const repos = await fetchStarredRepos();
            setAllRepos(repos.map(r => ({...r, tags: [...r.tags]}))); // Ensure tags array is mutable
            setFilteredRepos(repos);
            setLoading(false);
        };
        loadRepos();
    }, []);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = allRepos.filter(repo => {
            return (
                repo.fullName.toLowerCase().includes(lowercasedFilter) ||
                (repo.description && repo.description.toLowerCase().includes(lowercasedFilter)) ||
                repo.tags.some(tag => tag.toLowerCase().includes(lowercasedFilter)) ||
                repo.topics.some(topic => topic.toLowerCase().includes(lowercasedFilter))
            );
        });
        setFilteredRepos(filtered);
    }, [searchTerm, allRepos]);
    
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        allRepos.forEach(repo => repo.tags.forEach(tag => tagSet.add(tag)));
        return Array.from(tagSet).sort();
    }, [allRepos]);


    const handleRepoTagChange = (repoId: number, newTags: string[]) => {
        setAllRepos(prevRepos => 
            prevRepos.map(repo => 
                repo.id === repoId ? { ...repo, tags: newTags } : repo
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
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground">Fetching your stars...</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredRepos.map(repo => (
                            <RepoCard 
                                key={repo.id} 
                                repo={repo}
                                onTagsChange={(newTags) => handleRepoTagChange(repo.id, newTags)}
                            />
                        ))}
                    </div>
                )}
                 { !loading && filteredRepos.length === 0 && (
                     <div className="text-center py-16">
                        <p className="text-muted-foreground">No repositories found for your search.</p>
                     </div>
                 )}
            </main>
            <footer className="text-center py-4 border-t border-border text-xs text-muted-foreground">
                Starwise by AI
            </footer>
        </div>
    );
};

export default Dashboard;
