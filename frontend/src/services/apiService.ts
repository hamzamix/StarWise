
import { User, Repository } from '../types';

const API_BASE_URL = '/api'; // Using relative URL for proxying

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An unknown error occurred' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const apiService = {
    getCurrentUser: async (): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/auth/me`);
        return handleResponse(response);
    },

    logout: async (): Promise<void> => {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
        // No need to handle response, just fire and forget
    },

    getStarredRepos: async (forceRefresh = false): Promise<Repository[]> => {
        const response = await fetch(`${API_BASE_URL}/repos/starred?force_refresh=${forceRefresh}`);
        // The backend returns repos with snake_case keys, so we need to map them
        const data = await handleResponse(response);
        return data.map((repo: any) => ({
            ...repo,
            fullName: repo.full_name,
            githubId: repo.github_id,
        }));
    },
    
    updateRepoTags: async (repoId: number, tags: string[]): Promise<Repository> => {
        const response = await fetch(`${API_BASE_URL}/repos/${repoId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tags),
        });
        const data = await handleResponse(response);
        return {
            ...data,
            fullName: data.full_name,
            githubId: data.github_id,
        };
    },

    suggestTags: async (repoId: number): Promise<string[]> => {
        const response = await fetch(`${API_BASE_URL}/repos/${repoId}/suggest-tags`, {
            method: 'POST',
        });
        return handleResponse(response);
    },
};
