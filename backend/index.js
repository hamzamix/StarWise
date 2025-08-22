require('dotenv').config();
const express = require('express');
const session = 'express-session';
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const cors = require('cors');
const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');


// --- Environment Variable Check ---
const requiredEnv = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'API_KEY', 'SESSION_SECRET'];
const missingEnv = requiredEnv.filter(v => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`\n🔴 ERROR: Missing required environment variables: ${missingEnv.join(', ')}.`);
  console.error('Please create a .env file in the /backend directory and add these variables.');
  console.error('Refer to the README.md for setup instructions.\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// --- Database Setup ---
const dbPath = path.join(__dirname, 'db.json');
let db = { starredRepos: [], lists: [] };

async function loadDb() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    db = JSON.parse(data);
    console.log(`Database loaded successfully from ${dbPath}. Found ${db.starredRepos.length} repos and ${db.lists.length} lists.`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No database file found. A new db.json will be created on first data write.');
      await saveDb(); // Create the initial file
    } else {
      console.error('Failed to load database:', error);
    }
  }
}

async function saveDb() {
  try {
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

// Helper to generate a unique slug for local lists
const generateSlug = (name) => {
    let slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    // Ensure slug is unique in the local DB
    let originalSlug = slug;
    let counter = 1;
    while(db.lists.some(l => l.id === slug)) {
        slug = `${originalSlug}-${counter}`;
        counter++;
    }
    return slug;
};

// Helper to add a delay between API calls
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://1227.0.0.1:5173', 'http://localhost:3000', 'http://localhost:4000'],
  credentials: true,
}));
app.use(express.json());
app.use(require('express-session')({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub OAuth Setup
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/auth/github/callback`
},
function(accessToken, refreshToken, profile, done) {
  profile.accessToken = accessToken;
  return done(null, profile);
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Routes for OAuth
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'read:user', 'repo', 'write:repo'] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/auth/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json({ message: 'Logged out' });
        });
    });
});

// Middleware to ensure logged in
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Gemini AI function
async function getTagsFromGemini(repo) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY for Gemini not found. Returning language as tag.");
      return repo.language ? [repo.language] : ['general'];
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze the following GitHub repository information and generate up to 4 relevant, concise, technical keywords as tags.
      - Repository Name: ${repo.full_name}
      - Primary Language: ${repo.language}
      - Description: ${repo.description}
      
      Return only a JSON object with a "tags" array of strings. Example: {"tags": ["react", "state-management", "frontend", "library"]}`;
  
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { tags: { type: Type.ARRAY, items: { type: Type.STRING } } }
          }
        }
      });
  
      const jsonText = response.text.trim();
      const result = JSON.parse(jsonText);
      return result.tags || [];
    } catch (error) {
      console.error("Error calling Gemini API for repo:", repo.full_name, error);
      return [repo.language || "tagging-error"];
    }
  }

// Serve static files from the React app build for production
app.use(express.static(path.join(__dirname, '../public')));


// API Routes
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ user: null });
    }
});

