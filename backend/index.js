require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const cors = require('cors');
const { GoogleGenAI, Type } = require('@google/genai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createWriteStream, existsSync, mkdirSync } = require('fs');
const DatabaseMigrations = require('./migrations');


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
const dbPath = process.env.NODE_ENV === 'production' || process.env.USE_DATA_DIR
  ? '/data/db.json'
  : path.join(__dirname, 'db.json');
let db = { starredRepos: [], lists: [], settings: { aiProvider: 'gemini', aiModel: null, enableRateLimitRetry: true } };

// Original working version - no sync progress tracking

async function loadDb() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    db = JSON.parse(data);
    console.log(`Database loaded successfully from ${dbPath}. Found ${db.starredRepos.length} repos and ${db.lists.length} lists.`);

    // Run migrations to ensure schema compatibility
    await runDatabaseMigrations();

    // Initialize backup structures for all repositories
    const backupStructuresAdded = initializeBackupStructures();

    // Save database if backup structures were added
    if (backupStructuresAdded > 0) {
      console.log('Saving database with initialized backup structures...');
      await saveDb();
    }

    // Restart scheduled backups
    restartScheduledBackups();
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No database file found. A new db.json will be created on first data write.');
      db = { starredRepos: [], lists: [], settings: { aiProvider: 'gemini', aiModel: null }, dbVersion: '1.2.0' };
      await saveDb(); // Create the initial file
    } else {
      console.error('Failed to load database:', error);
    }
  }
}

/**
 * Run database migrations to handle schema evolution
 */
async function runDatabaseMigrations() {
  try {
    const migrations = new DatabaseMigrations(db, dbPath);

    // Create backup before migration (in case something goes wrong)
    await migrations.backupDatabase();

    // Run all pending migrations
    await migrations.runMigrations();
  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    console.error('The app will continue with potentially incompatible schema.');
    console.error('Please check your database or contact support.');
    // Don't throw - allow app to continue so user can recover
  }
}

async function saveDb() {
  try {
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

// Initialize backup structure for all repositories
function initializeBackupStructures() {
  console.log('Initializing backup structures for existing repositories...');
  let initializedCount = 0;

  db.starredRepos.forEach(repo => {
    if (!repo.backup) {
      repo.backup = {
        status: 'none',
        lastBackup: null,
        backupCount: 0,
        latestBackupPath: null,
        latestVersionId: null,
        fileSize: null,
        lastError: null,
        versions: [],
        scheduledUpdates: false,
        updateInterval: 24
      };
      initializedCount++;
    }
  });

  if (initializedCount > 0) {
    console.log(`Initialized backup structures for ${initializedCount} repositories`);
  } else {
    console.log('All repositories already have backup structures');
  }

  return initializedCount;

}

// Helper to generate a unique slug for local lists
const generateSlug = (name) => {
  let slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  // Ensure slug is unique in the local DB
  let originalSlug = slug;
  let counter = 1;
  while (db.lists.some(l => l.id === slug)) {
    slug = `${originalSlug}-${counter}`;
    counter++;
  }
  return slug;
};

// Helper to add a delay between API calls
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- AI Provider System ---

// Base class for AI providers
class AIProvider {
  constructor(name, apiKey) {
    this.name = name;
    this.apiKey = apiKey;
  }

  async generateTags(repo) {
    throw new Error('generateTags must be implemented by subclass');
  }
}

// Google Gemini Provider
class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super('gemini', apiKey);
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateTags(repo) {
    try {
      const prompt = `Analyze the following GitHub repository information and generate up to 8 relevant, concise, technical keywords as tags.
      - Repository Name: ${repo.full_name}
      - Primary Language: ${repo.language}
      - Description: ${repo.description}
      
      Return only a JSON object with a "tags" array of strings. Example: {"tags": ["react", "state-management", "frontend", "library", "redux", "flux", "javascript", "ui"]}`;

      const response = await this.ai.models.generateContent({
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
      return { tags: result.tags || [], error: null };
    } catch (error) {
      console.error("Error calling Gemini API for repo:", repo.full_name, error);
      return { tags: [repo.language || "tagging-error"], error: error };
    }
  }
}

// OpenAI Provider
class OpenAIProvider extends AIProvider {
  constructor(apiKey) {
    super('openai', apiKey);
    this.client = new OpenAI({ apiKey });
  }

  async generateTags(repo) {
    try {
      const prompt = `Analyze the following GitHub repository information and generate up to 8 relevant, concise, technical keywords as tags.
      - Repository Name: ${repo.full_name}
      - Primary Language: ${repo.language}
      - Description: ${repo.description}
      
      Return only a JSON object with a "tags" array of strings. Example: {"tags": ["react", "state-management", "frontend", "library", "redux", "flux", "javascript", "ui"]}`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const jsonText = response.choices[0].message.content.trim();
      const result = JSON.parse(jsonText);
      return { tags: result.tags || [], error: null };
    } catch (error) {
      console.error("Error calling OpenAI API for repo:", repo.full_name, error);
      return { tags: [repo.language || "tagging-error"], error: error };
    }
  }
}

// Anthropic Claude Provider
class AnthropicProvider extends AIProvider {
  constructor(apiKey) {
    super('anthropic', apiKey);
    this.client = new Anthropic({ apiKey });
  }

  async generateTags(repo) {
    try {
      const prompt = `Analyze the following GitHub repository information and generate up to 8 relevant, concise, technical keywords as tags.
      - Repository Name: ${repo.full_name}
      - Primary Language: ${repo.language}
      - Description: ${repo.description}
      
      Return only a JSON object with a "tags" array of strings. Example: {"tags": ["react", "state-management", "frontend", "library", "redux", "flux", "javascript", "ui"]}`;

      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      });

      const jsonText = response.content[0].text.trim();
      const result = JSON.parse(jsonText);
      return { tags: result.tags || [], error: null };
    } catch (error) {
      console.error("Error calling Anthropic API for repo:", repo.full_name, error);
      return { tags: [repo.language || "tagging-error"], error: error };
    }
  }
}

// OpenRouter Provider
class OpenRouterProvider extends AIProvider {
  constructor(apiKey, model) {
    super('openrouter', apiKey);
    this.model = model || 'google/gemini-2.0-flash-lite-preview-02-05:free';
  }

  async generateTags(repo) {
    try {
      const prompt = `Analyze the following GitHub repository information and generate up to 8 relevant, concise, technical keywords as tags.
      - Repository Name: ${repo.full_name}
      - Primary Language: ${repo.language}
      - Description: ${repo.description}
      
      Return only a JSON object with a "tags" array of strings. Example: {"tags": ["react", "state-management", "frontend", "library", "redux", "flux", "javascript", "ui"]}`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.model,
          messages: [{ role: "user", content: prompt }]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://starwise.app', // Required by OpenRouter
            'X-Title': 'StarWise'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      console.log('OpenRouter Response:', content);

      let jsonText = content.trim();
      // Remove markdown code blocks if present
      if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      }

      const result = JSON.parse(jsonText);
      return { tags: result.tags || [], error: null };
    } catch (error) {
      console.error("Error calling OpenRouter API for repo:", repo.full_name, error.response?.data || error.message);
      return { tags: [repo.language || "tagging-error"], error: error };
    }
  }
}

