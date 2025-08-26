

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';

import {
  Button, TextField, Typography, Container, Box, Card, Chip, Select, MenuItem,
  InputLabel, FormControl, CircularProgress, createTheme, ThemeProvider,
  CssBaseline, AppBar, Toolbar, Stack, CardContent, Link, CardActions, Tooltip,
  GlobalStyles, Paper, Pagination, Avatar, List, ListItem, ListItemButton, ListItemText, Divider,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Popover,
  Checkbox, IconButton, InputAdornment, Menu, ListItemIcon
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';


const API_BASE_URL = 'http://localhost:4000';
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

function RepoFilters({ filters, onFiltersChange, languages }) {
  const [typeAnchor, setTypeAnchor] = useState(null);
  const [langAnchor, setLangAnchor] = useState(null);
  const [sortAnchor, setSortAnchor] = useState(null);

  const handleFilterChange = (key, value) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
    setTypeAnchor(null);
    setLangAnchor(null);
    setSortAnchor(null);
  };
  
  const sortOptions = {
    'recently-starred': 'Recently starred',
    'recently-active': 'Recently active',
    'stars-desc': 'Most stars',
    'name-asc': 'Name (A-Z)',
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
                    <ListItemIcon sx={{minWidth: 32}}>
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
        <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)} PaperProps={{ style: { maxHeight: 300 }}}>
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

  const filteredLists = useMemo(() => {
    return lists.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [lists, search]);
  
  const handleToggleList = (listId) => {
    onMoveRepo(repo.id, listId);
  };
  
  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    const newList = await onCreateList(newListName.trim());
    if (newList && newList.id) {
        onMoveRepo(repo.id, newList.id);
        setNewListName('');
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
            }}
            sx={{ mb: 1 }}
        />
        <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {filteredLists.map(list => (
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
            ))}
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
            />
            <IconButton onClick={handleCreateAndAdd} size="small" sx={{border: '1px solid grey', borderRadius: 1}}>
                <AddIcon />
            </IconButton>
        </Stack>
      </Paper>
    </Popover>
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
}

function RepoCard({ repo, lists, onMoveRepo, onAddTag, onDeleteTag, onSuggestTags, onCreateList, onTagClick }: RepoCardProps) {
  const [newTag, setNewTag] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [listMenuAnchor, setListMenuAnchor] = useState(null);

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
                <BookmarkBorderIcon fontSize="small"/> Your Tags
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
        
        <Stack direction="row" spacing={1} sx={{mt: 3}}>
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
          <Button
              variant="outlined"
              size="small"
              startIcon={isSuggesting ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleSuggestTags}
              disabled={isSuggesting}
              sx={theme => ({ whiteSpace: 'nowrap', ...cardActionButtonStyle(theme) })}
          >
              SUGGEST TAGS WITH AI
          </Button>
          <Button
              variant="outlined"
              size="small"
              startIcon={<DehazeIcon />}
              onClick={(e) => setListMenuAnchor(e.currentTarget)}
              sx={theme => ({ whiteSpace: 'nowrap', ...cardActionButtonStyle(theme) })}
          >
              MANAGE LISTS
          </Button>
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
     </>
  );
}

// --- Pages ---

function HomePage({ dataVersion }) {
  const [repos, setRepos] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ type: 'all', language: 'all', sort: 'recently-starred' });
  const [languages, setLanguages] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

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
  }, [debouncedSearch, filters, fetchRepos, dataVersion]);

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
      const res = await axios.delete(`${API_BASE_URL}/api/repos/${repoId}/tags`, { data: { tag }});
      updateRepoInState(res.data);
    } catch(e) { alert('Failed to delete tag'); }
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
        <RepoFilters filters={filters} onFiltersChange={setFilters} languages={languages} />
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>}
      {error && <Typography color="error">{error}</Typography>}

      {!loading && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {repos.map(repo => (
              <RepoCard key={repo.id} repo={repo} lists={lists} onMoveRepo={handleMoveRepo} onAddTag={handleAddTag} onDeleteTag={onDeleteTag} onSuggestTags={handleSuggestTags} onCreateList={handleCreateList} onTagClick={handleTagClick} />
            ))}
          </Box>
           {repos.length === 0 && <Typography sx={{textAlign: 'center', mt: 8, color: 'text.secondary'}}>No repositories found. Try syncing your stars or refining your search.</Typography>}
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

function ListsPage({ dataVersion }) {
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
        setFilters({ type: 'all', language: 'all', sort: 'recently-starred' });
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
        const res = await axios.delete(`${API_BASE_URL}/api/repos/${repoId}/tags`, { data: { tag }});
        updateRepoInState(res.data);
      } catch(e) { alert('Failed to delete tag'); }
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

    const selectedList = useMemo(() => lists.find(l => l.id === selectedListId), [lists, selectedListId]);

    return (
        <>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom>Your Lists</Typography>
          <Typography variant="body1" color="text.secondary" sx={{mb: 4}}>Organize your starred repositories into custom lists, synced from your GitHub account.</Typography>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '350px 1fr' }} gap={4}>
                <Paper elevation={0} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px:1 }}>
                        <Typography variant="h6">Lists ({lists.length})</Typography>
                        <Stack direction="row" spacing={1}>
                            <FormControl size="small" sx={{minWidth: 80}}>
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
                    <Divider sx={{mb:1}}/>
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
                          <RepoFilters filters={filters} onFiltersChange={setFilters} languages={languages} />
                        </Box>
                      </>
                  ) : <Typography variant="h5" color="text.secondary" sx={{textAlign: 'center', mt: 8}}>Select a list to view its repositories</Typography>}

                    {loadingRepos && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>}
                    
                    {!loadingRepos && (
                        <>
                         <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
                            {repos.map(repo => (
                                <RepoCard key={repo.id} repo={repo} lists={lists} onMoveRepo={handleMoveRepo} onAddTag={handleAddTag} onDeleteTag={onDeleteTag} onSuggestTags={handleSuggestTags} onCreateList={handleCreateList} onTagClick={handleTagClick} />
                            ))}
                        </Box>
                        {repos.length === 0 && selectedList && <Typography sx={{textAlign: 'center', mt: 8, color: 'text.secondary'}}>This list is empty. Try a different search.</Typography>}
                        {totalPages > 1 && (
                            <Stack spacing={2} sx={{ mt: 4, alignItems: 'center' }}>
                            <Pagination count={totalPages} page={page} onChange={handlePageChange} />
                            </Stack>
                        )}
                        </>
                    )}
                </Box>
            </Box>
        </Container>

        {/* Create List Dialog */}
        <Dialog open={isCreateListDialogOpen} onClose={() => setCreateListDialogOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>Create a new list</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{mb: 2}}>
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
            <DialogActions sx={{px: 3, pb: 2}}>
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
        </Menu>

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
            <DialogActions sx={{px: 3, pb: 2}}>
                <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleRenameList}>Save</Button>
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

