import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, CircularProgress,
    IconButton, TextField, Stack, Alert, Link
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GitHubIcon from '@mui/icons-material/GitHub';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

// Helper to interact with the backend (assuming API_BASE_URL is globally available or passed)
// In index.tsx API_BASE_URL is defined. We might need to pass it or redefine it.
// For simplicity, we'll redefine it based on window location same as index.tsx to avoid complex prop drilling
// or moving everything to a context.
const isDevelopment = window.location.port === '5173';
const backendPort = isDevelopment ? '4000' : window.location.port;
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${backendPort}`;

export default function ShareModal({ open, onClose, list }) {
    const [markdown, setMarkdown] = useState('');
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [gistUrl, setGistUrl] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open && list) {
            fetchMarkdown();
            setGistUrl(null);
            setError(null);
        }
    }, [open, list]);

    const fetchMarkdown = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/share/markdown`, {
                listId: list.id
            });
            setMarkdown(response.data.markdown);
        } catch (err) {
            console.error('Failed to generate markdown:', err);
            setError('Failed to generate stack markdown.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePublishGist = async () => {
        setPublishing(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/share/gist`, {
                content: markdown,
                description: `StarWise Stack: ${list.name}`,
                isPublic: false // Default to secret gist for safety
            });

            if (response.data.success) {
                setGistUrl(response.data.html_url);
            }
        } catch (err) {
            console.error('Gist publish failed:', err);
            const msg = err.response?.data?.error || 'Failed to publish Gist.';
            setError(msg);
        } finally {
            setPublishing(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Share Stack: {list?.name}
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                            Share your stack as a Markdown list or publish it to a GitHub Gist.
                        </Typography>

                        {error && <Alert severity="error">{error}</Alert>}
                        {gistUrl && (
                            <Alert severity="success" icon={<CheckIcon fontSize="inherit" />}>
                                Published to Gist! <Link href={gistUrl} target="_blank" rel="noopener">View Gist</Link>
                            </Alert>
                        )}

                        <Box sx={{ position: 'relative' }}>
                            <TextField
                                multiline
                                rows={10}
                                fullWidth
                                value={markdown}
                                InputProps={{
                                    readOnly: true,
                                    sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                                }}
                            />
                            <IconButton
                                onClick={handleCopy}
                                sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                            >
                                {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                            </IconButton>
                        </Box>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Close</Button>
                <Button
                    variant="contained"
                    startIcon={publishing ? <CircularProgress size={20} color="inherit" /> : <GitHubIcon />}
                    onClick={handlePublishGist}
                    disabled={loading || publishing || !markdown || !!gistUrl}
                >
                    {gistUrl ? 'Published' : 'Publish to Gist'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