// Provider Factory
function createAIProvider(providerName, model) {
  const apiKeys = {
    gemini: process.env.API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
  };


  const apiKey = apiKeys[providerName];
  if (!apiKey) {
    throw new Error(`API key for ${providerName} not found`);
  }

  switch (providerName) {
    case 'gemini':
      return new GeminiProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openrouter':
      return new OpenRouterProvider(apiKey, model);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

// Scheduling system for automatic backup updates
let scheduledTasks = new Map(); // Track scheduled tasks per repo

async function scheduleBackupUpdate(repo, token, intervalHours = 24) {
  const repoId = repo.id;
  const repoName = repo.full_name;

  // Clear existing schedule for this repo
  if (scheduledTasks.has(repoId)) {
    clearTimeout(scheduledTasks.get(repoId));
  }

  const scheduleNextUpdate = async () => {
    try {
      console.log(`Checking for updates for ${repoName}...`);

      // Check if repo has been updated on GitHub
      const githubApi = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          'Authorization': 'token ' + token,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      const response = await githubApi.get(`/repos/${repoName}`);
      const latestUpdate = new Date(response.data.pushed_at);

      // Check if we need to create a new backup
      const lastBackupTime = repo.backup.lastBackup ? new Date(repo.backup.lastBackup) : new Date(0);

      if (latestUpdate > lastBackupTime) {
        console.log(`New version detected for ${repoName}, creating backup...`);

        // Update backup status to in_progress
        repo.backup.status = 'in_progress';
        await saveDb();

        // Create new backup
        const backupInfo = await createRepoBackup(repo, token);

        // Clean up old backups (keep only last 3)
        await cleanupOldBackups(repoName.replace('/', '-'));

        // Update repository backup metadata
        const newVersion = {
          versionId: backupInfo.timestamp,
          filename: backupInfo.filename,
          path: backupInfo.path,
          size: backupInfo.size,
          createdAt: backupInfo.timestamp,
          metadataPath: backupInfo.metadataPath,
          fileSize: `${(backupInfo.size / 1024 / 1024).toFixed(1)} MB`
        };

        // Add to versions array (keep only last 3)
        if (!repo.backup.versions) {
          repo.backup.versions = [];
        }
        repo.backup.versions.unshift(newVersion);

        // Keep only last 3 versions
        if (repo.backup.versions.length > 3) {
          repo.backup.versions = repo.backup.versions.slice(0, 3);
        }

        repo.backup = {
          status: 'success',
          lastBackup: backupInfo.timestamp,
          backupCount: (repo.backup.backupCount || 0) + 1,
          latestBackupPath: backupInfo.path,
          latestVersionId: backupInfo.timestamp,
          versions: repo.backup.versions,
          fileSize: `${(backupInfo.size / 1024 / 1024).toFixed(1)} MB`
        };

        await saveDb();
        console.log(`Auto-backup completed for ${repoName}`);
      } else {
        console.log(`No updates found for ${repoName}`);
      }

    } catch (error) {
      console.error(`Error in scheduled backup for ${repoName}:`, error);
    }

    // Schedule next check
    const nextUpdate = setTimeout(scheduleNextUpdate, intervalHours * 60 * 60 * 1000);
    scheduledTasks.set(repoId, nextUpdate);
  };

  // Start the first scheduled update
  const firstUpdate = setTimeout(scheduleNextUpdate, 5000); // Start after 5 seconds
  scheduledTasks.set(repoId, firstUpdate);

  console.log(`Scheduled automatic backup updates for ${repoName} every ${intervalHours} hours`);
}

function restartScheduledBackups(token) {
  if (!token) return;

  let count = 0;
  db.starredRepos.forEach(repo => {
    if (repo.backup && repo.backup.scheduledUpdates) {
      // Only start if not already running
      if (!scheduledTasks.has(repo.id)) {
        scheduleBackupUpdate(repo, token, repo.backup.updateInterval || 24);
        count++;
      }
    }
  });
  if (count > 0) {
    console.log(`Restarted ${count} scheduled backup tasks.`);
  }
}

function stopScheduledBackup(repoId) {
  if (scheduledTasks.has(repoId)) {
    clearTimeout(scheduledTasks.get(repoId));
    scheduledTasks.delete(repoId);
    console.log(`Stopped scheduled backup for repo ${repoId}`);
  }
}

// Backup utility functions
const backupDir = path.join(__dirname, '../backup');

async function ensureBackupDir(repoName) {
  const repoBackupDir = path.join(backupDir, repoName);
  if (!existsSync(repoBackupDir)) {
    mkdirSync(repoBackupDir, { recursive: true });
  }
  return repoBackupDir;
}

async function cleanupOldBackups(repoName) {
  const repoBackupDir = path.join(backupDir, repoName);
  if (!existsSync(repoBackupDir)) return;

  try {
    const files = await fs.readdir(repoBackupDir);
    const zipFiles = files.filter(file => file.endsWith('.zip')).sort().reverse(); // Most recent first

    // Keep only the last 3 backups
    if (zipFiles.length > 3) {
      const filesToDelete = zipFiles.slice(3); // Delete everything after the first 3 (most recent)
      for (const file of filesToDelete) {
        const filePath = path.join(repoBackupDir, file);
        await fs.unlink(filePath);
        console.log(`Deleted old backup: ${file}`);

        // Also delete corresponding metadata file
        const metadataFile = file.replace('.zip', '.json').replace('backup-', 'metadata-');
        const metadataPath = path.join(repoBackupDir, metadataFile);
        if (existsSync(metadataPath)) {
          await fs.unlink(metadataPath);
          console.log(`Deleted old metadata: ${metadataFile}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

async function getRepoBackups(repoName) {
  const repoBackupDir = path.join(backupDir, repoName);
  if (!existsSync(repoBackupDir)) return [];

  try {
    const files = await fs.readdir(repoBackupDir);
    const zipFiles = files.filter(file => file.endsWith('.zip')).sort().reverse(); // Most recent first

    const backups = [];
    for (const zipFile of zipFiles) {
      const zipPath = path.join(repoBackupDir, zipFile);
      const stats = await fs.stat(zipPath);

      // Find corresponding metadata file
      const metadataFile = zipFile.replace('.zip', '.json').replace('backup-', 'metadata-');
      const metadataPath = path.join(repoBackupDir, metadataFile);

      let metadata = null;
      if (existsSync(metadataPath)) {
        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
        } catch (e) {
          console.warn(`Could not read metadata file ${metadataFile}`);
        }
      }

      backups.push({
        filename: zipFile,
        path: zipPath,
        size: stats.size,
        createdAt: stats.birthtime,
        metadata: metadata
      });
    }

    return backups;
  } catch (error) {
    console.error('Error getting repo backups:', error);
    return [];
  }
}

async function createRepoBackup(repo, token) {
  const repoName = repo.full_name.replace('/', '-');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // GitHub API client for JSON responses
  const headers = {
    'X-GitHub-Api-Version': '2022-11-28',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) {
    headers['Authorization'] = 'token ' + token;
  }

  const githubApi = axios.create({
    baseURL: 'https://api.github.com',
    headers: headers
  });

  // --- Fetch latest release tag from GitHub ---
  let releaseTag = null;
  try {
    const releaseResponse = await githubApi.get(`/repos/${repo.full_name}/releases/latest`);
    if (releaseResponse.data && releaseResponse.data.tag_name) {
      releaseTag = releaseResponse.data.tag_name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize tag
      console.log(`Found latest release tag for ${repo.full_name}: ${releaseTag}`);
    }
  } catch (error) {
    // A 404 is common for repos without releases, so we don't log it as a scary error
    if (error.response && error.response.status === 404) {
      console.log(`No GitHub release found for ${repo.full_name}. Falling back to version count.`);
    } else {
      console.warn(`Could not fetch latest release for ${repo.full_name}. Will use backup count. Error: ${error.message}`);
    }
  }

  // --- Duplicate Check: Prevent redownloading same tag OR same content if no tag ---
  if (repo.backup && Array.isArray(repo.backup.versions)) {
    // 1. Tag-based check (Existing Logic)
    if (releaseTag) {
      const isDuplicateTag = repo.backup.versions.some(v =>
        (v.metadata && v.metadata.releaseTag === releaseTag) ||
        (v.filename && v.filename.includes(`tag-${releaseTag}-`))
      );

      if (isDuplicateTag) {
        console.log(`Skipping backup for ${repo.full_name}: Backup for tag ${releaseTag} already exists.`);
        return { skipped: true, reason: 'duplicate', backup: repo.backup };
      }
    }
    // 2. Date-based check (For repos without tags or fallback logic)
    else if (repo.updated_at && repo.backup.lastBackup) {
      const lastBackupTime = new Date(repo.backup.lastBackup).getTime();
      const lastPushTime = new Date(repo.updated_at).getTime();

      // If repo hasn't been pushed to since the last backup was created, skip.
      // We add a small buffer (e.g. 1 min) to account for clock skew/processing time.
      if (lastPushTime < lastBackupTime) {
        console.log(`Skipping backup for ${repo.full_name}: No new commits since last backup (${repo.updated_at}).`);
        return { skipped: true, reason: 'no_changes', backup: repo.backup };
      }
    }
  }
  // --- End Duplicate Check ---
  // --- End fetch ---

  const versionIdentifier = releaseTag ? `tag-${releaseTag}` : `v${(repo.backup.backupCount || 0) + 1}`;
  const backupFileName = `backup-${versionIdentifier}-${timestamp}.zip`;
  const repoBackupDir = await ensureBackupDir(repoName);
  const backupPath = path.join(repoBackupDir, backupFileName);

  console.log(`Creating backup for ${repo.full_name} at ${backupPath}`);

  return new Promise(async (resolve, reject) => {
    try {
      // Download repository as zip from GitHub
      console.log(`Downloading repository archive for ${repo.full_name}...`);
      let archiveResponse;
      try {
        // Use the same githubApi instance but override responseType for this specific call
        archiveResponse = await githubApi.get(`/repos/${repo.full_name}/zipball`, {
          responseType: 'arraybuffer'
        });
      } catch (apiError) {
        console.error(`GitHub API error for ${repo.full_name}:`, apiError.response?.status, apiError.response?.data?.message || apiError.message);

        // Handle specific GitHub API errors
        if (apiError.response?.status === 404) {
          throw new Error(`Repository '${repo.full_name}' not found or not accessible. It might be private or deleted.`);
        } else if (apiError.response?.status === 403) {
          throw new Error(`Access denied to repository '${repo.full_name}' (403). Check if it's private and your token works, or if you hit GitHub Rate Limits.`);
        } else if (apiError.response?.status === 422) {
          throw new Error(`Repository '${repo.full_name}' cannot be downloaded. It might be empty or have download restrictions.`);
        } else {
          throw new Error(`Failed to download repository: ${apiError.response?.data?.message || apiError.message}`);
        }
      }

      // Create write stream for the downloaded zip file
      const output = createWriteStream(backupPath);

      output.on('error', (err) => {
        console.error('Output stream error:', err);
        reject(err);
      });

      output.on('close', async () => {
        try {
          const stats = await fs.stat(backupPath);
          console.log(`Backup created: ${backupFileName} (${stats.size} bytes)`);

          // Create metadata file alongside the zip
          const metadata = {
            repoName: repo.full_name,
            repoId: repo.id,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            url: repo.html_url,
            owner: repo.owner.login,
            backupDate: new Date().toISOString(),
            backupVersion: '2.0',
            releaseTag: releaseTag, // Add the release tag to metadata
            fileSize: stats.size,
            originalZipName: backupFileName,
            downloadUrl: `https://api.github.com/repos/${repo.full_name}/zipball`
          };

          const metadataPath = path.join(repoBackupDir, `metadata-${timestamp}.json`);
          await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

          resolve({
            path: backupPath,
            filename: backupFileName,
            size: stats.size,
            timestamp: new Date().toISOString(),
            metadataPath: metadataPath
          });

        } catch (statError) {
          console.error('Error getting file stats:', statError);
          reject(statError);
        }
      });

      // Write the downloaded zip data to file
      output.write(archiveResponse.data);
      output.end();

    } catch (error) {
      console.error('Error creating backup:', error);

      // Ensure backup status is reset to error state
      try {
        repo.backup.status = 'error';
        repo.backup.lastError = error.message;
        await saveDb();
      } catch (dbError) {
        console.error('Error updating backup status:', dbError);
      }

      reject(error);
    }
  });
}


// Middleware
app.use(cors({
  origin: true,
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
  function (accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    return done(null, profile);
  }));

passport.serializeUser(function (user, done) {
  done(null, user);
});

// Report running app version for the frontend indicator
app.get('/api/app-version', (req, res) => {
  const version = process.env.APP_VERSION || null;
  res.json({ version });
});
passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

// Routes for OAuth
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'read:user', 'repo', 'write:repo', 'gist'] }));

