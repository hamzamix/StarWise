import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';

import {
  Button, TextField, Typography, Container, Box, Card, Chip, Select, MenuItem,
  InputLabel, FormControl, FormControlLabel, Switch, CircularProgress, createTheme, ThemeProvider,
  CssBaseline, AppBar, Toolbar, Stack, CardContent, Link, CardActions, Tooltip,
  GlobalStyles, Paper, Pagination, Avatar, List, ListItem, ListItemButton, ListItemText, Divider,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Popover,
  Checkbox, IconButton, InputAdornment, Menu, ListItemIcon, Snackbar, Autocomplete
} from '@mui/material';

import GitHubIcon from '@mui/icons-material/GitHub';
import AddIcon from '@mui/icons-material/Add';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DehazeIcon from '@mui/icons-material/Dehaze';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import ClearIcon from '@mui/icons-material/Clear';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BackupIcon from '@mui/icons-material/Backup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// Vite injects this at build time via define in vite.config.ts
// Declare it for TypeScript to avoid "Cannot find name '__APP_VERSION__'"
declare const __APP_VERSION__: string;

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import AnalyticsDashboard from './AnalyticsDashboard';
import ShareModal from './ShareModal';


// Dynamic API URL that adapts to the current host and port
// In development, frontend runs on 5173 but backend (Docker) runs on 4000
const isDevelopment = window.location.port === '5173';
const backendPort = isDevelopment ? '4000' : window.location.port;
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${backendPort}`;
axios.defaults.withCredentials = true;


// --- Helpers ---

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} years ago`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} months ago`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} days ago`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} hours ago`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minutes ago`;
  return `${Math.floor(seconds)} seconds ago`;
};

const getLanguageColor = (lang) => {
  if (!lang) return '#ccc';
  let hash = 0;
  for (let i = 0; i < lang.length; i++) {
    hash = lang.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// --- Theme Definitions ---

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
        primary: { main: '#58a6ff' },
        background: { default: '#0d1117', paper: '#161b22' },
        text: { primary: '#c9d1d9', secondary: '#8b949e' },
      }
      : {
        primary: { main: '#1976d2' },
        background: { default: '#f4f6f8', paper: '#ffffff' },
        text: { primary: '#212B36', secondary: '#637381' },
      }),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        }
      }
    }
  },
});

const GlobalAppStyles = () => (
  <GlobalStyles styles={(theme) => ({
    '*::-webkit-scrollbar': { width: '8px' },
    '*::-webkit-scrollbar-track': { background: theme.palette.background.default },
    '*::-webkit-scrollbar-thumb': { background: theme.palette.divider, borderRadius: '4px' },
    '*::-webkit-scrollbar-thumb:hover': { background: theme.palette.text.secondary },
    '@keyframes pulse': {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 1 }
    },
    // Markdown Styles
    '.markdown-body': {
      color: theme.palette.text.primary,
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
      fontSize: '16px',
      lineHeight: 1.5,
      wordWrap: 'break-word',
    },
    '.markdown-body h1, .markdown-body h2': {
      borderBottom: `1px solid ${theme.palette.divider}`,
      paddingBottom: '0.3em',
    },
    '.markdown-body a': {
      color: theme.palette.primary.main,
      textDecoration: 'none',
    },
    '.markdown-body a:hover': {
      textDecoration: 'underline',
    },
    '.markdown-body table': {
      borderSpacing: 0,
      borderCollapse: 'collapse',
      width: '100%',
      marginBottom: '16px',
      display: 'block',
      overflow: 'auto',
    },
    '.markdown-body table th, .markdown-body table td': {
      padding: '6px 13px',
      border: `1px solid ${theme.palette.divider}`,
    },
    '.markdown-body table th': {
      fontWeight: 600,
      backgroundColor: theme.palette.mode === 'dark' ? '#161b22' : '#f6f8fa',
    },
    '.markdown-body table tr': {
      backgroundColor: theme.palette.background.paper,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
    '.markdown-body table tr:nth-of-type(2n)': {
      backgroundColor: theme.palette.mode === 'dark' ? '#0d1117' : '#f6f8fa',
    },
    '.markdown-body img': {
      maxWidth: '100%',
      boxSizing: 'content-box',
      backgroundColor: theme.palette.background.paper, // Fix transparency issues in dark mode
    },
    '.markdown-body blockquote': {
      padding: '0 1em',
      color: theme.palette.text.secondary,
      borderLeft: `0.25em solid ${theme.palette.divider}`,
      marginTop: 0,
      marginBottom: '16px',
    },
    '.markdown-body code': {
      padding: '0.2em 0.4em',
      margin: 0,
      fontSize: '85%',
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(110,118,129,0.4)' : 'rgba(175,184,193,0.2)',
      borderRadius: '6px',
      fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace',
    },
    '.markdown-body pre': {
      padding: '16px',
      overflow: 'auto',
      fontSize: '85%',
      lineHeight: 1.45,
      backgroundColor: theme.palette.mode === 'dark' ? '#161b22' : '#f6f8fa',
      borderRadius: '6px',
    },
    '.markdown-body pre code': {
      padding: 0,
      margin: 0,
      fontSize: '100%',
      wordBreak: 'normal',
      whiteSpace: 'pre',
      background: 'transparent',
      border: 0,
    }
  })} />
);


// --- Components ---
const cardActionButtonStyle = (theme) => ({
  transition: theme.transitions.create(['box-shadow', 'border-color']),
  '&:hover, &:focus': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${theme.palette.mode === 'dark' ? 'rgba(88, 166, 255, 0.25)' : 'rgba(25, 118, 210, 0.25)'}`,
  },
});

const filterButtonStyle = (theme) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#21262d' : '#f6f8fa',
  color: 'text.primary',
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? 'rgba(240, 246, 252, 0.1)' : 'rgba(27, 31, 36, 0.15)',
  boxShadow: 'none',
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  '&:hover, &:focus': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${theme.palette.mode === 'dark' ? 'rgba(88, 166, 255, 0.25)' : 'rgba(25, 118, 210, 0.25)'}`,
  },
});

