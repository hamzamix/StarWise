
export interface User {
    name: string;
    avatarUrl: string;
}

export interface Repository {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    stars: number;
    language: string | null;
    topics: string[];
    url: string;
    tags: string[];
}
