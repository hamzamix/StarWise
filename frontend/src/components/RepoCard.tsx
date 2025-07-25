import React, { useState, KeyboardEvent } from 'react';
import { Repository } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoaderIcon, SparklesIcon, TagIcon, XIcon } from '@/components/icons/Icons';
import { Input } from '@/components/ui/Input';
import { apiService } from '@/services/apiService';

interface RepoCardProps {
    repo: Repository;
    onTagsChange: (updatedRepo: Repository) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onTagsChange }) => {
    const [tagInput, setTagInput] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);

    const handleUpdateTags = async (newTagNames: string[]) => {
        try {
            const updatedRepo = await apiService.updateRepoTags(repo.id, newTagNames);
            onTagsChange(updatedRepo);
        } catch (error) {
            console.error("Failed to update tags:", error);
        }
    };

    const handleAddTag = () => {
        const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
        if (newTag && !repo.tags.some(t => t.name === newTag)) {
            handleUpdateTags([...repo.tags.map(t => t.name), newTag]);
        }
        setTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        handleUpdateTags(repo.tags.map(t => t.name).filter(name => name !== tagToRemove));
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
            const suggested = await apiService.suggestTags(repo.id);
            const currentTagNames = repo.tags.map(t => t.name);
            const newTags = [...new Set([...currentTagNames, ...suggested])];
            await handleUpdateTags(newTags);
        } catch (error) {
            console.error("Failed to suggest tags:", error);
        } finally {
            setIsSuggesting(false);
        }
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">
                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary">
                        {repo.full_name}
                    </a>
                </CardTitle>
                <CardDescription className="h-10 overflow-hidden text-ellipsis">{repo.description || 'No description provided.'}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <div className="text-sm text-muted-foreground">
                    Language: <Badge variant="secondary">{repo.language || 'N/A'}</Badge>
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
                           <Badge key={tag.id} variant="default" className="flex items-center gap-1.5 pr-1">
                               <span>{tag.name}</span>
                               <button onClick={() => handleRemoveTag(tag.name)} className="rounded-full hover:bg-primary-foreground/20" aria-label={`Remove tag ${tag.name}`}>
                                   <XIcon className="h-3 w-3" />
                               </button>
                           </Badge>
                        ))}
                        {repo.tags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet.</span>}
                     </div>
                </div>

                <div className="w-full space-y-2">
                     <div className="flex gap-2">
                        <Input
                           type="text"
                           value={tagInput}
                           onChange={e => setTagInput(e.target.value)}
                           onKeyDown={handleKeyDown}
                           placeholder="Add a tag..."
                           aria-label="Add new tag"
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