function RepoFilters({ filters, onFiltersChange, languages, onForceSync }) {
  const [typeAnchor, setTypeAnchor] = useState(null);
  const [langAnchor, setLangAnchor] = useState(null);
  const [sortAnchor, setSortAnchor] = useState(null);

  const handleFilterChange = async (key, value) => {
    // Close all menus first
    setTypeAnchor(null);
    setLangAnchor(null);
    setSortAnchor(null);

    // Update filters immediately
    onFiltersChange(prev => ({ ...prev, [key]: value }));

    // If sorting by "recently-active", automatically sync to get latest data
    if (key === 'sort' && value === 'recently-active') {
      // The sync will be triggered by the parent component when it detects the filter change
      // We don't need to call onForceSync here as it will cause UI issues
    }

    // Do not force sync for other filters to avoid race conditions
  };

  // No silent sync; syncing is manual via the button to avoid filter race conditions

  const sortOptions = {
    'recently-starred': 'Recently starred',
    'recently-active': 'Recently active',
    'stars-desc': 'Most stars',
    'name-asc': 'Name (A-Z)',
    'has-backups': 'Has backups',
  };

  const typeOptions = {
    'all': 'All',
    'public': 'Public',
    'private': 'Private',
    'sources': 'Sources',
    'forks': 'Forks',
    'mirrors': 'Mirrors',
    'templates': 'Templates',
  };

  return (
    <Stack direction="row" spacing={1}>
      {/* Type Filter */}
      <Button sx={filterButtonStyle} size="small" endIcon={<ArrowDropDownIcon />} onClick={(e) => setTypeAnchor(e.currentTarget)}>
        <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', mr: 0.5 }}>Type:</Typography>
        <Typography component="span" sx={{ fontWeight: 600 }}>{typeOptions[filters.type]}</Typography>
      </Button>
      <Menu anchorEl={typeAnchor} open={Boolean(typeAnchor)} onClose={() => setTypeAnchor(null)}>
        {Object.entries(typeOptions).map(([key, value]) => (
          <MenuItem key={key} selected={filters.type === key} onClick={() => handleFilterChange('type', key)}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {filters.type === key && <CheckIcon fontSize="small" />}
            </ListItemIcon>
            {value}
          </MenuItem>
        ))}
      </Menu>

      {/* Language Filter */}
      <Button sx={filterButtonStyle} size="small" endIcon={<ArrowDropDownIcon />} onClick={(e) => setLangAnchor(e.currentTarget)}>
        <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', mr: 0.5 }}>Language</Typography>
        {filters.language !== 'all' && (
          <Typography component="span" sx={{ fontWeight: 600 }}>: {filters.language}</Typography>
        )}
      </Button>
      <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)} PaperProps={{ style: { maxHeight: 300 } }}>
        <MenuItem selected={filters.language === 'all'} onClick={() => handleFilterChange('language', 'all')}>All languages</MenuItem>
        {languages.map(lang => (
          <MenuItem key={lang} selected={filters.language === lang} onClick={() => handleFilterChange('language', lang)}>{lang}</MenuItem>
        ))}
      </Menu>

      {/* Sort Filter */}
      <Button sx={filterButtonStyle} size="small" endIcon={<ArrowDropDownIcon />} onClick={(e) => setSortAnchor(e.currentTarget)}>
        <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary', mr: 0.5 }}>Sort by:</Typography>
        <Typography component="span" sx={{ fontWeight: 600 }}>{sortOptions[filters.sort]}</Typography>
      </Button>
      <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
        {Object.entries(sortOptions).map(([key, value]) => (
          <MenuItem key={key} selected={filters.sort === key} onClick={() => handleFilterChange('sort', key)}>{value}</MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}


function ListManagementPopover({ repo, lists, open, anchorEl, onClose, onMoveRepo, onCreateList }) {
  const [search, setSearch] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const filteredLists = useMemo(() => {
    return lists.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [lists, search]);

  const handleToggleList = (listId) => {
    onMoveRepo(repo.id, listId);
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const newList = await onCreateList(newListName.trim());
      if (newList && newList.id) {
        onMoveRepo(repo.id, newList.id);
        setNewListName('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Paper sx={{ width: 300, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Add to list...</Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search lists..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              search && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="clear search"
                    onClick={() => setSearch('')}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            )
          }}
          sx={{ mb: 1 }}
        />
        <List dense sx={{ maxHeight: 200, overflowY: 'auto', minHeight: 50 }}>
          {filteredLists.length > 0 ? (
            filteredLists.map(list => (
              <ListItem key={list.id} disablePadding>
                <ListItemButton onClick={() => handleToggleList(list.id)}>
                  <Checkbox
                    edge="start"
                    checked={repo.listIds?.includes(list.id) ?? false}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemText primary={list.name} />
                </ListItemButton>
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText
                secondary={lists.length === 0 ? "No lists exist yet." : "No lists match your search."}
                sx={{ textAlign: 'center', color: 'text.secondary' }}
              />
            </ListItem>
          )}
        </List>
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Create new list..."
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleCreateAndAdd()}
            disabled={isCreating}
          />
          <IconButton onClick={handleCreateAndAdd} size="small" sx={{ border: '1px solid grey', borderRadius: 1 }} disabled={isCreating || !newListName.trim()}>
            {isCreating ? <CircularProgress size={16} /> : <AddIcon />}
          </IconButton>
        </Stack>
      </Paper>
    </Popover>
  );
}

const PreBlock = ({ children, node, ...props }) => {
  const [copied, setCopied] = useState(false);
  const preRef = useRef(null);

  const handleCopy = () => {
    if (preRef.current) {
      const text = preRef.current.innerText;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box sx={{ position: 'relative', mb: 2, '&:hover .copy-button': { opacity: 1 } }}>
      <Box
        component="pre"
        ref={preRef}
        sx={{
          m: 0,
          p: 2,
          borderRadius: 1,
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#161b22' : '#f6f8fa',
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
          '& code': {
            backgroundColor: 'transparent !important',
            p: 0,
            border: 'none',
          }
        }}
        {...props}
      >
        {children}
      </Box>
      <IconButton
        className="copy-button"
        onClick={handleCopy}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          opacity: 0,
          transition: 'opacity 0.2s',
          color: 'text.secondary',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'text.primary',
          }
        }}
        title="Copy code"
      >
        {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Box>
  );
};

function ReadmeViewer({ open, onClose, repo }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && repo) {
      setLoading(true);
      setError(null);
      axios.get(`${API_BASE_URL}/api/repos/${repo.id}/readme`)
        .then(res => setContent(res.data))
        .catch(err => {
          console.error("Failed to fetch readme", err);
          setError("Failed to load README. It might be missing or empty.");
        })
        .finally(() => setLoading(false));
    } else {
      setContent('');
    }
  }, [open, repo]);

  const ImageRenderer = ({ node, ...props }) => {
    let src = props.src;
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      const branch = repo.default_branch || 'main';
      const cleanPath = src.replace(/^\.?\//, '');
      src = `https://raw.githubusercontent.com/${repo.full_name}/${branch}/${cleanPath}`;
    }
    return <img {...props} src={src} style={{ maxWidth: '100%' }} />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBookIcon />
          {repo?.full_name} - README
        </Box>
        <IconButton onClick={onClose} size="small"><ClearIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center" sx={{ p: 4 }}>{error}</Typography>
        ) : (
          <Box className="markdown-body" sx={{ '& img': { maxWidth: '100%' }, '& pre': { overflow: 'auto' } }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                pre: PreBlock,
                img: ImageRenderer
              }}
            >
              {content}
            </ReactMarkdown>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<GitHubIcon />}
          href={repo?.html_url}
          target="_blank"
        >
          View on GitHub
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface RepoCardProps {
  key?: any;
  repo: any;
  lists: any[];
  onMoveRepo: (repoId: any, listId: any) => Promise<void>;
  onAddTag: (repoId: any, tag: any) => Promise<void>;
  onDeleteTag: (repoId: any, tag: any) => Promise<void>;
  onSuggestTags: (repoId: any) => Promise<void>;
  onCreateList: (listName: any) => Promise<any>;
  onTagClick: (tag: any) => void;
  onUpdateRepo?: (updatedRepo: any) => void;
}

