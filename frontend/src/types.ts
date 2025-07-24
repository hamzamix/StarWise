
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
    // Topics are not stored in DB, so they will be fetched on demand if needed,
    // or can be added to the model if persistence is required.
    // For now, we remove it from the primary type to match the backend.
    // topics: string[];
}