app.get('/auth/github/callback', function (req, res, next) {
  passport.authenticate('github', function (err, user, info) {
    if (err) { return next(err); }

    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    // Determine the correct frontend URL to redirect to after login
    // 1) Use explicit FRONTEND_URL if provided
    // 2) If backend is running on :4000 (dev), default to Vite dev server :5173
    // 3) Otherwise, use the same host (production / deployed)
    let frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      if (host && host.includes(':4000')) {
        frontendUrl = 'http://localhost:5173';
      } else {
        frontendUrl = `${protocol}://${host}`;
      }
    }

    if (!user) {
      // Authentication failed - redirect to current host with error
      return res.redirect(`${frontendUrl}/?login=failed`);
    }

    req.logIn(user, function (err) {
      if (err) { return next(err); }
      // Success - redirect to frontend
      return res.redirect(`${frontendUrl}/`);
    });
  })(req, res, next);
});

app.get('/auth/logout', (req, res, next) => {
  req.logout(function (err) {
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

// --- Scheduled Backups ---
const scheduledBackupTasks = new Map(); // repoId -> Interval
let initialBackupCheckComplete = false;

function startScheduledBackup(repoId, intervalHours, accessToken, runNow = false) {
  stopScheduledBackup(repoId);
  if (!intervalHours || intervalHours < 1) intervalHours = 24;
  console.log(`Scheduling backup for repo ${repoId} every ${intervalHours} hours.`);



  const intervalMs = intervalHours * 60 * 60 * 1000;

  const runBackupTask = async () => {
    console.log(`Running scheduled backup check for repo ${repoId}`);
    // Re-fetch repo from DB to get latest state
    const repo = db.starredRepos.find(r => r.id === repoId);

    if (!repo || !repo.backup || !repo.backup.scheduledUpdates) {
      console.log(`Scheduled backup for ${repoId} aborted: Repo not found or disabled.`);
      stopScheduledBackup(repoId);
      return;
    }

    // Prevent overlapping backups
    if (repo.backup.status === 'in_progress') {
      console.log(`Skipping backup for ${repoId}: Backup already in progress.`);
      return;
    }

    try {
      // Use the token passed during scheduling (from user session)
      const result = await createRepoBackup(repo, accessToken);

      // If skipped, we might want to log it but not treat as error
      if (result && result.skipped) {
        console.log(`Backup skipped for ${repo.full_name}: ${result.reason}`);
        // ensure status is reset to success so it doesn't get stuck in in_progress or error
        repo.backup.status = 'success';
        repo.backup.lastError = null;
        await saveDb();
      } else if (result) {
        // Success! Update DB
        const backupInfo = result;
        await cleanupOldBackups(repo.full_name.replace('/', '-'));

        const newVersion = {
          versionId: backupInfo.timestamp,
          filename: backupInfo.filename,
          path: backupInfo.path,
          size: backupInfo.size,
          createdAt: backupInfo.timestamp,
          metadataPath: backupInfo.metadataPath,
          fileSize: `${(backupInfo.size / 1024 / 1024).toFixed(1)} MB`
        };

        if (!repo.backup.versions) repo.backup.versions = [];
        repo.backup.versions.unshift(newVersion);
        if (repo.backup.versions.length > 3) repo.backup.versions = repo.backup.versions.slice(0, 3);

        repo.backup.status = 'success';
        repo.backup.lastBackup = backupInfo.timestamp;
        repo.backup.backupCount = (repo.backup.backupCount || 0) + 1;
        repo.backup.latestBackupPath = backupInfo.path;
        repo.backup.latestVersionId = backupInfo.timestamp;
        repo.backup.fileSize = `${(backupInfo.size / 1024 / 1024).toFixed(1)} MB`;
        repo.backup.lastError = null;

        await saveDb();
        console.log(`Scheduled backup completed for ${repo.full_name}`);
      }


    } catch (e) {
      console.error(`Scheduled backup failed for ${repoId}:`, e.message);
      if (repo && repo.backup) {
        repo.backup.status = 'error';
        repo.backup.lastError = 'Background backup failed: ' + e.message;
        await saveDb();
      }
    }
  };

  // Run immediately if requested (e.g. on server startup)
  if (runNow) {
    // Add a random small delay (0-10s) to avoid thundering herd if multiple start at once
    const jitter = Math.floor(Math.random() * 10000);
    setTimeout(() => {
      console.log(`executing immediate startup backup for ${repoId} with delay ${jitter}ms`);
      runBackupTask();
    }, jitter);
  }

  // Then schedule interval
  const task = setInterval(runBackupTask, intervalMs);

  scheduledBackupTasks.set(repoId, task);
}


function stopScheduledBackup(repoId) {
  const task = scheduledBackupTasks.get(repoId);
  if (task) {
    clearInterval(task);
    scheduledBackupTasks.delete(repoId);
    console.log(`Stopped scheduled backup for repo ${repoId}`);
  }
}

function restartScheduledBackups(accessToken) {
  console.log('Restarting scheduled backups...');
  // We do NOT clear existing tasks if strictly restarting, but here we want to ensure everything is using the fresh token.
  scheduledBackupTasks.forEach(task => clearInterval(task));
  scheduledBackupTasks.clear();

  if (!db.starredRepos) return;

  const shouldRunImmediate = !initialBackupCheckComplete;
  if (shouldRunImmediate) {
    console.log("Triggering ONE-TIME immediate backup check for all enabled repos...");
  }

  db.starredRepos.forEach((repo, index) => {
    // 1. Reset stuck "in_progress" states (server restart implies interruption)
    if (repo.backup && repo.backup.status === 'in_progress') {
      console.log(`Resetting stuck 'in_progress' status for ${repo.full_name}`);
      repo.backup.status = 'error';
      repo.backup.lastError = 'Backup interrupted by server restart';
    }

    // 2. Schedule
    if (repo.backup && repo.backup.scheduledUpdates) {
      // If immediate run is needed, we stagger it further here (though startScheduledBackup has jitter).
      // We pass runNow = shouldRunImmediate
      startScheduledBackup(repo.id, repo.backup.updateInterval || 24, accessToken, shouldRunImmediate);
    }
  });

  // Save DB if we reset any statuses (optimization: only save if needed, but safe to save once here)
  if (shouldRunImmediate) {
    saveDb().catch(e => console.error("Failed to save DB after status reset:", e));
  }

  initialBackupCheckComplete = true;
}

// --- Background AI Tag Generation ---

let tagGenerationState = {
  isRunning: false,
  progress: 0,
  total: 0,
  status: 'idle', // 'idle', 'running', 'paused', 'paused_rate_limit', 'complete', 'error'
  message: '',
  lastError: null
};

async function runTagGeneration() {
  const reposToProcess = db.starredRepos.filter(r => !r.aiTagsGenerated || (r.aiTags && r.aiTags.length <= 4));

  if (reposToProcess.length === 0) {
    tagGenerationState = { isRunning: false, progress: 0, total: 0, status: 'complete', message: 'All repositories are already tagged.' };
    console.log('AI Tag Generation: All repositories are already tagged.');
    return;
  }

  tagGenerationState = {
    isRunning: true,
    progress: 0,
    total: reposToProcess.length,
    status: 'running',
    message: `Processing ${reposToProcess.length} repositories...`
  };
  console.log(`Starting background AI tag generation. Found ${reposToProcess.length} untagged repos.`);

  for (let i = 0; i < reposToProcess.length; i++) {
    const repo = reposToProcess[i];
    console.log(`Generating tags for ${repo.full_name}... (${tagGenerationState.progress + 1} of ${tagGenerationState.total})`);

    // Check pause state
    while (tagGenerationState.status === 'paused') {
      await delay(5000);
      if (!tagGenerationState.isRunning) return; // Exit if stopped
    }

    const result = await getTagsFromAI(repo);

    if (result.error) {
      const errorMessage = result.error.toString().toLowerCase();
      const isRateLimit = errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('exhausted') || // Gemini: "Resource has been exhausted"
        errorMessage.includes('insufficient_quota') || // OpenAI
        errorMessage.includes('overloaded') || // Anthropic
        errorMessage.includes('quota') || // General quota errors
        errorMessage.includes('402'); // Payment required

      // Check if auto-retry is enabled in settings
      const enableRetry = db.settings?.enableRateLimitRetry !== false;

      if (isRateLimit) {
        if (enableRetry) {
          // Auto-retry mode: wait 60 seconds and resume automatically
          console.warn(`Rate limit hit for ${repo.full_name}. Pausing background process for 60 seconds...`);
          tagGenerationState.status = 'paused_rate_limit';
          tagGenerationState.message = `Rate limit reached. Waiting 60s to resume...`;
          await saveDb();

          await delay(60000); // Wait 60 seconds

          tagGenerationState.status = 'running';
          tagGenerationState.message = `Resuming generation...`;
          // Decrement i to retry this repo
          i--;
          continue;
        } else {
          // Manual resume mode: pause and wait for user to click resume
          console.warn(`Rate limit hit for ${repo.full_name}. Pausing - waiting for user to resume.`);
          tagGenerationState.status = 'paused_rate_limit';
          tagGenerationState.message = `Rate limit reached. Click resume to continue.`;
          tagGenerationState.lastError = result.error.toString();
          await saveDb();

          // Wait in loop until user resumes (status changes to 'running')
          while (tagGenerationState.status === 'paused_rate_limit') {
            await delay(2000);
            if (!tagGenerationState.isRunning) return; // Exit if stopped
          }

          // User resumed - retry this repo
          i--;
          continue;
        }
      }

      // For other errors, just log and continue (repo will be marked as failed or fallback)
      repo.aiTags = [repo.language || "tagging-error"];
      repo.aiTagsGenerated = true; // Mark as done to prevent infinite loops on hard errors
    } else {
      repo.aiTags = result.tags;
      repo.aiTagsGenerated = true; // !result.error;
    }

    tagGenerationState.progress++;
    await saveDb();
    await delay(7000); // Standard delay
  }

  console.log('Background AI tag generation complete.');
  tagGenerationState.status = 'complete';
  tagGenerationState.isRunning = false;
  tagGenerationState.message = `Successfully tagged all ${tagGenerationState.total} repositories.`;
  await saveDb();
}

// AI function using multiple providers
async function getTagsFromAI(repo) {
  // Use DB settings or fallback to env/default
  const settings = db.settings || {};
  const providerName = settings.aiProvider || process.env.DEFAULT_AI_PROVIDER || 'gemini';

  // Update factory to pass model from DB if needed
  const model = settings.aiModel || process.env.OPENROUTER_MODEL;

  try {
    const provider = createAIProvider(providerName, model);
    return await provider.generateTags(repo);
  } catch (error) {
    console.error(`Error with ${providerName} provider for repo:`, repo.full_name, error);
    // Fallback to Gemini if available
    if (providerName !== 'gemini' && process.env.API_KEY) {
      try {
        const fallbackProvider = createAIProvider('gemini');
        return await fallbackProvider.generateTags(repo);
      } catch (fallbackError) {
        console.error("Fallback to Gemini also failed:", fallbackError);
      }
    }
    return { tags: [repo.language || "tagging-error"], error: error };
  }
}

// API Routes
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    // Restart scheduled backups if we have the token
    if (req.user.accessToken) {
      restartScheduledBackups(req.user.accessToken);
    }
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

app.get('/api/fetch-stars', ensureAuth, async (req, res) => {
  try {
    // Start sync process (no progress tracking needed)

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
    let totalPages = 0;

    // First, get the total count
    const firstPageResponse = await githubApi.get(`/user/starred?sort=created&direction=desc&per_page=100&page=1`, {
      headers: { 'Accept': 'application/vnd.github.star+json' }
    });

    // Extract total pages from Link header if available
    if (firstPageResponse.headers.link) {
      const linkHeader = firstPageResponse.headers.link;
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      if (lastPageMatch) {
        totalPages = parseInt(lastPageMatch[1]);
      }
    }

    // If we couldn't determine total pages, estimate based on first page
    if (totalPages === 0) {
      totalPages = Math.ceil(firstPageResponse.data.length / 100);
    }


    // Add first page data
    const firstPageStarredItems = firstPageResponse.data;
    const firstPageRepos = firstPageStarredItems.map(item => ({
      ...item.repo,
      starred_at: item.starred_at
    }));
    allGithubRepos = allGithubRepos.concat(firstPageRepos);

    // Fetch remaining pages
    for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
      const response = await githubApi.get(`/user/starred?sort=created&direction=desc&per_page=100&page=${currentPage}`, {
        headers: { 'Accept': 'application/vnd.github.star+json' }
      });
      const starredItems = response.data;
      const reposFromPage = starredItems.map(item => ({
        ...item.repo,
        starred_at: item.starred_at
      }));
      allGithubRepos = allGithubRepos.concat(reposFromPage);

      // Continue fetching...

      // Log progress
      console.log(`Fetched page ${currentPage} of ${totalPages} (${allGithubRepos.length} repos so far)`);
    }

    console.log(`Found ${allGithubRepos.length} total starred repos on GitHub.`);


    // --- 2. PROCESS REPOS (TAG NEW, UPDATE EXISTING) ---
    const existingRepoMap = new Map(db.starredRepos.map(r => [r.id, r]));
    let newReposCount = 0;

    const processedRepos = [];
    for (let i = 0; i < allGithubRepos.length; i++) {
      const ghRepo = allGithubRepos[i];
      const existingRepo = existingRepoMap.get(ghRepo.id);
      let aiTags;
      let aiTagsGenerated;

      if (existingRepo) {
        aiTags = existingRepo.aiTags;
        aiTagsGenerated = existingRepo.aiTagsGenerated === true;
      } else {
        newReposCount++;
        console.log(`New repo found: ${ghRepo.full_name}. It will be tagged later.`);
        aiTags = [];
        aiTagsGenerated = false;
      }

      let listIds = [];
      if (existingRepo) {
        if (Array.isArray(existingRepo.listIds)) {
          listIds = existingRepo.listIds;
        } else if (existingRepo.listId) {
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
        aiTagsGenerated: aiTagsGenerated,
        userTags: existingRepo ? existingRepo.userTags : [],
        listIds: listIds,
        private: ghRepo.private,
        is_template: ghRepo.is_template,
        mirror_url: ghRepo.mirror_url,
        mirror_url: ghRepo.mirror_url,
        latestReleaseTag: existingRepo ? existingRepo.latestReleaseTag : undefined,
        latestReleaseCheckedAt: existingRepo ? existingRepo.latestReleaseCheckedAt : undefined,
        default_branch: ghRepo.default_branch, // Store default branch for readme image resolution
        // Backup metadata - track multiple versions
        backup: existingRepo && existingRepo.backup ? existingRepo.backup : {
          status: 'none', // 'none', 'success', 'error', 'in_progress'
          lastBackup: null,
          backupCount: 0,
          latestBackupPath: null,
          latestVersionId: null,
          fileSize: null,
          lastError: null,
          versions: [], // Array of backup versions with metadata
          scheduledUpdates: false,
          updateInterval: 24
        }
      });

    }

    db.starredRepos = processedRepos;

    await saveDb();
    console.log(`Sync complete. Added ${newReposCount} new repos.`);


    res.json({ success: true, count: db.starredRepos.length, newRepos: newReposCount });
  } catch (e) {
    console.error('Error fetching stars:', e.response ? e.response.data : e.message);
    res.status(500).json({ error: 'Failed to fetch stars from GitHub.' });
  }
});

// Get repo readme
app.get('/api/repos/:id/readme', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) return res.status(404).json({ error: 'Repository not found' });

  try {
    const githubApi = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': 'token ' + req.user.accessToken,
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github.raw' // Request raw content
      }
    });

    const response = await githubApi.get(`/repos/${repo.full_name}/readme`);
    res.send(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'README not found' });
    }
    console.error(`Error fetching readme for ${repo.full_name}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch README' });
  }
});

// Get repos with pagination and search
app.get('/api/repos', ensureAuth, (req, res) => {
  const { listId, search, page = 1, limit = 9, type = 'all', language = 'all', sort = 'recently-starred' } = req.query;
  const currentPage = parseInt(page, 10);
  const reposPerPage = parseInt(limit, 10);

  let filteredRepos = [...db.starredRepos];

  if (listId && listId !== 'all') {
    filteredRepos = filteredRepos.filter(r => r.listIds && r.listIds.includes(String(listId)));
  }

  switch (type) {
    case 'public':
      filteredRepos = filteredRepos.filter(r => !r.private);
      break;
    case 'private':
      filteredRepos = filteredRepos.filter(r => r.private);
      break;
    case 'sources':
      filteredRepos = filteredRepos.filter(r => !r.fork);
      break;
    case 'forks':
      filteredRepos = filteredRepos.filter(r => r.fork);
      break;
    case 'mirrors':
      filteredRepos = filteredRepos.filter(r => !!r.mirror_url);
      break;
    case 'templates':
      filteredRepos = filteredRepos.filter(r => r.is_template);
      break;
  }

  if (language !== 'all') {
    filteredRepos = filteredRepos.filter(r => r.language === language);
  }

  if (search) {
    const lowercasedSearch = search.toLowerCase();
    filteredRepos = filteredRepos.filter(repo => {
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
  if (sort === 'has-backups') {
    filteredRepos.sort((a, b) => {
      const aHasBackup = a.backup && a.backup.status === 'success' ? 1 : 0;
      const bHasBackup = b.backup && b.backup.status === 'success' ? 1 : 0;
      if (bHasBackup - aHasBackup !== 0) {
        return bHasBackup - aHasBackup;
      }
      // if both have or don't have backups, sort by recently starred (default)
      const timeB = b.starred_at ? new Date(b.starred_at).getTime() : 0;
      const timeA = a.starred_at ? new Date(a.starred_at).getTime() : 0;
      if (!isFinite(timeB)) return 1;
      if (!isFinite(timeA)) return -1;
      return timeB - timeA;
    });
  } else if (sort === 'name-asc') {
    filteredRepos.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } else if (sort === 'stars-desc') {
    filteredRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } else if (sort === 'recently-active') {
    filteredRepos.sort((a, b) => {
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
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

  const CACHE_DURATION = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const reposToReturn = paginatedRepos.map(repo => {
    // Clone to avoid mutating DB objects
    const r = { ...repo };

    // Check cache expiration
    const lastCheck = r.latestReleaseCheckedAt ? new Date(r.latestReleaseCheckedAt).getTime() : 0;
    const isCacheValid = (now - lastCheck) < CACHE_DURATION;

    // If cache is expired, strip the tag from response to force frontend to re-fetch
    if (!isCacheValid) {
      r.latestReleaseTag = undefined;
    }
    return r;
  });

  res.json({
    repos: reposToReturn,
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

  const result = await getTagsFromAI(repo);
  repo.aiTags = result.tags;
  repo.aiTagsGenerated = !result.error;
  await saveDb();
  res.json(repo);
});

// Get available AI providers
app.get('/api/ai/providers', ensureAuth, (req, res) => {
  const providers = [
    { name: 'gemini', displayName: 'Google Gemini', description: 'Fast and accurate tagging with Gemini 2.5 Flash' },
    { name: 'openai', displayName: 'OpenAI GPT-4', description: 'Advanced reasoning with GPT-4' },
    { name: 'anthropic', displayName: 'Anthropic Claude', description: 'Strong technical analysis with Claude' },
    { name: 'openrouter', displayName: 'OpenRouter', description: 'Access various models via OpenRouter' }
  ];

  const currentProvider = db.settings?.aiProvider || process.env.DEFAULT_AI_PROVIDER || 'gemini';
  const currentModel = db.settings?.aiModel || process.env.OPENROUTER_MODEL;
  const enableRateLimitRetry = db.settings?.enableRateLimitRetry !== false; // default true

  res.json({
    providers,
    currentProvider,
    currentModel,
    enableRateLimitRetry
  });
});

// Set default AI provider
app.post('/api/ai/provider', ensureAuth, async (req, res) => {
  const { provider, model, enableRateLimitRetry } = req.body;
  if (!provider || !['gemini', 'openai', 'anthropic', 'openrouter'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  // Save to DB
  if (!db.settings) db.settings = {};
  db.settings.aiProvider = provider;

  if (provider === 'openrouter' && model) {
    db.settings.aiModel = model;
  }

  // Handle rate limit retry setting
  if (typeof enableRateLimitRetry === 'boolean') {
    db.settings.enableRateLimitRetry = enableRateLimitRetry;
  }

  await saveDb();

  res.json({
    success: true,
    provider: db.settings.aiProvider,
    model: db.settings.aiModel,
    enableRateLimitRetry: db.settings.enableRateLimitRetry
  });
});

// Fetch OpenRouter Models
app.get('/api/openrouter/models', ensureAuth, async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'OpenRouter API key not configured' });
  }

  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    // Sort and format models
    const models = response.data.data
      .map(m => ({ id: m.id, name: m.name, pricing: m.pricing }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(models);
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error.message);
    res.status(500).json({ error: 'Failed to fetch models from OpenRouter' });
  }
});





// Analytics: Summary Stats
app.get('/api/analytics/summary', ensureAuth, (req, res) => {
  try {
    const repos = db.starredRepos;
    const totalStars = repos.length;

    // 1. Language Distribution
    const languageCounts = {};
    repos.forEach(repo => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });

    // Sort and get top 10
    const topLanguages = Object.entries(languageCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // 2. Stars over time (monthly buckets for last 12 months)
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(now.getMonth() - 11);

    const activityMap = {}; // "YYYY-MM" -> count

    repos.forEach(repo => {
      if (repo.starred_at) {
        const date = new Date(repo.starred_at);
        if (date >= oneYearAgo) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          activityMap[key] = (activityMap[key] || 0) + 1;
        }
      }
    });

    const activityTrend = Object.entries(activityMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Top Tags
    const tagCounts = {};
    repos.forEach(repo => {
      // Combine user tags and AI tags
      const allTags = new Set([
        ...(repo.userTags || []),
        ...(repo.aiTags || [])
      ]);

      allTags.forEach(tag => {
        if (tag && typeof tag === 'string') {
          const trimmed = tag.trim();
          if (trimmed.length > 0) {
            // Normalize to lowercase to avoid "TypeScript" vs "typescript" splits
            const normalizedTag = trimmed.toLowerCase();
            tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
          }
        }
      });
    });

    const topTags = Object.entries(tagCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    console.log('DEBUG: Top Tags being sent:', JSON.stringify(topTags, null, 2));

    res.json({
      totalStars,
      topLanguages,
      activityTrend,
      topTags
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Analytics: Activity Trend with Range
app.get('/api/analytics/activity', ensureAuth, (req, res) => {
  try {
    const range = req.query.range || '1y'; // '1m', '1y', 'all'
    const repos = db.starredRepos;
    const now = new Date();
    const activityMap = {};

    let startDate = null;
    let formatKey = null;

    if (range === '1m') {
      // Last 30 days, daily buckets
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      formatKey = (date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (range === '1y') {
      // Last 12 months, monthly buckets
      startDate = new Date();
      startDate.setMonth(now.getMonth() - 11); // Current month + 11 prev = 12
      startDate.setDate(1); // Start of month
      formatKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    } else if (range === 'all') {
      // All time, monthly buckets
      startDate = new Date(0); // Epoch
      formatKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    }

    repos.forEach(repo => {
      if (repo.starred_at) {
        const date = new Date(repo.starred_at);
        if (date >= startDate) {
          const key = formatKey(date);
          activityMap[key] = (activityMap[key] || 0) + 1;
        }
      }
    });

    const activityTrend = Object.entries(activityMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(activityTrend);

  } catch (error) {
    console.error('Activity Analytics Error:', error);
    res.status(500).json({ error: 'Failed to generate activity' });
  }
});

// Analytics: Activity Heatmap Data
app.get('/api/analytics/heatmap', ensureAuth, (req, res) => {
  try {
    // Return array of date strings 'YYYY-MM-DD' for every starred repo
    // Frontend calendar chart will count frequency
    const dates = db.starredRepos
      .filter(r => r.starred_at)
      .map(r => r.starred_at.split('T')[0]);

    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

app.post('/api/ai/start-generate-all-tags', ensureAuth, (req, res) => {
  if (tagGenerationState.isRunning) {
    return res.status(409).json({ message: 'A tag generation process is already running.' });
  }
  // Fire and forget - don't await this
  runTagGeneration();
  res.status(202).json({ message: 'Tag generation process started.' });
});

// Get tag generation status for progress polling
app.get('/api/ai/tags/status', ensureAuth, (req, res) => {
  res.json({
    isRunning: tagGenerationState.isRunning,
    progress: tagGenerationState.progress,
    total: tagGenerationState.total,
    status: tagGenerationState.status,
    message: tagGenerationState.message,
    lastError: tagGenerationState.lastError
  });
});

// Resume tag generation after rate limit pause
app.post('/api/ai/tags/resume', ensureAuth, (req, res) => {
  if (tagGenerationState.status === 'paused_rate_limit' || tagGenerationState.status === 'paused') {
    tagGenerationState.status = 'running';
    tagGenerationState.message = 'Resuming generation...';
    tagGenerationState.lastError = null;
    res.json({ success: true, message: 'Tag generation resumed.' });
  } else if (!tagGenerationState.isRunning) {
    res.status(400).json({ error: 'No tag generation process is running.' });
  } else {
    res.status(400).json({ error: 'Tag generation is not paused.' });
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
    db.lists.sort((a, b) => a.name.localeCompare(b.name));
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

  if (db.lists.some(l => l.id !== listId && l.name.toLowerCase() === trimmedName.toLowerCase())) {
    return res.status(409).json({ error: 'A list with this name already exists.' });
  }

  listToUpdate.name = trimmedName;
  db.lists.sort((a, b) => a.name.localeCompare(b.name));
  await saveDb();

  res.json(listToUpdate);
});

app.delete('/api/lists/:id', ensureAuth, async (req, res) => {
  const listId = req.params.id;
  const listIndex = db.lists.findIndex(l => l.id === listId);

  if (listIndex === -1) {
    return res.status(404).json({ error: 'List not found' });
  }

  db.lists.splice(listIndex, 1);

  db.starredRepos.forEach(repo => {
    if (repo.listIds && repo.listIds.includes(listId)) {
      repo.listIds = repo.listIds.filter(id => id !== listId);
    }
  });

  await saveDb();
  res.status(204).send();
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
    if (!Array.isArray(repo.listIds)) {
      repo.listIds = repo.listId ? [repo.listId] : [];
      delete repo.listId;
    }

    const listIndex = repo.listIds.indexOf(listToToggle);
    if (listIndex > -1) {
      repo.listIds.splice(listIndex, 1);
    } else {
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

// Export/Import Routes
app.get('/api/export', ensureAuth, (req, res) => {
  res.setHeader('Content-disposition', 'attachment; filename=starwise_backup.json');
  res.setHeader('Content-type', 'application/json');
  res.sendFile(dbPath, (err) => {
    if (err) {
      console.error('Error sending db.json:', err);
      // Make sure to not send headers twice
      if (!res.headersSent) {
        res.status(500).send('Could not export data.');
      }
    }
  });
});

app.post('/api/import', ensureAuth, async (req, res) => {
  const data = req.body; // The whole body is the JSON data from the file

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid import data. Expected a JSON object.' });
  }

  // Basic validation: check for expected top-level keys
  const expectedKeys = ['starredRepos', 'lists'];
  const hasKeys = expectedKeys.every(key => key in data);

  if (!hasKeys || !Array.isArray(data.starredRepos) || !Array.isArray(data.lists)) {
    return res.status(400).json({ error: 'Invalid data format. Must be an object with "starredRepos" and "lists" arrays.' });
  }

  try {
    // Overwrite the db object and save it.
    db = data;
    // Re-initialize backup structures in case the imported data doesn't have them
    initializeBackupStructures();
    await saveDb();
    res.json({ success: true, message: 'Data imported successfully.' });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data.' });
  }
});

app.post('/api/export/selective', ensureAuth, (req, res) => {
  const { listIds } = req.body;

  if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
    return res.status(400).json({ error: 'Invalid request. Please provide an array of listIds.' });
  }

  const filteredLists = db.lists.filter(list => listIds.includes(list.id));
  const filteredRepos = db.starredRepos.filter(repo =>
    repo.listIds && repo.listIds.some(listId => listIds.includes(listId))
  );

  const exportData = {
    lists: filteredLists,
    starredRepos: filteredRepos,
  };

  res.setHeader('Content-disposition', 'attachment; filename=starwise_selective_backup.json');
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(exportData, null, 2));
});

// Get latest release for a repo
app.get('/api/repos/:id/latest-release', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repo not found' });
  }

  // Check cache validity (24 hours)
  const CACHE_DURATION = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lastCheck = repo.latestReleaseCheckedAt ? new Date(repo.latestReleaseCheckedAt).getTime() : 0;
  const isCacheValid = (now - lastCheck) < CACHE_DURATION;

  // If cached and valid, return it
  if (repo.latestReleaseTag !== undefined && isCacheValid) {
    return res.json({ latestReleaseTag: repo.latestReleaseTag });
  }

  const githubApi = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      'Authorization': 'token ' + req.user.accessToken,
      'X-GitHub-Api-Version': '2022-11-28',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  try {
    const releaseResponse = await githubApi.get(`/repos/${repo.full_name}/releases/latest`);
    let releaseTag = null;
    if (releaseResponse.data && releaseResponse.data.tag_name) {
      releaseTag = releaseResponse.data.tag_name;
    }
    repo.latestReleaseTag = releaseTag; // Update the repo object
    repo.latestReleaseCheckedAt = new Date().toISOString();
    await saveDb(); // Save the update
    res.json({ latestReleaseTag: releaseTag });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // 404 means no releases, which is valid. We can cache this null result.
      repo.latestReleaseTag = null; // Explicitly set to null to prevent refetching
      repo.latestReleaseCheckedAt = new Date().toISOString();
      await saveDb();
      return res.json({ latestReleaseTag: null });
    }
    console.error(`Error fetching latest release for ${repo.full_name}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch latest release' });
  }
});