function RepoCard({ repo, lists, onMoveRepo, onAddTag, onDeleteTag, onSuggestTags, onCreateList, onTagClick, onUpdateRepo }: RepoCardProps) {
  const [newTag, setNewTag] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [readmeOpen, setReadmeOpen] = useState(false); // State for ReadmeViewer
  const [listMenuAnchor, setListMenuAnchor] = useState(null);
  const [latestRelease, setLatestRelease] = useState(repo.latestReleaseTag);
  const [isFetchingRelease, setIsFetchingRelease] = useState(false);
  const [backupMenuAnchor, setBackupMenuAnchor] = useState(null);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);

  useEffect(() => {
    if (repo.latestReleaseTag === undefined && !isFetchingRelease) {
      setIsFetchingRelease(true);
      axios.get(`${API_BASE_URL}/api/repos/${repo.id}/latest-release`)
        .then(response => {
          const tag = response.data.latestReleaseTag;
          setLatestRelease(tag);
          if (onUpdateRepo) {
            onUpdateRepo({ ...repo, latestReleaseTag: tag });
          }
        })
        .catch(error => {
          console.log(`Could not fetch release for ${repo.full_name}`, error);
          if (onUpdateRepo) {
            onUpdateRepo({ ...repo, latestReleaseTag: null }); // Cache null to prevent refetch
          }
        })
        .finally(() => {
          setIsFetchingRelease(false);
        });
    }
  }, [repo, onUpdateRepo, isFetchingRelease]);

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(repo.id, newTag.trim());
      setNewTag('');
    }
  };

  const handleSuggestTags = async () => {
    setIsSuggesting(true);
    try {
      await onSuggestTags(repo.id);
    } catch (e) {
      // Parent component will show an alert
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleBackup = async (event) => {
    // If backup exists, show menu
    if (repo.backup && repo.backup.status === 'success' && event) {
      setBackupMenuAnchor(event.currentTarget);
      return;
    }

    setIsBackingUp(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/repos/${repo.id}/backup`);
      if (response.data.success && onUpdateRepo) {
        onUpdateRepo({ ...repo, backup: response.data.backup });
      }
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDisableBackup = async (deleteFiles) => {
    try {
      // Use resetRecord=true to remove it from the list if deleting files or if user wants to 'forget'
      // deleteFiles=true -> delete everything
      // deleteFiles=false -> reset record (forget) but keep files
      await axios.delete(`${API_BASE_URL}/api/repos/${repo.id}/backup?resetRecord=true&deleteFiles=${deleteFiles}`);
      setDisableConfirmOpen(false);
      setBackupMenuAnchor(null);
      if (onUpdateRepo) {
        // Update local state to reflect disabled status
        onUpdateRepo({
          ...repo,
          backup: {
            ...repo.backup,
            status: 'none', // Removed from UI perspective
            scheduledUpdates: false
          }
        });
      }
    } catch (error) {
      console.error('Error disabling backup:', error);
      alert('Failed to delete backup');
    }
  };

  const getBackupButtonColor = () => {
    if (!repo.backup || repo.backup.status === 'none' || !repo.backup.status) return 'inherit';
    // Check if backup is disabled (has backup but scheduledUpdates is false)
    if (repo.backup.status === 'success' && repo.backup.scheduledUpdates === false) return 'warning';
    switch (repo.backup.status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'in_progress': return 'primary';
      default: return 'inherit';
    }
  };

  const getBackupButtonIcon = () => {
    if (isBackingUp) return <CircularProgress size={16} color="inherit" />;
    if (!repo.backup || repo.backup.status === 'none' || !repo.backup.status) return <BackupIcon />;
    // Check if backup is disabled
    if (repo.backup.status === 'success' && repo.backup.scheduledUpdates === false) return <PauseCircleIcon />;
    switch (repo.backup.status) {
      case 'success': return <CheckCircleIcon />;
      case 'error': return <ErrorIcon />;
      case 'in_progress': return <CircularProgress size={16} color="inherit" />;
      default: return <BackupIcon />;
    }
  };

  const handleTagClick = (tag) => {
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  return (
    <>
      <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar src={repo.owner.avatar_url} alt={repo.owner.login} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6" component="div">
                <Link href={repo.html_url} target="_blank" rel="noopener noreferrer" color="inherit" underline="hover">
                  {repo.full_name}
                </Link>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {repo.description}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" sx={{ flexWrap: 'wrap', gap: 2, mt: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
            {repo.language && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: getLanguageColor(repo.language) }} />
                <Typography variant="body2" component="span">{repo.language}</Typography>
              </Stack>
            )}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <StarBorderIcon sx={{ fontSize: '1rem' }} />
              <Typography variant="body2" component="span">{repo.stargazers_count.toLocaleString()}</Typography>
            </Stack>
            {repo.updated_at && (
              <Tooltip title={new Date(repo.updated_at).toLocaleString()}>
                <Typography variant="body2" component="span">
                  Updated {formatTimeAgo(repo.updated_at)}
                </Typography>
              </Tooltip>
            )}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ForkRightIcon sx={{ fontSize: '1rem' }} />
              <Typography variant="body2" component="span">{repo.forks_count.toLocaleString()}</Typography>
            </Stack>
            {latestRelease && (
              <Tooltip title="Latest Release">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <GitHubIcon sx={{ fontSize: '1rem' }} />
                  <Typography variant="body2" component="span">{latestRelease}</Typography>
                </Stack>
              </Tooltip>
            )}
            {isFetchingRelease && <CircularProgress size={12} />}
          </Stack>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2 }}>
            {(repo.aiTags || []).map(tag => (
              <Chip
                key={`ai-${tag}`}
                label={tag}
                size="small"
                variant="outlined"
                onClick={() => handleTagClick(tag)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontWeight: 'medium' }}>
              <BookmarkBorderIcon fontSize="small" /> Your Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(repo.userTags || []).map(tag => (
                <Chip
                  key={`user-${tag}`}
                  label={tag}
                  size="small"
                  onDelete={() => onDeleteTag(repo.id, tag)}
                  onClick={() => handleTagClick(tag)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <TextField
              placeholder="Add a tag..."
              size="small"
              variant="outlined"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              fullWidth
            />
            <Button onClick={handleAddTag} variant="outlined" size="small" sx={theme => ({ flexShrink: 0, ...cardActionButtonStyle(theme) })}>Add</Button>
          </Stack>
        </CardContent>
        <Divider />
        <CardActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between', backgroundColor: 'action.hover' }}>
          <Stack direction="row" spacing={1}>
            <Tooltip title="SUGGEST TAGS WITH AI">
              <span>
                <IconButton
                  onClick={handleSuggestTags}
                  disabled={isSuggesting}
                  sx={theme => ({
                    ...cardActionButtonStyle(theme),
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1
                  })}
                >
                  {isSuggesting ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="READ README">
              <IconButton
                onClick={() => setReadmeOpen(true)}
                sx={theme => ({
                  ...cardActionButtonStyle(theme),
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1
                })}
              >
                <MenuBookIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="MANAGE LISTS">
              <IconButton
                onClick={(e) => setListMenuAnchor(e.currentTarget)}
                sx={theme => ({
                  ...cardActionButtonStyle(theme),
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1
                })}
              >
                <DehazeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                isBackingUp ? 'Backup in progress...' :
                  !repo.backup || repo.backup.status === 'none' || !repo.backup.status ? 'Click to backup this repository' :
                    repo.backup.status === 'success' && repo.backup.scheduledUpdates === false ? `Backup exists but auto-backups disabled${repo.backup.versions?.length > 1 ? ` (${repo.backup.versions.length} versions)` : ''}` :
                      repo.backup.status === 'success' ? `Backed up ${repo.backup.lastBackup ? formatTimeAgo(repo.backup.lastBackup) : 'recently'}${repo.backup.versions?.length > 1 ? ` (${repo.backup.versions.length} versions)` : ''}` :
                        repo.backup.status === 'error' ? 'Backup failed - click to retry' :
                          repo.backup.status === 'in_progress' ? 'Backup in progress...' :
                            'Click to backup this repository'
              }
            >
              <IconButton
                color={getBackupButtonColor()}
                onClick={handleBackup}
                disabled={isBackingUp}
                sx={theme => ({
                  ...cardActionButtonStyle(theme),
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1
                })}
              >
                {getBackupButtonIcon()}
              </IconButton>
            </Tooltip>
          </Stack>
        </CardActions>
      </Card>
      <ListManagementPopover
        repo={repo}
        lists={lists}
        open={Boolean(listMenuAnchor)}
        anchorEl={listMenuAnchor}
        onClose={() => setListMenuAnchor(null)}
        onMoveRepo={(repoId, listId) => {
          onMoveRepo(repoId, listId);
          // Don't close popover, allows for multiple changes
        }}
        onCreateList={onCreateList}
      />
      <Menu
        anchorEl={backupMenuAnchor}
        open={Boolean(backupMenuAnchor)}
        onClose={() => setBackupMenuAnchor(null)}
      >
        {repo.backup?.scheduledUpdates === false && (
          <MenuItem onClick={async () => {
            setBackupMenuAnchor(null);
            try {
              await axios.post(`${API_BASE_URL}/api/repos/${repo.id}/backup/enable-auto-updates`);
              if (onUpdateRepo) {
                onUpdateRepo({
                  ...repo,
                  backup: {
                    ...repo.backup,
                    scheduledUpdates: true
                  }
                });
              }
            } catch (error) {
              console.error('Error enabling auto-updates:', error);
              alert('Failed to enable auto-updates');
            }
          }}>
            Enable Auto-Backups
          </MenuItem>
        )}
        {repo.backup?.scheduledUpdates !== false && (
          <MenuItem onClick={() => {
            setBackupMenuAnchor(null);
            setDisableConfirmOpen(true);
          }}>
            Disable Backup
          </MenuItem>
        )}
      </Menu>

      <Dialog open={disableConfirmOpen} onClose={() => setDisableConfirmOpen(false)}>
        <DialogTitle>Delete Backup?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to delete the backup for "{repo.full_name}"?
            <br /><br />
            You can remove the repository from this list but keep the files on your disk, or delete everything.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableConfirmOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDisableBackup(false)} color="inherit">
            Remove & Keep Files
          </Button>
          <Button onClick={() => handleDisableBackup(true)} color="error" variant="contained" autoFocus>
            Delete Everything
          </Button>
        </DialogActions>
      </Dialog>
      <ReadmeViewer
        open={readmeOpen}
        onClose={() => setReadmeOpen(false)}
        repo={repo}
      />
    </>
  );
}

// --- Pages ---

function HomePage({ dataVersion, onForceSync, onSuggestSyncActiveChange }) {
  const [repos, setRepos] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Initialize filters from localStorage or default
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('starwise-filters');
      return saved ? JSON.parse(saved) : { type: 'all', language: 'all', sort: 'recently-starred' };
    } catch {
      return { type: 'all', language: 'all', sort: 'recently-starred' };
    }
  });

  const [languages, setLanguages] = useState([]);
  const filtersRef = useRef(filters);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);


  // Update filtersRef and save to localStorage whenever filters change
  useEffect(() => {
    filtersRef.current = filters;
    localStorage.setItem('starwise-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/languages`);
        setLanguages(res.data);
      } catch (e) {
        console.error("Failed to fetch languages", e);
      }
    };
    fetchLanguages();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // Notify parent (App) to suggest sync when "Recently active" is selected
  useEffect(() => {
    if (typeof onSuggestSyncActiveChange === 'function') {
      onSuggestSyncActiveChange(filters.sort === 'recently-active');

      // If "recently active" is selected, trigger background sync
      if (filters.sort === 'recently-active') {
        // Trigger background sync through parent component
        // We'll use a small delay to ensure state is updated
        setTimeout(() => {
          const event = new CustomEvent('triggerBackgroundSync');
          window.dispatchEvent(event);
        }, 100);
      }
    }
  }, [filters.sort, onSuggestSyncActiveChange]);

  const fetchRepos = useCallback(async (pageNum, searchTermParam, currentFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '9',
        search: searchTermParam,
        type: currentFilters.type,
        language: currentFilters.language,
        sort: currentFilters.sort,
      });
      const res = await axios.get(`${API_BASE_URL}/api/repos?${params.toString()}`);
      setRepos(res.data.repos);
      setTotalPages(res.data.totalPages);
      setPage(res.data.currentPage);
    } catch (e) {
      setError('Failed to fetch repositories.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/lists`);
      setLists(res.data);
    } catch (e) { console.error('Failed to fetch lists', e); }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists, dataVersion]);

  useEffect(() => {
    fetchRepos(1, debouncedSearch, filters);
  }, [debouncedSearch, filters, fetchRepos]);

  // When dataVersion changes (e.g., after a sync), refetch unless we're on 'recently-active'
  // This avoids overriding the user's choice immediately after selecting that sort.
  useEffect(() => {
    if (dataVersion > 0) {
      // Always refetch when dataVersion changes, even for 'recently-active'
      // This ensures we get the latest data after syncing
      fetchRepos(1, debouncedSearch, filters);
    }
  }, [dataVersion, filters.sort, debouncedSearch, fetchRepos]);

  const updateRepoInState = (updatedRepo) => {
    setRepos(currentRepos => currentRepos.map(r => r.id === updatedRepo.id ? updatedRepo : r));
  };

  const handleMoveRepo = async (repoId, listId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/repos/${repoId}/move`, { listId });
      updateRepoInState(res.data);
      fetchLists();
    } catch (e) { alert('Failed to move repo'); }
  };

  const handleAddTag = async (repoId, tag) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/repos/${repoId}/tags`, { tag });
      updateRepoInState(res.data);
    } catch (e) { alert('Failed to add tag'); }
  };

  const onDeleteTag = async (repoId, tag) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/repos/${repoId}/tags`, { data: { tag } });
      updateRepoInState(res.data);
    } catch (e) { alert('Failed to delete tag'); }
  }

  const handleSuggestTags = async (repoId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/repos/${repoId}/suggest-tags`);
      updateRepoInState(res.data);
    } catch (e) {
      alert('Failed to suggest new tags.');
      console.error('Failed to suggest tags', e);
    }
  };

  const handleCreateList = async (listName) => {
    if (!listName.trim()) return null;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/lists`, { name: listName });
      fetchLists();
      return res.data;
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create list');
      return null;
    }
  };

  const handlePageChange = (event, value) => {
    fetchRepos(value, debouncedSearch, filters);
  };

  const handleTagClick = (tag) => {
    setSearchInput(tag);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Search stars"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchInput && (
                  <IconButton
                    aria-label="clear search"
                    onClick={() => setSearchInput('')}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                )}
              </InputAdornment>
            )
          }}
          sx={(theme) => ({
            width: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: '6px',
              transition: theme.transitions.create(['box-shadow', 'border-color']),
              '& fieldset': {
                borderColor: theme.palette.mode === 'dark' ? 'rgba(240, 246, 252, 0.1)' : 'rgba(27, 31, 36, 0.15)',
              },
              '&:hover, &.Mui-focused': {
                boxShadow: `0 0 0 3px ${theme.palette.mode === 'dark' ? 'rgba(88, 166, 255, 0.25)' : 'rgba(25, 118, 210, 0.25)'}`,
                '& fieldset': {
                  borderColor: theme.palette.primary.main,
                }
              },
            },
          })}
        />
        <RepoFilters filters={filters} onFiltersChange={setFilters} languages={languages} onForceSync={onForceSync} />
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>}
      {error && <Typography color="error">{error}</Typography>}

      {!loading && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {repos.map(repo => (
              <RepoCard key={repo.id} repo={repo} lists={lists} onMoveRepo={handleMoveRepo} onAddTag={handleAddTag} onDeleteTag={onDeleteTag} onSuggestTags={handleSuggestTags} onCreateList={handleCreateList} onTagClick={handleTagClick} onUpdateRepo={updateRepoInState} />
            ))}
          </Box>
          {repos.length === 0 && <Typography sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>No repositories found. Try syncing your stars or refining your search.</Typography>}
          {totalPages > 1 && (
            <Stack spacing={2} sx={{ mt: 4, alignItems: 'center' }}>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} />
            </Stack>
          )}
        </>
      )}
    </Container>
  );
}

function ListsPage({ dataVersion, onForceSync, onSuggestSyncActiveChange }) {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [repos, setRepos] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isCreateListDialogOpen, setCreateListDialogOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('name-asc');

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ type: 'all', language: 'all', sort: 'recently-starred' });
  const [languages, setLanguages] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // State for editing/deleting lists
  const [editMenuAnchor, setEditMenuAnchor] = useState(null);
  const [listInFocus, setListInFocus] = useState(null);
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const fetchLists = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/lists`);
      setLists(res.data);
    } catch (e) { console.error(e); }
  }, []);

  // Notify parent (App) to suggest sync when "Recently active" is selected
  useEffect(() => {
    if (typeof onSuggestSyncActiveChange === 'function') {
      onSuggestSyncActiveChange(filters.sort === 'recently-active');

      // If "recently active" is selected, trigger background sync
      if (filters.sort === 'recently-active') {
        setTimeout(() => {
          const event = new CustomEvent('triggerBackgroundSync');
          window.dispatchEvent(event);
        }, 100);
      }
    }
  }, [filters.sort, onSuggestSyncActiveChange]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/languages`);
        setLanguages(res.data);
      } catch (e) { console.error("Failed to fetch languages", e); }
    };
    fetchLanguages();
    fetchLists();
  }, [fetchLists, dataVersion]);

  const sortedLists = useMemo(() => {
    const sorted = [...lists];
    const [sortBy, sortDir] = sortOrder.split('-');

    sorted.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'count') return a.repoCount - b.repoCount;
      return 0;
    });

    if (sortDir === 'desc') sorted.reverse();

    return sorted;
  }, [lists, sortOrder]);

  const fetchReposForList = useCallback(async (listId, pageNum = 1, searchTermParam = '', currentFilters) => {
    if (!listId) {
      setRepos([]);
      setTotalPages(0);
      return;
    };
    setLoadingRepos(true);
    try {
      const params = new URLSearchParams({
        listId: String(listId),
        page: String(pageNum),
        limit: '6',
        search: searchTermParam,
        type: currentFilters.type,
        language: currentFilters.language,
        sort: currentFilters.sort,
      });
      const res = await axios.get(`${API_BASE_URL}/api/repos?${params.toString()}`);
      setRepos(res.data.repos);
      setTotalPages(res.data.totalPages);
      setPage(res.data.currentPage);
    } catch (e) {
      console.error('Failed to fetch repos for list', e);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  useEffect(() => {
    if (selectedListId) {
      fetchReposForList(selectedListId, 1, debouncedSearch, filters);
    } else {
      setRepos([]);
      setTotalPages(0);
      setPage(1);
    }
  }, [selectedListId, debouncedSearch, filters, fetchReposForList, dataVersion]);

  const handleListClick = (listId) => {
    setSelectedListId(listId);
    setSearchInput('');
    setPage(1);
    // Preserve current sort; only reset type and language
    setFilters(prev => ({ ...prev, type: 'all', language: 'all' }));
  };

  const handleTagClick = (tag) => {
    setSearchInput(tag);
  };

  const handleCreateList = async (name) => {
    const listName = name || newListName;
    if (!listName.trim()) return null;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/lists`, { name: listName.trim() });
      setNewListName('');
      fetchLists();
      setCreateListDialogOpen(false);
      return res.data;
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create list');
      return null;
    }
  };

  const updateRepoInState = (updatedRepo) => {
    setRepos(currentRepos => currentRepos.map(r => r.id === updatedRepo.id ? updatedRepo : r));
  };

  const handleMoveRepo = async (repoId, listId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/repos/${repoId}/move`, { listId });
      const updatedRepo = res.data;

      if (selectedListId && !updatedRepo.listIds?.includes(selectedListId)) {
        setRepos(currentRepos => currentRepos.filter(r => r.id !== repoId));
      } else {
        updateRepoInState(updatedRepo);
      }
      fetchLists();
    } catch (e) { alert('Failed to move repo'); }
  };

  const handleAddTag = async (repoId, tag) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/repos/${repoId}/tags`, { tag });
      updateRepoInState(res.data);
    } catch (e) { alert('Failed to add tag'); }
  };

  const onDeleteTag = async (repoId, tag) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/repos/${repoId}/tags`, { data: { tag } });
      updateRepoInState(res.data);
    } catch (e) { alert('Failed to delete tag'); }
  }

  const handleSuggestTags = async (repoId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/repos/${repoId}/suggest-tags`);
      updateRepoInState(res.data);
    } catch (e) {
      alert('Failed to suggest new tags.');
      console.error('Failed to suggest tags', e);
    }
  };

  const handlePageChange = (event, value) => {
    fetchReposForList(selectedListId, value, debouncedSearch, filters);
  };

  // --- List Edit/Delete Handlers ---

  const handleRenameList = async () => {
    if (!renameValue.trim() || !listInFocus) return;
    try {
      await axios.put(`${API_BASE_URL}/api/lists/${listInFocus.id}`, { name: renameValue.trim() });
      fetchLists(); // This will re-render the list with the new name
      setRenameDialogOpen(false);
      setListInFocus(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to rename list');
    }
  };

  const handleDeleteList = async () => {
    if (!listInFocus) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/lists/${listInFocus.id}`);
      if (selectedListId === listInFocus.id) {
        setSelectedListId(null); // Clear selection if the active list is deleted
      }
      fetchLists();
      setDeleteDialogOpen(false);
      setListInFocus(null);
    } catch (e) {
      alert('Failed to delete list');
    }
  };

  const openEditMenu = (event, list) => {
    setEditMenuAnchor(event.currentTarget);
    setListInFocus(list);
  };

  const closeEditMenu = () => {
    setEditMenuAnchor(null);
    // Do not set listInFocus to null here, dialogs need it
  };

  // State for Share Modal
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [listToShare, setListToShare] = useState(null);

  const handleShareList = () => {
    if (listInFocus) {
      setListToShare(listInFocus);
      setShareModalOpen(true);
      closeEditMenu();
    }
  };

  const selectedList = useMemo(() => lists.find(l => l.id === selectedListId), [lists, selectedListId]);

  return (
    <>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Your Lists</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Organize your starred repositories into custom lists, synced from your GitHub account.</Typography>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '350px 1fr' }} gap={4}>
          <Paper elevation={0} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 1 }}>
              <Typography variant="h6">Lists ({lists.length})</Typography>
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel id="list-sort-label">Sort</InputLabel>
                  <Select
                    id="list-sort-select"
                    labelId="list-sort-label"
                    value={sortOrder}
                    label="Sort"
                    onChange={e => setSortOrder(e.target.value)}
                  >
                    <MenuItem value="name-asc">Name</MenuItem>
                    <MenuItem value="count-desc">Repos</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" onClick={() => setCreateListDialogOpen(true)}>Create list</Button>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <List sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '60vh' }}>
              {sortedLists.length > 0 ? (
                sortedLists.map(list => (
                  <ListItem key={list.id} secondaryAction={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {list.repoCount}
                      </Typography>
                      <IconButton edge="end" aria-label="options" onClick={(e) => openEditMenu(e, list)}>
                        <MoreVertIcon />
                      </IconButton>
                    </Stack>
                  } disablePadding>
                    <ListItemButton selected={selectedListId === list.id} onClick={() => handleListClick(list.id)}>
                      <ListItemText primary={list.name} />
                    </ListItemButton>
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No lists found"
                    secondary="Click 'Sync GitHub Stars' to fetch your lists from GitHub."
                    sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
          <Box>
            {selectedList ? (
              <>
                <Typography variant="h5" gutterBottom>Repositories in "{selectedList.name}"</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search stars"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          {searchInput && (
                            <IconButton
                              aria-label="clear search"
                              onClick={() => setSearchInput('')}
                              edge="end"
                              size="small"
                            >
                              <ClearIcon />
                            </IconButton>
                          )}
                        </InputAdornment>
                      )
                    }}
                    sx={(theme) => ({
                      width: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        transition: theme.transitions.create(['box-shadow', 'border-color']),
                        '& fieldset': {
                          borderColor: theme.palette.mode === 'dark' ? 'rgba(240, 246, 252, 0.1)' : 'rgba(27, 31, 36, 0.15)',
                        },
                        '&:hover, &.Mui-focused': {
                          boxShadow: `0 0 0 3px ${theme.palette.mode === 'dark' ? 'rgba(88, 166, 255, 0.25)' : 'rgba(25, 118, 210, 0.25)'}`,
                          '& fieldset': {
                            borderColor: theme.palette.primary.main,
                          },
                        },
                      },
                    })}
                  />
                  <RepoFilters filters={filters} onFiltersChange={setFilters} languages={languages} onForceSync={onForceSync} />
                </Box>
              </>
            ) : <Typography variant="h5" color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>Select a list to view its repositories</Typography>}

            {loadingRepos && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>}

            {!loadingRepos && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
                  {repos.map(repo => (
                    <RepoCard key={repo.id} repo={repo} lists={lists} onMoveRepo={handleMoveRepo} onAddTag={handleAddTag} onDeleteTag={onDeleteTag} onSuggestTags={handleSuggestTags} onCreateList={handleCreateList} onTagClick={handleTagClick} onUpdateRepo={updateRepoInState} />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} />
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Container>

      {/* Create List Dialog */}
      <Dialog open={isCreateListDialogOpen} onClose={() => setCreateListDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create a new list</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This list will be saved locally within the application.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="List Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateList(newListName)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateListDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleCreateList(newListName)}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* List Options Menu */}
      <Menu anchorEl={editMenuAnchor} open={Boolean(editMenuAnchor)} onClose={closeEditMenu}>
        <MenuItem onClick={() => { setRenameDialogOpen(true); setRenameValue(listInFocus?.name || ''); closeEditMenu(); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          Rename
        </MenuItem>
        <MenuItem onClick={() => { setDeleteDialogOpen(true); closeEditMenu(); }}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          Delete
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleShareList}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          Share Stack
        </MenuItem>
      </Menu>

      <ShareModal
        open={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
        list={listToShare}
      />

      {/* Rename List Dialog */}
      <Dialog open={isRenameDialogOpen} onClose={() => setRenameDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New List Name"
            type="text"
            fullWidth
            variant="outlined"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRenameList()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameList}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete List Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete "{listInFocus?.name}"?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the list. Repositories will not be deleted, only unassigned from this list.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteList} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

    </>
  );
}

function SelectiveExportDialog({ open, onClose, lists }) {
  const [selectedLists, setSelectedLists] = useState([]);

  useEffect(() => {
    // Reset selection when dialog is closed
    if (!open) {
      setSelectedLists([]);
    }
  }, [open]);

  const handleToggle = (listId) => {
    const currentIndex = selectedLists.indexOf(listId);
    const newSelected = [...selectedLists];

    if (currentIndex === -1) {
      newSelected.push(listId);
    } else {
      newSelected.splice(currentIndex, 1);
    }
    setSelectedLists(newSelected);
  };

  const handleExport = async () => {
    if (selectedLists.length === 0) {
      alert("Please select at least one list to export.");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/export/selective`, {
        listIds: selectedLists
      }, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'starwise_selective_backup.json');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error("Selective export failed", error);
      alert("Failed to export selected lists.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Selective Export</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Select the lists you want to export. Only repositories belonging to these lists will be included in the export file.
        </DialogContentText>
        <List dense>
          {lists.map(list => (
            <ListItem key={list.id} disablePadding>
              <ListItemButton onClick={() => handleToggle(list.id)}>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedLists.indexOf(list.id) !== -1}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText primary={list.name} secondary={`${list.repoCount} repos`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleExport} variant="contained" disabled={selectedLists.length === 0}>
          Export Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/backups`);
      setBackups(res.data);
    } catch (err) {
      console.error('Error fetching backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBackupSchedule = async (repo) => {
    const newStatus = !repo.backup.scheduledUpdates;
    try {
      await axios.patch(`${API_BASE_URL}/api/repos/${repo.id}/backup/schedule`, { enabled: newStatus });
      // Optimistic update or refresh
      fetchBackups();
    } catch (err) {
      console.error('Error toggling schedule:', err);
      alert('Failed to update schedule');
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleManageVersions = (repo) => {
    setSelectedRepo(repo);
    setVersionsDialogOpen(true);
  };

  const handleDownloadVersion = async (filename) => {
    if (!selectedRepo) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/repos/${selectedRepo.id}/backup/${filename}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Error downloading backup:', err);
      alert('Failed to download backup');
    }
  };

  const handleDeleteVersion = async (filename) => {
    if (!selectedRepo) return;
    if (!confirm(`Delete backup version "${filename}"?`)) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/repos/${selectedRepo.id}/backup/${filename}`);
      // Refresh the selected repo data
      const res = await axios.get(`${API_BASE_URL}/api/backups`);
      const updatedRepo = res.data.find(r => r.id === selectedRepo.id);
      setSelectedRepo(updatedRepo);
      setBackups(res.data);
    } catch (err) {
      console.error('Error deleting backup version:', err);
      alert('Failed to delete backup version');
    }
  };

  const handleDeleteBackup = async (deleteFiles) => {
    if (!repoToDelete) return;

    try {
      // Use resetRecord=true to remove it from the list. 
      // deleteFiles=true deletes files + remove record.
      // deleteFiles=false deletes record + keeps files.
      await axios.delete(`${API_BASE_URL}/api/repos/${repoToDelete.id}/backup?resetRecord=true&deleteFiles=${deleteFiles}`);
      setConfirmDeleteOpen(false);
      setRepoToDelete(null);
      fetchBackups(); // Refresh list
    } catch (err) {
      console.error('Error deleting backup:', err);
      alert('Failed to delete backup');
    }
  };

  const openDeleteConfirm = (repo) => {
    setRepoToDelete(repo);
    setConfirmDeleteOpen(true);
  };

  const getTotalStorage = () => {
    let total = 0;
    if (!Array.isArray(backups)) return '0.0';
    backups.forEach(repo => {
      repo.backup?.versions?.forEach(v => {
        total += v.size || 0;
      });
    });
    return (total / 1024 / 1024).toFixed(1); // MB
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <BackupIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Backups
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Manage your repository backups. {backups.length} repositories backed up • {getTotalStorage()} MB total storage
        </Typography>
        <TextField
          fullWidth
          placeholder="Search backups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {backups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BackupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Backups Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start backing up repositories from the home page.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {(backups || [])
            .filter(repo =>
              repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map(repo => (
              <Card key={repo.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="div">
                        <Link href={repo.html_url} target="_blank" rel="noopener" sx={{ textDecoration: 'none', color: 'inherit' }}>
                          {repo.full_name}
                        </Link>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {repo.description || 'No description'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={repo.backup.status === 'success' ? 'Backed Up' : repo.backup.status}
                          color={repo.backup.status === 'success' ? 'success' : 'default'}
                          icon={repo.backup.status === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
                        />
                        {repo.backup.scheduledUpdates === false && (
                          <Chip
                            size="small"
                            label="Auto-backups Disabled"
                            color="warning"
                            icon={<PauseCircleIcon />}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {repo.backup.versions?.length || 0} versions • Last backup: {repo.backup.lastBackup ? formatTimeAgo(repo.backup.lastBackup) : 'Never'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                      <IconButton
                        size="small"
                        onClick={() => toggleBackupSchedule(repo)}
                        color={repo.backup.scheduledUpdates ? 'success' : 'warning'}
                        title={repo.backup.scheduledUpdates ? "Disable Auto-Backups" : "Enable Auto-Backups"}
                      >
                        {repo.backup.scheduledUpdates ? <PauseCircleIcon /> : <PlayArrowIcon />}
                      </IconButton>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleManageVersions(repo)}
                      >
                        Versions
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => openDeleteConfirm(repo)}
                        title="Delete Backup"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
        </Box>
      )}

      {/* Versions Dialog */}
      <Dialog open={versionsDialogOpen} onClose={() => setVersionsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Backup Versions - {selectedRepo?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          {selectedRepo?.backup?.versions?.length === 0 ? (
            <Typography color="text.secondary">No backup versions found.</Typography>
          ) : (
            <List>
              {selectedRepo?.backup?.versions?.map((version, index) => (
                <React.Fragment key={version.versionId}>
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleDownloadVersion(version.filename)}
                        >
                          Download
                        </Button>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleDeleteVersion(version.filename)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={version.filename}
                      secondary={`${version.fileSize} • Created ${formatTimeAgo(version.createdAt)}`}
                    />
                  </ListItem>
                  {index < selectedRepo.backup.versions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Delete Backup?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to delete the backup for "{repoToDelete?.full_name}"?
            <br /><br />
            You can remove the repository from this list but keep the files on your disk, or delete everything.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={() => handleDeleteBackup(false)} color="inherit">
            Remove & Keep Files
          </Button>
          <Button onClick={() => handleDeleteBackup(true)} color="error" variant="contained" autoFocus>
            Delete Everything
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}


function SettingsDialog({ open, onClose, currentProvider: initialProvider, onProviderChange }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(initialProvider);
  const [openRouterModels, setOpenRouterModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [enableRateLimitRetry, setEnableRateLimitRetry] = useState(true);

  useEffect(() => {
    if (open) {
      fetchProviders();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProvider === 'openrouter') {
      fetchOpenRouterModels();
    }
  }, [selectedProvider]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/ai/providers`);
      // Handle both old array format and new object format
      if (Array.isArray(res.data)) {
        setProviders(res.data);
      } else {
        setProviders(res.data.providers || []);
        setSelectedProvider(res.data.currentProvider);
        if (res.data.currentModel) {
          setSelectedModel(res.data.currentModel);
        }
        if (typeof res.data.enableRateLimitRetry === 'boolean') {
          setEnableRateLimitRetry(res.data.enableRateLimitRetry);
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers', error);
      // Fallback
      setProviders([
        { name: 'gemini', displayName: 'Google Gemini', description: 'Fast and accurate tagging with Gemini 2.5 Flash' },
        { name: 'openai', displayName: 'OpenAI GPT-4', description: 'Advanced reasoning with GPT-4' },
        { name: 'anthropic', displayName: 'Anthropic Claude', description: 'Strong technical analysis with Claude' },
        { name: 'openrouter', displayName: 'OpenRouter', description: 'Access various models via OpenRouter' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenRouterModels = async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/openrouter/models`);
      setOpenRouterModels(res.data);
      if (!selectedModel && res.data.length > 0) {
        // Default to the first one or a specific one if possible, but let's just pick 0 or keep empty
        // Usually good to have a default if none selected.
        // Let's try to find our default one
        const defaultModel = res.data.find(m => m.id === 'google/gemini-2.0-flash-lite-preview-02-05:free');
        if (defaultModel) setSelectedModel(defaultModel.id);
        else setSelectedModel(res.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch OpenRouter models', error);
      setModelError('Failed to load models. Check your API Key.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/ai/provider`, {
        provider: selectedProvider,
        model: selectedProvider === 'openrouter' ? selectedModel : undefined,
        enableRateLimitRetry
      });
      onProviderChange(selectedProvider);
      onClose();
    } catch (error) {
      console.error('Failed to set provider', error);
      alert('Failed to set AI provider');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Typography variant="h6" sx={{ mb: 2 }}>AI Provider</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose the AI provider for repository tagging.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Select
              fullWidth
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              sx={{ mb: 2 }}
            >
              {(providers || []).map(provider => (
                <MenuItem key={provider.name} value={provider.name}>
                  <Box>
                    <Typography variant="subtitle2">{provider.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary">{provider.description}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>

            {selectedProvider === 'openrouter' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>OpenRouter Model</Typography>
                {loadingModels ? (
                  <CircularProgress size={20} />
                ) : modelError ? (
                  <Typography color="error" variant="caption">{modelError}</Typography>
                ) : (
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={openRouterModels}
                    getOptionLabel={(option) => option.name || option.id}
                    value={openRouterModels.find(m => m.id === selectedModel) || null}
                    onChange={(event, newValue) => {
                      setSelectedModel(newValue ? newValue.id : '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search models..."
                        helperText={selectedModel ? `Selected ID: ${selectedModel}` : ''}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <li key={key} {...otherProps}>
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="body2">{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              {option.id}
                            </Typography>
                          </Box>
                        </li>
                      );
                    }}
                  />
                )}
              </Box>
            )}

            {/* Rate Limit Retry Setting */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableRateLimitRetry}
                    onChange={(e) => setEnableRateLimitRetry(e.target.checked)}
                  />
                }
                label="Auto-retry on AI rate limits"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 6 }}>
                When enabled, the app will wait and retry when AI providers hit rate limits.
                Disable if you prefer to skip failed repos immediately.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Main App Logic ---

function App({ toggleTheme, mode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Checking login status...');
  const [page, setPage] = useState('home'); // 'home', 'lists', 'analytics'
  const [dataVersion, setDataVersion] = useState(0);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const importInputRef = useRef(null);
  const [lists, setLists] = useState([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Version management state - use injected version from build time
  const [currentVersion] = useState(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.2.0');
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);

  const [taggingStatus, setTaggingStatus] = useState({
    status: 'idle', // 'idle', 'running', 'paused', 'paused_rate_limit', 'complete', 'error'
    progress: 0,
    total: 0,
    message: '',
    lastError: null
  });

  // State for tracking if "recently-active" sort is being used
  const [isActiveSort, setIsActiveSort] = useState(false);

  // State for tracking sync status (simplified)
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false
  });

  // Settings state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState('gemini');

  // Effect to handle background sync trigger
  useEffect(() => {
    const handleBackgroundSync = async () => {
      if (syncStatus.isSyncing) return; // Prevent multiple simultaneous syncs

      setSyncStatus({ isSyncing: true });

      try {
        const res = await axios.get(`${API_BASE_URL}/api/fetch-stars`);
        const { newRepos = 0 } = res.data;
        setDataVersion(v => v + 1);
      } catch (e) {
        console.error(e);
        alert('Failed to sync with GitHub.');
      } finally {
        // Small delay before hiding the sync indicator
        setTimeout(() => {
          setSyncStatus({ isSyncing: false });
        }, 1000);
      }
    };

    window.addEventListener('triggerBackgroundSync', handleBackgroundSync);

    return () => {
      window.removeEventListener('triggerBackgroundSync', handleBackgroundSync);
    };
  }, [syncStatus.isSyncing]);

  useEffect(() => {
    if (user) {
      axios.get(`${API_BASE_URL}/api/lists`).then(res => setLists(res.data));
    }
  }, [user, dataVersion]);

  // Simplified sync - no complex polling needed

  // Check for updates on app load
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Check for latest releases from the StarWise repository
        const response = await fetch('https://api.github.com/repos/hamzamix/StarWise/releases/latest');
        if (response.ok) {
          const release = await response.json();
          const rawTag = typeof release.tag_name === 'string' ? release.tag_name : '';
          const latestVer = rawTag.replace(/^v/i, '').trim();
          setLatestVersion(latestVer);

          // Normalize to x.y.z and compare numerically
          const normalize = (v) => {
            const base = (v || '').split(/[+-]/)[0];
            const parts = base.split('.').map(p => p.trim()).filter(Boolean);
            while (parts.length < 3) parts.push('0');
            return parts.slice(0, 3).map(n => String(parseInt(n || '0', 10))).join('.');
          };
          const cmp = (a, b) => {
            const pa = normalize(a).split('.').map(n => parseInt(n, 10));
            const pb = normalize(b).split('.').map(n => parseInt(n, 10));
            for (let i = 0; i < 3; i++) {
              if (pa[i] > pb[i]) return 1;
              if (pa[i] < pb[i]) return -1;
            }
            return 0;
          };

          setHasUpdate(cmp(latestVer, currentVersion) === 1);
        } else {
          // On API errors, do not show update indicator
          setHasUpdate(false);
        }
      } catch (error) {
        console.log('Could not check for updates:', error);
      }
    };

    checkForUpdates();
  }, [currentVersion]);

  // Polling for AI tag generation status
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only poll if we're logged in and a job might be active
      if (user && (taggingStatus.status === 'running' || taggingStatus.status === 'paused' || taggingStatus.status === 'paused_rate_limit')) {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/ai/tags/status`);
          const newStatus = res.data;

          // If progress was made, increment dataVersion to trigger re-fetches in child components
          if (newStatus.progress > taggingStatus.progress && newStatus.progress < newStatus.total) {
            setDataVersion(v => v + 1);
          }

          // If the job completes, do a final refresh and show completion
          if (newStatus.status === 'complete') {
            setDataVersion(v => v + 1);
            // Keep the 'complete' status to show "Tags Generated!" permanently
            // Until user clicks the button again
          }

          setTaggingStatus(newStatus);

        } catch (e) {
          console.error("Failed to poll for tagging status", e);
          // Stop polling on error to avoid spamming
          setTaggingStatus(prev => ({ ...prev, status: 'error', message: 'Polling failed' }));
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [user, taggingStatus.status, taggingStatus.progress]);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/user`)
      .then(res => setUser(res.data.user || null))
      .catch(() => setUser(null))

      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await axios.get(`${API_BASE_URL}/auth/logout`);
      setUser(null);
      setPage('home');
    } catch (error) {
      console.error("Logout failed", error);
      alert('Logout failed.');
    }
  };

  const handleImportClick = () => {
    setUserMenuAnchor(null);
    importInputRef.current.click();
  };

  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const jsonData = JSON.parse(content as string);

        if (!jsonData || typeof jsonData !== 'object' || !jsonData.starredRepos || !jsonData.lists) {
          alert('Invalid backup file format.');
          return;
        }

        if (window.confirm('Are you sure you want to import this data? This will overwrite all your existing tags and lists.')) {
          await axios.post(`${API_BASE_URL}/api/import`, jsonData);
          alert('Import successful! The application will now reload.');
          window.location.reload();
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import data. Make sure it is a valid StarWise JSON backup file.');
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleVersionClick = () => {
    // Open the specific release page for either the latest available or current version
    const ownerRepo = 'hamzamix/StarWise';
    const versionToOpen = hasUpdate && latestVersion ? latestVersion : currentVersion;
    const url = `https://github.com/${ownerRepo}/releases/tag/v${versionToOpen}`;
    window.open(url, '_blank');
  };

  const fetchStarsAndTags = async () => {
    // Instead of doing a direct sync, trigger background sync for all cases
    const event = new CustomEvent('triggerBackgroundSync');
    window.dispatchEvent(event);
  };

  const startGenerateAllAiTags = async () => {
    // If status is complete, reset to idle first
    if (taggingStatus.status === 'complete') {
      setTaggingStatus({ status: 'idle', progress: 0, total: 0, message: '' });
    }

    try {
      await axios.post(`${API_BASE_URL}/api/ai/start-generate-all-tags`);
      // Immediately update status to kick off polling, backend will provide the real numbers
      setTaggingStatus(prev => ({ ...prev, status: 'running' }));
    } catch (e) {
      console.error(e);
      alert('An error occurred while starting AI tag generation.');
    }
  };

  const resumeTagGeneration = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/ai/tags/resume`);
      setTaggingStatus(prev => ({ ...prev, status: 'running', lastError: null }));
    } catch (e) {
      console.error(e);
      alert('Failed to resume tag generation.');
    }
  };

  const handleTagButtonClick = () => {
    if (taggingStatus.status === 'paused' || taggingStatus.status === 'paused_rate_limit') {
      resumeTagGeneration();
    } else {
      startGenerateAllAiTags();
    }
  };

  const renderTagButtonContent = () => {
    switch (taggingStatus.status) {
      case 'running':
        return `Generating ${taggingStatus.progress}/${taggingStatus.total}...`;
      case 'paused':
        return 'Paused - Click to Resume';
      case 'paused_rate_limit':
        return 'Rate Limit - Click to Resume';
      case 'complete':
        return 'Tags Generated! Click to Regenerate';
      case 'error':
        return 'Error - Retry';
      default:
        return 'Generate AI Tags';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography>{loadingText}</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <img src="/logo.png" alt="Starwise Logo" style={{ width: 103, height: 103 }} />
          <Typography variant="h2" component="h1">Starwise</Typography>
        </Stack>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Your GitHub stars, organized. Automatically tag and categorize your favorite repositories with the power of AI.
        </Typography>
        <Button variant="contained" size="large" startIcon={<GitHubIcon />} href={`${API_BASE_URL}/auth/github`}>
          Sign in with GitHub
        </Button>
      </Container>
    );
  }

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: (theme) => theme.palette.mode === 'dark' ? 'rgba(13, 17, 23, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <img src="/logo.png" alt="Starwise Logo" style={{ width: 28, height: 28 }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>Starwise</Typography>
            <Button color={page === 'home' ? 'primary' : 'inherit'} onClick={() => setPage('home')}>Home</Button>
            <Button color={page === 'lists' ? 'primary' : 'inherit'} onClick={() => setPage('lists')}>Lists</Button>
            <Button color={page === 'backups' ? 'primary' : 'inherit'} onClick={() => setPage('backups')}>Backups</Button>
            <Button color={page === 'analytics' ? 'primary' : 'inherit'} onClick={() => setPage('analytics')}>Insights</Button>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            {/* Version Display with Update Notification */}
            <Box sx={{ position: 'relative' }}>
              <Tooltip title={hasUpdate && latestVersion ? `Update available: v${latestVersion}` : `App version: v${currentVersion}`}>
                <Chip
                  label={`v${hasUpdate && latestVersion ? latestVersion : currentVersion}`}
                  size="small"
                  variant="outlined"
                  onClick={handleVersionClick}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    height: 20,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                />
              </Tooltip>
              {hasUpdate && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    backgroundColor: 'error.main',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}
                />
              )}
            </Box>
            <Tooltip title={taggingStatus.status === 'paused_rate_limit' && taggingStatus.lastError ? `Error: ${taggingStatus.lastError}` : ''}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleTagButtonClick}
                  disabled={taggingStatus.status === 'running'}
                  color={taggingStatus.status === 'paused_rate_limit' ? 'warning' : 'primary'}
                  startIcon={
                    taggingStatus.status === 'running' ? <CircularProgress color="inherit" size={16} /> :
                      taggingStatus.status === 'paused_rate_limit' ? <PauseCircleIcon /> :
                        taggingStatus.status === 'paused' ? <PlayArrowIcon /> :
                          <AutoAwesomeIcon />
                  }
                >
                  {renderTagButtonContent()}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={isActiveSort ? 'Recently active works best after syncing your stars' : ''}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  color={isActiveSort ? 'warning' : 'primary'}
                  onClick={isActiveSort ? () => {
                    // Trigger background sync for recently active
                    const event = new CustomEvent('triggerBackgroundSync');
                    window.dispatchEvent(event);
                  } : fetchStarsAndTags}
                  disabled={loading || syncStatus.isSyncing}
                  startIcon={syncStatus.isSyncing ? <CircularProgress color="inherit" size={16} /> : null}
                >
                  {syncStatus.isSyncing ? 'Syncing...' : (isActiveSort ? 'Sync now' : 'Sync GitHub Stars')}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Account settings">
              <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} size="small">
                <Avatar src={user.photos?.[0]?.value} alt={user.displayName || user.username} sx={{ width: 32, height: 32 }} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
            >
              <MenuItem component="a" href={`${API_BASE_URL}/api/export`} download="starwise_backup.json" onClick={() => setUserMenuAnchor(null)}>Full Export</MenuItem>
              <MenuItem onClick={() => { setIsExportDialogOpen(true); setUserMenuAnchor(null); }}>Selective Export</MenuItem>
              <MenuItem onClick={handleImportClick}>Import Data</MenuItem>
              <MenuItem onClick={() => { setSettingsDialogOpen(true); setUserMenuAnchor(null); }}>Settings</MenuItem>
              <Divider />
              <MenuItem onClick={() => { handleLogout(); setUserMenuAnchor(null); }}>Logout</MenuItem>
            </Menu>
            <input
              type="file"
              ref={importInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportFile}
            />
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <main>
        {page === 'home' && <HomePage dataVersion={dataVersion} onForceSync={fetchStarsAndTags} onSuggestSyncActiveChange={setIsActiveSort} />}
        {page === 'lists' && <ListsPage dataVersion={dataVersion} onForceSync={fetchStarsAndTags} onSuggestSyncActiveChange={setIsActiveSort} />}
        {page === 'backups' && <BackupsPage />}
        {page === 'analytics' && <AnalyticsDashboard />}
      </main>
      <SelectiveExportDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        lists={lists}
      />
      <SettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        currentProvider={currentProvider}
        onProviderChange={setCurrentProvider}
      />
    </>
  );
}

function AppWrapper() {
  const [mode, setMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('themeMode');
      return savedMode || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = useCallback(() => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  }, []);

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalAppStyles />
      <App toggleTheme={toggleTheme} mode={mode} />
    </ThemeProvider>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);