// --- Main App Logic ---

function App({ toggleTheme, mode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Checking login status...');
  const [page, setPage] = useState('home'); // 'home' or 'lists'
  const [dataVersion, setDataVersion] = useState(0);
  
  const [taggingStatus, setTaggingStatus] = useState({
    status: 'idle', // 'idle', 'running', 'paused', 'complete', 'error'
    progress: 0,
    total: 0,
    message: ''
  });

  // Polling for AI tag generation status
  useEffect(() => {
    const interval = setInterval(async () => {
        // Only poll if we're logged in and a job might be active
        if (user && (taggingStatus.status === 'running' || taggingStatus.status === 'idle')) {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/ai/tag-generation-status`);
                const newStatus = res.data;

                // If progress was made, increment dataVersion to trigger re-fetches in child components
                if (newStatus.progress > taggingStatus.progress && newStatus.progress < newStatus.total) {
                    setDataVersion(v => v + 1);
                }

                // If the job completes, do a final refresh and reset the button after a delay
                if (newStatus.status === 'complete') {
                    setDataVersion(v => v + 1);
                    setTimeout(() => {
                        setTaggingStatus({ status: 'idle', progress: 0, total: 0, message: '' });
                    }, 5000); // Reset button after 5 seconds
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

  const fetchStarsAndTags = async () => {
    setLoading(true);
    setLoadingText('Syncing with GitHub... this may take a moment.');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/fetch-stars`);
      const { newRepos = 0 } = res.data;
      alert(`Sync complete! Added ${newRepos} new repositories.`);
      setDataVersion(v => v + 1);
    } catch (e) {
      console.error(e);
      alert('Failed to sync with GitHub.');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const startGenerateAllAiTags = async () => {
    try {
        await axios.post(`${API_BASE_URL}/api/ai/start-generate-all-tags`);
        // Immediately update status to kick off polling, backend will provide the real numbers
        setTaggingStatus(prev => ({ ...prev, status: 'running' }));
    } catch(e) {
        console.error(e);
        alert('An error occurred while starting AI tag generation.');
    }
  };
  
  const renderTagButtonContent = () => {
      switch(taggingStatus.status) {
          case 'running':
              return `Generating ${taggingStatus.progress}/${taggingStatus.total}...`;
          case 'paused':
              return 'Paused - Resume';
          case 'complete':
              return 'Tags Generated!';
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
            <Stack direction="row" spacing={2} alignItems="center" sx={{mb: 2}}>
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
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button 
                variant="contained" 
                size="small" 
                onClick={startGenerateAllAiTags} 
                disabled={taggingStatus.status === 'running'}
                startIcon={taggingStatus.status === 'running' ? <CircularProgress color="inherit" size={16}/> : <AutoAwesomeIcon />}
            >
                {renderTagButtonContent()}
             </Button>
             <Button variant="contained" size="small" onClick={fetchStarsAndTags} disabled={loading}>Sync GitHub Stars</Button>
             <Tooltip title={user.displayName || user.username || ''}>
                <Avatar src={user.photos?.[0]?.value} alt={user.displayName || user.username} sx={{width: 32, height: 32}} />
             </Tooltip>
             <IconButton onClick={toggleTheme} color="inherit">
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
             </IconButton>
             <Button color="inherit" onClick={handleLogout}>Logout</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <main>
        {page === 'home' && <HomePage dataVersion={dataVersion} />}
        {page === 'lists' && <ListsPage dataVersion={dataVersion} />}
      </main>
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