// Backup endpoints
app.post('/api/repos/:id/backup', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  try {
    // Ensure backup object exists with proper structure
    if (!repo.backup) {
      repo.backup = {
        status: 'none',
        lastBackup: null,
        backupCount: 0,
        latestBackupPath: null,
        latestVersionId: null,
        fileSize: null,
        lastError: null,
        versions: [],
        scheduledUpdates: false,
        updateInterval: 24
      };
      console.log(`Initialized backup structure for repository ${repo.full_name}`);
    }

    // Update backup status to in_progress
    repo.backup.status = 'in_progress';
    await saveDb();

    // Create backup
    const backupInfo = await createRepoBackup(repo, req.user.accessToken);

    if (backupInfo && backupInfo.skipped) {
      // RESET status to success if skipped
      repo.backup.status = 'success';
      repo.backup.lastError = null;
      await saveDb();

      return res.json({
        success: true,
        message: 'Backup skipped: Version already exists.',
        backup: repo.backup
      });
    }

    // Clean up old backups (keep only last 3)
    await cleanupOldBackups(repo.full_name.replace('/', '-'));

    // Update repository backup metadata with version tracking
    const newVersion = {
      versionId: backupInfo.timestamp,
      filename: backupInfo.filename,
      path: backupInfo.path,
      size: backupInfo.size,
      createdAt: backupInfo.timestamp,
      metadataPath: backupInfo.metadataPath,
      fileSize: `${(backupInfo.size / 1024 / 1024).toFixed(1)} MB`
    };

    // Add to versions array (keep only last 3)
    if (!repo.backup.versions) {
      repo.backup.versions = [];
    }
    repo.backup.versions.unshift(newVersion); // Add to beginning (most recent first)

    // Keep only last 3 versions
    if (repo.backup.versions.length > 3) {
      repo.backup.versions = repo.backup.versions.slice(0, 3);
    }

    // Update backup object without overwriting - preserve all fields
    repo.backup.status = 'success';
    repo.backup.lastBackup = backupInfo.timestamp;
    repo.backup.backupCount = (repo.backup.backupCount || 0) + 1;
    repo.backup.latestBackupPath = backupInfo.path;
    repo.backup.latestVersionId = backupInfo.timestamp;
    repo.backup.fileSize = `${(backupInfo.size / 1024 / 1024).toFixed(1)} MB`;
    repo.backup.lastError = null; // Clear any previous error
    repo.backup.scheduledUpdates = true; // Enable automatic updates
    repo.backup.updateInterval = 24; // Check every 24 hours

    await saveDb();

    // Start scheduled backup updates for this repo
    startScheduledBackup(repo.id, 24, req.user.accessToken, true); // Run immediate check since user explicitly created it

    res.json({
      success: true,
      message: 'Backup created successfully. Scheduled updates enabled.',
      backup: repo.backup
    });

  } catch (error) {
    console.error('Backup error:', error);

    // Update backup status to error (with error handling)
    try {
      // Ensure backup object exists before setting error status
      if (!repo.backup) {
        repo.backup = {
          status: 'none',
          lastBackup: null,
          backupCount: 0,
          latestBackupPath: null,
          latestVersionId: null,
          fileSize: null,
          lastError: null,
          versions: [],
          scheduledUpdates: false,
          updateInterval: 24
        };
      }
      repo.backup.status = 'error';
      repo.backup.lastError = error.message;
      await saveDb();
    } catch (dbError) {
      console.error('Error updating backup status in database:', dbError);
      // Continue with response even if DB update fails
    }

    res.status(500).json({
      error: 'Failed to create backup',
      details: error.message,
      repoId: repo.id,
      repoName: repo.full_name
    });
  }
});

