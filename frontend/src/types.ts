export interface User {
    id: number;
    username: string;
    avatar_url: string;
}

export interface Tag {
    id: number;
    name: string;
}

export interface Repository {
    id: number;
    github_id: number;
    name: string;
    full_name: string;
    description: string | null;
    stars: number;
    language: string | null;
    url: string;
    tags: Tag[];
}
