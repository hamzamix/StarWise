/**
 * ONE-TIME DATABASE FIX SCRIPT
 * Run this ONCE to fix all existing databases with incomplete structures
 * Usage: docker exec starwise_app node /app/fix-database.js
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = '/data/db.json';

console.log('🔧 Starting database fix script...\n');

// Load database
let db;
try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    db = JSON.parse(data);
    console.log(`✅ Loaded database: ${db.starredRepos.length} repos, ${db.lists.length} lists\n`);
} catch (error) {
    console.error('❌ Failed to load database:', error.message);
    process.exit(1);
}

// Backup original
const backupPath = `${DB_PATH}.before-fix.${Date.now()}.json`;
fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`💾 Created backup: ${backupPath}\n`);

// Fix ALL repos
let fixed = 0;
let alreadyComplete = 0;

db.starredRepos.forEach((repo, index) => {
    let repoFixed = false;

    // Ensure backup object exists
    if (!repo.backup) {
        repo.backup = {};
        repoFixed = true;
    }

    // Ensure ALL required backup fields
    const requiredFields = {
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

    for (const [field, defaultValue] of Object.entries(requiredFields)) {
        if (repo.backup[field] === undefined) {
            repo.backup[field] = defaultValue;
            repoFixed = true;
        }
    }

    // Ensure latestReleaseTag field exists
    if (repo.latestReleaseTag === undefined) {
        repo.latestReleaseTag = null;
        repoFixed = true;
    }

    if (repoFixed) {
        fixed++;
        if (fixed <= 5) {
            console.log(`  Fixed repo ${index + 1}: ${repo.full_name}`);
        }
    } else {
        alreadyComplete++;
    }
});

console.log(`\n📊 Results:`);
console.log(`   ✅ Fixed: ${fixed} repos`);
console.log(`   ✓  Already complete: ${alreadyComplete} repos`);

// Set database version
db.dbVersion = '1.2.0';

// Save fixed database
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`\n💾 Saved fixed database to: ${DB_PATH}`);
console.log(`\n✅ DATABASE FIX COMPLETE!\n`);
console.log(`You can now restart the container and all features should work.`);
console.log(`If anything goes wrong, restore from: ${backupPath}\n`);