app.get('/api/repos/:id/backup-status', ensureAuth, (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({
    hasBackup: repo.backup && repo.backup.status === 'success',
    status: repo.backup ? repo.backup.status : 'none',
    lastBackup: repo.backup ? repo.backup.lastBackup : null,
    backupCount: repo.backup ? repo.backup.backupCount : 0,
    fileSize: repo.backup ? repo.backup.fileSize : null,
    versions: repo.backup ? repo.backup.versions : [],
    latestVersionId: repo.backup ? repo.backup.latestVersionId : null
  });
});

// Get all backups for a repository
app.get('/api/repos/:id/backups', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  try {
    const repoName = repo.full_name.replace('/', '-');
    const backups = await getRepoBackups(repoName);

    res.json({
      repoName: repo.full_name,
      repoId: repo.id,
      backups: backups,
      totalBackups: backups.length
    });
  } catch (error) {
    console.error('Error getting backups:', error);
    res.status(500).json({ error: 'Failed to get backups' });
  }
});

// Enable/disable scheduled backup updates
app.post('/api/repos/:id/schedule-backup', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const { enabled = true, intervalHours = 24 } = req.body;
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  try {
    if (enabled) {
      scheduleBackupUpdate(repo, req.user.accessToken, intervalHours);
      repo.backup.scheduledUpdates = true;
      repo.backup.updateInterval = intervalHours;
    } else {
      stopScheduledBackup(repoId);
      repo.backup.scheduledUpdates = false;
    }

    await saveDb();

    res.json({
      success: true,
      message: enabled ? 'Scheduled backup updates enabled' : 'Scheduled backup updates disabled',
      scheduledUpdates: repo.backup.scheduledUpdates,
      updateInterval: repo.backup.updateInterval
    });
  } catch (error) {
    console.error('Error managing scheduled backup:', error);
    res.status(500).json({ error: 'Failed to manage scheduled backup' });
  }
});

