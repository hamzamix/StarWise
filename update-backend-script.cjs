const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, 'backend', 'index.js');
let content = fs.readFileSync(backendPath, 'utf8');

const startMarker = "// Delete all backups for a repo (Disable)";
const startIndex = content.indexOf(startMarker);

if (startIndex === -1) {
  console.error('Could not find start marker');
  process.exit(1);
}

// Find the end of the function. It starts with app.delete(..., (req, res) => {
// So we look for the matching closing brace and parenthesis.
// Since we know the structure, we can look for the next "});" that appears at the start of a line or after a newline.
// But to be safer, let's just look for the next "});" after the start index.
// This is a bit risky if there are nested "});" strings, but in this specific function there shouldn't be.
// Actually, let's look for the next "});" followed by a newline.

const endIndex = content.indexOf('});', startIndex);

if (endIndex === -1) {
  console.error('Could not find end marker');
  process.exit(1);
}

// The replacement content
const replacementContent = `// Delete all backups for a repo (Disable)
app.delete('/api/repos/:id/backup', ensureAuth, async (req, res) => {
  const repoId = parseInt(req.params.id, 10);
  const deleteFiles = req.query.deleteFiles === 'true';
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
    
    if (deleteFiles) {
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
    
    const message = deleteFiles 
      ? 'Backups deleted and disabled.' 
      : 'Automatic backups disabled. Existing backups preserved.';
      
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error deleting backups:', error);
    res.status(500).json({ error: 'Failed to delete backups' });
  }
`;

// Construct new content
const newContent = content.substring(0, startIndex) + replacementContent + content.substring(endIndex + 3); // +3 for "});"

fs.writeFileSync(backendPath, newContent, 'utf8');
console.log('Successfully updated backend/index.js using dynamic replacement');
