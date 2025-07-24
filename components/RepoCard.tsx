
import React, { useState, KeyboardEvent, useRef } from 'react';
import { Repository } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { LoaderIcon, SparklesIcon, TagIcon, XIcon } from './icons/Icons';
import { suggestTagsForRepo } from '../services/geminiService';

interface RepoCardProps {
    repo: Repository;
    onTagsChange: (tags: string[]) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onTagsChange }) => {
    const [tagInput, setTagInput] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAddTag = () => {
        const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
        if (newTag && !repo.tags.includes(newTag)) {
            onTagsChange([...repo.tags, newTag]);
        }
        setTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(repo.tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddTag();
        }
    };
    
    const handleSuggestTags = async () => {
        setIsSuggesting(true);
        try {
            const suggested = await suggestTagsForRepo(repo);
            const newTags = [...new Set([...repo.tags, ...suggested])];
            onTagsChange(newTags);
        } catch (error) {
            console.error("Failed to suggest tags:", error);
            // Optionally show an error to the user
        } finally {
            setIsSuggesting(false);
        }
    };


    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">
                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary">
                        {repo.fullName}
                    </a>
                </CardTitle>
                <CardDescription className="h-10 overflow-hidden text-ellipsis">{repo.description || 'No description provided.'}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-1 mb-4">
                    {repo.topics.slice(0, 4).map(topic => (
                        <Badge key={topic} variant="secondary">{topic}</Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
                <div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <TagIcon className="h-4 w-4"/>
                        Your Tags
                     </div>
                     <div className="flex flex-wrap gap-2 items-center">
                        {repo.tags.map(tag => (
                           <Badge key={tag} variant="default" className="flex items-center gap-1.5 pr-1">
                               <span>{tag}</span>
                               <button onClick={() => handleRemoveTag(tag)} className="rounded-full hover:bg-primary-foreground/20">
                                   <XIcon className="h-3 w-3" />
                               </button>
                           </Badge>
                        ))}
                        {repo.tags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet.</span>}
                     </div>
                </div>

                <div className="w-full space-y-2">
                     <div className="flex gap-2">
                        <input
                           ref={inputRef}
                           type="text"
                           value={tagInput}
                           onChange={e => setTagInput(e.target.value)}
                           onKeyDown={handleKeyDown}
                           placeholder="Add a tag..."
                           className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                         <Button variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
                     </div>
                     <Button variant="secondary" size="sm" className="w-full" onClick={handleSuggestTags} disabled={isSuggesting}>
                        {isSuggesting ? (
                            <>
                                <LoaderIcon className="h-4 w-4 mr-2 animate-spin"/>
                                Suggesting...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="h-4 w-4 mr-2"/>
                                Suggest Tags with AI
                            </>
                        )}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