// Enable auto-updates for a backup
app.post('/api/repos/:id/backup/enable-auto-updates', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  if (!repo.backup || repo.backup.status === 'none') {
    return res.status(400).json({ error: 'No backup exists for this repository' });
  }

  try {
    const intervalHours = repo.backup.updateInterval || 24;
    startScheduledBackup(repo.id, intervalHours, req.user.accessToken);
    repo.backup.scheduledUpdates = true;

    await saveDb();

    res.json({
      success: true,
      message: 'Auto-updates enabled',
      scheduledUpdates: true
    });
  } catch (error) {
    console.error('Error enabling auto-updates:', error);
    res.status(500).json({ error: 'Failed to enable auto-updates' });
  }
});

// Get all repositories with backups (for Backups tab)
app.get('/api/backups', ensureAuth, (req, res) => {
  const reposWithBackups = db.starredRepos
    .filter(r => r.backup && r.backup.status !== 'none')
    .map(r => ({
      id: r.id,
      full_name: r.full_name,
      html_url: r.html_url,
      description: r.description,
      language: r.language,
      backup: r.backup
    }));

  res.json(reposWithBackups);
});

// Toggle backup schedule
app.patch('/api/repos/:id/backup/schedule', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const { enabled } = req.body;
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo || !repo.backup) return res.status(404).json({ error: 'Repository or backup not found' });

  try {
    repo.backup.scheduledUpdates = enabled;

    if (enabled) {
      // Start/Restart schedule (default 24h)
      startScheduledBackup(repoId, repo.backup.updateInterval || 24, req.user.accessToken);
    } else {
      stopScheduledBackup(repoId);
    }

    await saveDb();
    res.json({ success: true, enabled: repo.backup.scheduledUpdates });
  } catch (error) {
    console.error('Error toggling backup schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete or disable backups
app.delete('/api/repos/:id/backup', ensureAuth, async (req, res) => {
  console.log('DELETE /api/repos/:id/backup called', req.params.id, req.query);
  const repoId = parseInt(req.params.id, 10);
  const deleteFiles = req.query.deleteFiles === 'true';
  const resetRecord = req.query.resetRecord === 'true'; // New param to clear DB record
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) return res.status(404).json({ error: 'Repository not found' });

  try {
    // Stop schedule
    stopScheduledBackup(repoId);

    // Conditionally delete files
    if (deleteFiles) {
      const repoName = repo.full_name.replace('/', '-');
      const repoBackupDir = path.join(backupDir, repoName);

      if (existsSync(repoBackupDir)) {
        await fs.rm(repoBackupDir, { recursive: true, force: true });
      }
    }

    // Update backup object
    repo.backup.scheduledUpdates = false;

    // Reset record if requested (Forget) OR if deleting files (Delete All)
    if (resetRecord || deleteFiles) {
      repo.backup = {
        status: 'none',
        lastBackup: null,
        backupCount: 0,
        latestBackupPath: null,
        latestVersionId: null,
        fileSize: null,
        lastError: null,
        versions: [],
        scheduledUpdates: false,
        updateInterval: 24
      };
    }

    await saveDb();

    let message = 'Automatic backups disabled.';
    if (deleteFiles) message = 'Backups deleted and disabled.';
    else if (resetRecord) message = 'Backup record removed, files preserved.';

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error deleting backups:', error);
    res.status(500).json({ error: 'Failed to delete backups' });
  }



});

// Download a specific backup version
app.get('/api/repos/:id/backup/:filename', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const filename = req.params.filename;
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) return res.status(404).json({ error: 'Repository not found' });

  const repoName = repo.full_name.replace('/', '-');
  const filePath = path.join(backupDir, repoName, filename);

  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }

  res.download(filePath, filename);
});