app.get('/api/fetch-stars', ensureAuth, async (req, res) => {
  try {
    const token = req.user.accessToken;
    const githubApi = axios.create({
        baseURL: 'https://api.github.com',
        headers: { 
            'Authorization': 'token ' + token, 
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    console.log('Starting sync with GitHub...');
    
    // --- 1. FETCH STARRED REPOS FROM GITHUB ---
    console.log('Fetching all starred repositories from GitHub...');
    let allGithubRepos = [];
    let page = 1;
    while (true) {
        const response = await githubApi.get(`/user/starred?sort=created&direction=desc&per_page=100&page=${page}`, {
          headers: { 'Accept': 'application/vnd.github.star+json' }
        });
        if (response.data.length === 0) break;
        const starredItems = response.data;
        const reposFromPage = starredItems.map(item => ({
            ...item.repo,
            starred_at: item.starred_at
        }));
        allGithubRepos = allGithubRepos.concat(reposFromPage);
        page++;
    }
    console.log(`Found ${allGithubRepos.length} total starred repos on GitHub.`);

    // --- 2. PROCESS REPOS (TAG NEW, UPDATE EXISTING) ---
    const existingRepoMap = new Map(db.starredRepos.map(r => [r.id, r]));
    let newReposCount = 0;
    
    const processedRepos = [];
    for (const ghRepo of allGithubRepos) {
        const existingRepo = existingRepoMap.get(ghRepo.id);
        let aiTags;

        if (existingRepo) {
            // It's an existing repo, keep its current AI tags.
            aiTags = existingRepo.aiTags;
        } else {
            // It's a new repo, generate AI tags.
            newReposCount++;
            console.log(`New repo found: ${ghRepo.full_name}. Generating tags...`);
            aiTags = await getTagsFromGemini(ghRepo);
            await delay(7000); // Wait 7 seconds to respect free tier rate limit (10 req/min)
        }
        
        // Handle list migration and preservation
        let listIds = [];
        if (existingRepo) {
            if (Array.isArray(existingRepo.listIds)) {
                listIds = existingRepo.listIds;
            } else if (existingRepo.listId) { // Migrate old property
                listIds = [existingRepo.listId];
            }
        }

        processedRepos.push({
            id: ghRepo.id,
            full_name: ghRepo.full_name,
            html_url: ghRepo.html_url,
            description: ghRepo.description,
            stargazers_count: ghRepo.stargazers_count,
            forks_count: ghRepo.forks_count,
            language: ghRepo.language,
            fork: ghRepo.fork,
            owner: { login: ghRepo.owner.login, avatar_url: ghRepo.owner.avatar_url },
            starred_at: ghRepo.starred_at,
            updated_at: ghRepo.pushed_at,
            aiTags: aiTags,
            userTags: existingRepo ? existingRepo.userTags : [],
            listIds: listIds,
            private: ghRepo.private,
            is_template: ghRepo.is_template,
            mirror_url: ghRepo.mirror_url,
        });
    }

    db.starredRepos = processedRepos;

    await saveDb();
    console.log(`Sync complete. Added ${newReposCount} new repos.`);
    res.json({ success: true, count: db.starredRepos.length, newRepos: newReposCount });
  } catch(e) {
    console.error('Error fetching stars:', e.response ? e.response.data : e.message);
    res.status(500).json({ error: 'Failed to fetch stars from GitHub.' });
  }
});

// Get repos with pagination and search
app.get('/api/repos', ensureAuth, (req, res) => {
  const { listId, search, page = 1, limit = 9, type = 'all', language = 'all', sort = 'recently-starred' } = req.query;
  const currentPage = parseInt(page, 10);
  const reposPerPage = parseInt(limit, 10);

  let reposToFilter = [...db.starredRepos];
  
  if (listId && listId !== 'all') {
    reposToFilter = reposToFilter.filter(r => r.listIds && r.listIds.includes(String(listId)));
  }
  
  switch (type) {
    case 'public':
      reposToFilter = reposToFilter.filter(r => !r.private);
      break;
    case 'private':
      reposToFilter = reposToFilter.filter(r => r.private);
      break;
    case 'sources':
      reposToFilter = reposToFilter.filter(r => !r.fork);
      break;
    case 'forks':
      reposToFilter = reposToFilter.filter(r => r.fork);
      break;
    case 'mirrors':
      reposToFilter = reposToFilter.filter(r => !!r.mirror_url);
      break;
    case 'templates':
      reposToFilter = reposToFilter.filter(r => r.is_template);
      break;
  }

  if (language !== 'all') {
      reposToFilter = reposToFilter.filter(r => r.language === language);
  }

  let filteredRepos = reposToFilter;
  if (search) {
      const lowercasedSearch = search.toLowerCase();
      filteredRepos = reposToFilter.filter(repo => {
          const list = db.lists.find(l => l.id === repo.listId);
          const inName = repo.full_name.toLowerCase().includes(lowercasedSearch);
          const inDescription = repo.description && repo.description.toLowerCase().includes(lowercasedSearch);
          const inAiTags = repo.aiTags && repo.aiTags.some(tag => tag.toLowerCase().includes(lowercasedSearch));
          const inUserTags = repo.userTags && repo.userTags.some(tag => tag.toLowerCase().includes(lowercasedSearch));
          const inList = list && list.name.toLowerCase().includes(lowercasedSearch);
          return inName || inDescription || inAiTags || inUserTags || inList;
      });
  }
  
  // Sorting
  if (sort === 'name-asc') {
    filteredRepos.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } else if (sort === 'stars-desc') {
    filteredRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } else if (sort === 'recently-active') {
    filteredRepos.sort((a, b) => {
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        // A repo with an invalid date should be sorted after one with a valid date.
        if (!isFinite(timeB)) return 1;
        if (!isFinite(timeA)) return -1;
        return timeB - timeA;
    });
  } else { // Default to 'recently-starred'
    filteredRepos.sort((a, b) => {
        const timeB = b.starred_at ? new Date(b.starred_at).getTime() : 0;
        const timeA = a.starred_at ? new Date(a.starred_at).getTime() : 0;
        if (!isFinite(timeB)) return 1;
        if (!isFinite(timeA)) return -1;
        return timeB - timeA;
    });
  }

  const totalPages = Math.ceil(filteredRepos.length / reposPerPage);
  const startIndex = (currentPage - 1) * reposPerPage;
  const paginatedRepos = filteredRepos.slice(startIndex, startIndex + reposPerPage);
  
  res.json({
    repos: paginatedRepos,
    totalPages,
    currentPage,
  });
});

app.get('/api/languages', ensureAuth, (req, res) => {
    const languages = [...new Set(db.starredRepos.map(r => r.language).filter(Boolean))];
    languages.sort();
    res.json(languages);
});

// Suggest new tags for a repo
app.post('/api/repos/:id/suggest-tags', ensureAuth, async (req, res) => {
    const repoId = parseInt(req.params.id, 10);
    const repo = db.starredRepos.find(r => r.id === repoId);

    if (!repo) {
        return res.status(404).json({ error: 'Repo not found' });
    }

    try {
        const newAiTags = await getTagsFromGemini(repo);
        repo.aiTags = newAiTags;
        await saveDb();
        res.json(repo);
    } catch (error) {
        console.error("Error suggesting new tags for repo:", repo.full_name, error);
        res.status(500).json({ error: 'Failed to suggest tags.' });
    }
});

// New endpoint to generate AI tags for ALL repos
app.post('/api/ai/generate-all-tags', ensureAuth, async (req, res) => {
    try {
        console.log(`Starting AI tag generation for all ${db.starredRepos.length} repos.`);
        
        // Using a for...of loop with a delay to respect API rate limits
        for (const repo of db.starredRepos) {
            console.log(`Generating tags for ${repo.full_name}...`);
            const newAiTags = await getTagsFromGemini(repo);
            repo.aiTags = newAiTags;
            await delay(7000); // Wait 7 seconds to respect free tier rate limit (10 req/min)
        }

        await saveDb();
        console.log('AI tag generation complete for all repos.');
        res.json({ success: true, count: db.starredRepos.length });
    } catch(e) {
        console.error('Error during bulk AI tag generation:', e.message);
        res.status(500).json({ error: 'Failed to generate AI tags for all repositories.' });
    }
});


// Lists CRUD
app.get('/api/lists', ensureAuth, (req, res) => {
  const listsWithCounts = db.lists.map(list => ({
      ...list,
      repoCount: db.starredRepos.filter(repo => repo.listIds && repo.listIds.includes(list.id)).length
  }));
  res.json(listsWithCounts);
});

app.post('/api/lists', ensureAuth, async (req, res) => {
  const { name } = req.body;
  const trimmedName = name ? name.trim() : '';
  if (!trimmedName) {
    return res.status(400).json({ error: 'Name required' });
  }

  if (db.lists.some(l => l.name.toLowerCase() === trimmedName.toLowerCase())) {
    return res.status(409).json({ error: 'A list with this name already exists.' });
  }
  
  try {
    const slug = generateSlug(trimmedName);
    const newList = { id: slug, name: trimmedName };
    
    db.lists.push(newList);
    db.lists.sort((a,b) => a.name.localeCompare(b.name));
    await saveDb();
    
    res.status(201).json(newList);
    
  } catch (error) {
    console.error('Failed to create local list:', error);
    res.status(500).json({ error: 'Failed to create list.' });
  }
});

app.put('/api/lists/:id', ensureAuth, async (req, res) => {
    const listId = req.params.id;
    const { name } = req.body;
    const trimmedName = name ? name.trim() : '';
  
    if (!trimmedName) {
      return res.status(400).json({ error: 'Name required' });
    }
  
    const listToUpdate = db.lists.find(l => l.id === listId);
    if (!listToUpdate) {
      return res.status(404).json({ error: 'List not found' });
    }
  
    // Check if another list with the new name already exists (case-insensitive)
    if (db.lists.some(l => l.id !== listId && l.name.toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(409).json({ error: 'A list with this name already exists.' });
    }
  
    listToUpdate.name = trimmedName;
    // Re-sort lists alphabetically by new name
    db.lists.sort((a,b) => a.name.localeCompare(b.name));
    await saveDb();
  
    res.json(listToUpdate);
});

app.delete('/api/lists/:id', ensureAuth, async (req, res) => {
    const listId = req.params.id;
    const listIndex = db.lists.findIndex(l => l.id === listId);

    if (listIndex === -1) {
        return res.status(404).json({ error: 'List not found' });
    }

    // Remove the list
    db.lists.splice(listIndex, 1);

    // Remove the listId from all repos that have it
    db.starredRepos.forEach(repo => {
        if (repo.listIds && repo.listIds.includes(listId)) {
            repo.listIds = repo.listIds.filter(id => id !== listId);
        }
    });

    await saveDb();
    res.status(204).send(); // No Content
});

// Add/remove a repo from a list (toggle)
app.post('/api/repos/:id/move', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const { listId: listToToggle } = req.body;
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repo not found' });
  }
  
  try {
    // Initialize listIds if it doesn't exist (also handles migration from old listId)
    if (!Array.isArray(repo.listIds)) {
        repo.listIds = repo.listId ? [repo.listId] : [];
        delete repo.listId; // Clean up old property
    }
    
    const listIndex = repo.listIds.indexOf(listToToggle);
    if (listIndex > -1) {
        // List exists, so we remove it.
        repo.listIds.splice(listIndex, 1);
    } else {
        // List doesn't exist, so we add it.
        repo.listIds.push(listToToggle);
    }

    await saveDb();
    res.json(repo);

  } catch (error) {
    console.error('Failed to move repo locally:', error);
    res.status(500).json({ error: 'Failed to move repository.' });
  }
});

// Add a user tag to a repo
app.post('/api/repos/:id/tags', ensureAuth, async (req, res) => {
    const repoId = parseInt(req.params.id, 10);
    const { tag } = req.body;
    const repo = db.starredRepos.find(r => r.id === repoId);

    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    if (!tag) return res.status(400).json({ error: 'Tag cannot be empty' });
    if (!repo.userTags) repo.userTags = [];
    if (!repo.userTags.includes(tag)) {
        repo.userTags.push(tag);
        await saveDb();
    }
    res.json(repo);
});

// Delete a user tag from a repo
app.delete('/api/repos/:id/tags', ensureAuth, async (req, res) => {
    const repoId = parseInt(req.params.id, 10);
    const { tag } = req.body;
    const repo = db.starredRepos.find(r => r.id === repoId);

    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    if (!tag) return res.status(400).json({ error: 'Tag cannot be empty' });
    if (repo.userTags) {
        const initialLength = repo.userTags.length;
        repo.userTags = repo.userTags.filter(t => t !== tag);
        if (repo.userTags.length < initialLength) {
           await saveDb();
        }
    }
    res.json(repo);
});

// The "catchall" handler: for any request that doesn't
// match one of the API routes above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const startServer = async () => {
  await loadDb();
  app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
}

startServer();