// Delete a specific backup version
app.delete('/api/repos/:id/backup/:filename', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const filename = req.params.filename;
  const repo = db.starredRepos.find(r => r.id === repoId);

  if (!repo) return res.status(404).json({ error: 'Repository not found' });

  try {
    const repoName = repo.full_name.replace('/', '-');
    const filePath = path.join(backupDir, repoName, filename);
    const metadataPath = filePath.replace('.zip', '.json').replace('backup-', 'metadata-');

    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
    if (existsSync(metadataPath)) {
      await fs.unlink(metadataPath);
    }

    // Update versions array in DB
    if (repo.backup && repo.backup.versions) {
      repo.backup.versions = repo.backup.versions.filter(v => v.filename !== filename);

      // Update latest version info if we deleted the latest one
      if (repo.backup.versions.length > 0) {
        const latest = repo.backup.versions[0];
        repo.backup.lastBackup = latest.createdAt;
        repo.backup.latestBackupPath = latest.path;
        repo.backup.latestVersionId = latest.versionId;
        repo.backup.fileSize = latest.fileSize;
      } else {
        repo.backup.status = 'none';
        repo.backup.lastBackup = null;
        repo.backup.latestBackupPath = null;
        repo.backup.latestVersionId = null;
        repo.backup.fileSize = null;
      }

      await saveDb();
    }

    res.json({ success: true, message: 'Backup version deleted', backup: repo.backup });
  } catch (error) {
    console.error('Error deleting backup version:', error);
    res.status(500).json({ error: 'Failed to delete backup version' });
  }
});

// Import GitHub lists from extension
app.post('/api/lists/import-github', ensureAuth, async (req, res) => {
  const { lists } = req.body;

  if (!lists || !Array.isArray(lists)) {
    return res.status(400).json({ error: 'Invalid lists data' });
  }

  try {
    let createdLists = 0;
    let totalRepos = 0;
    const results = [];

    for (const listData of lists) {
      const { name, repos, description = '' } = listData;

      if (!name || !repos || !Array.isArray(repos)) {
        console.warn('Skipping invalid list:', listData);
        continue;
      }

      let targetListId;
      let isNewList = false;

      // Check if list already exists
      const existingList = db.lists.find(l => l.name.toLowerCase() === name.toLowerCase());

      if (existingList) {
        targetListId = existingList.id;
        console.log(`List "${name}" already exists (ID: ${targetListId}), updating repos...`);
      } else {
        targetListId = generateSlug(name);
        const newList = {
          id: targetListId,
          name: name,
          description: description
        };
        db.lists.push(newList);
        createdLists++;
        isNewList = true;
        console.log(`Created new list "${name}" (ID: ${targetListId})`);
      }

      // Add repos to the list
      let addedReposCount = 0;

      for (const repoName of repos) {
        const cleanRepoName = repoName.trim();
        let repo = db.starredRepos.find(r => r.full_name.toLowerCase() === cleanRepoName.toLowerCase());



        // If repo doesn't exist in our DB, try to fetch it from GitHub
        if (!repo) {

          try {
            // Create a temporary API client with the user's token
            const githubApi = axios.create({
              baseURL: 'https://api.github.com',
              headers: {
                'Authorization': 'token ' + req.user.accessToken,
                'X-GitHub-Api-Version': '2022-11-28'
              }
            });

            const { data } = await githubApi.get(`/repos/${cleanRepoName}`);

            repo = {
              id: data.id,
              node_id: data.node_id,
              name: data.name,
              full_name: data.full_name,
              private: data.private,
              html_url: data.html_url,
              description: data.description,
              fork: data.fork,
              url: data.url,
              created_at: data.created_at,
              updated_at: data.updated_at,
              pushed_at: data.pushed_at,
              homepage: data.homepage,
              size: data.size,
              stargazers_count: data.stargazers_count,
              watchers_count: data.watchers_count,
              language: data.language,
              forks_count: data.forks_count,
              open_issues_count: data.open_issues_count,
              master_branch: data.default_branch,
              default_branch: data.default_branch,
              score: data.score,
              owner: {
                login: data.owner.login,
                id: data.owner.id,
                avatar_url: data.owner.avatar_url,
                html_url: data.owner.html_url
              },
              topics: data.topics || [],
              listIds: []
            };

            db.starredRepos.push(repo);

          } catch (err) {
            console.error(`Failed to fetch repo ${cleanRepoName}:`, err.message);
            // Skip this repo if we can't fetch it
            continue;
          }
        }

        if (repo) {
          if (!repo.listIds) repo.listIds = [];
          if (!repo.listIds.includes(targetListId)) {
            repo.listIds.push(targetListId);
            addedReposCount++;
            totalRepos++;
          }
        }
      }

      results.push({
        name,
        status: isNewList ? 'created' : 'updated',
        repos: addedReposCount,
        totalInList: repos.length
      });
    }

    // Sort lists alphabetically
    db.lists.sort((a, b) => a.name.localeCompare(b.name));

    await saveDb();

    res.json({
      success: true,
      createdLists,
      totalRepos,
      results
    });

  } catch (error) {
    console.error('Error importing GitHub lists:', error);
    res.status(500).json({ error: 'Failed to import lists' });
  }
});

// --- Share My Stack Endpoints ---

// Generate Markdown for a list or all repos
app.post('/api/share/markdown', ensureAuth, (req, res) => {
  const { listId, includeDescription = true, includeTags = true } = req.body;

  let reposToShare = db.starredRepos;
  let title = 'My StarWise Stack';

  // Filter by list if provided
  if (listId && listId !== 'all') {
    const list = db.lists.find(l => l.id === listId);
    if (list) {
      reposToShare = reposToShare.filter(r => r.listIds && r.listIds.includes(listId));
      title = `${list.name} Stack`;
    }
  }

  // Generate Markdown
  let markdown = `# ${title}\n\nGenerated by [StarWise](https://github.com/hamzamix/StarWise)\n\n`;

  if (reposToShare.length === 0) {
    markdown += `*No repositories found in this stack.*\n`;
  } else {
    reposToShare.forEach(repo => {
      markdown += `### [${repo.full_name}](${repo.html_url})\n`;
      if (includeDescription && repo.description) {
        markdown += `${repo.description}\n\n`;
      }

      if (includeTags) {
        const tags = [...(repo.userTags || []), ...(repo.aiTags || [])];
        if (tags.length > 0) {
          markdown += `**Tags:** ${tags.map(t => `\`${t}\``).join(', ')}\n\n`;
        }
      }
      markdown += `---\n`;
    });
  }

  res.json({ markdown });
});

// Publish to GitHub Gist
app.post('/api/share/gist', ensureAuth, async (req, res) => {
  const { content, description, isPublic = false } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const githubApi = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': 'token ' + req.user.accessToken,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const response = await githubApi.post('/gists', {
      description: description || 'Created with StarWise',
      public: isPublic,
      files: {
        'starwise-stack.md': {
          content: content
        }
      }
    });

    res.json({
      success: true,
      html_url: response.data.html_url,
      id: response.data.id
    });

  } catch (error) {
    console.error('Gist creation failed:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: 'Failed to create Gist. Please ensure you have re-logged in to grant Gist permissions.'
    });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../public')));

// The "catchall" handler: for any request that doesn't
// match one of the API routes above, send back the app's index.html file.
// Prefer the built SPA at ../public/index.html (production),
// and fall back to ../index.html (useful for local setups).
app.get('*', (req, res) => {
  const builtIndex = path.join(__dirname, '../public/index.html');
  const rootIndex = path.join(__dirname, '../index.html');
  try {
    const fsSync = require('fs');
    if (fsSync.existsSync(builtIndex)) {
      res.set('Cache-Control', 'no-store');
      return res.sendFile(builtIndex);
    }
  } catch (e) {
    // ignore and fallback
  }
  res.set('Cache-Control', 'no-store');
  return res.sendFile(rootIndex);
});

const startServer = async () => {
  await loadDb();
  app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
}

startServer();
