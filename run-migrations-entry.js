/**
 * Root-level entry script for running migrations.
 * This script is intended to be placed at /app/run-migrations.js in the Docker image.
 * It requires the migrations module from /app/migrations.js (also copied to root).
 * This setup avoids issues where /app/backend is mounted as a volume, hiding image-baked files.
 */

const fs = require('fs');
const path = require('path');

// We expect the migrations module to be at /app/migrations.js
const MIGRATIONS_PATH = '/app/migrations.js';
const DB_PATH = '/data/db.json';
const LEGACY_DB_PATH = '/app/backend/db.json';
const LEGACY_DATA_PATH = '/app/legacy-data/db.json'; // Alternative safe mount location

console.log('🚀 Starting migration runner...');

if (!fs.existsSync(MIGRATIONS_PATH)) {
    console.error(`❌ Error: Migrations module not found at ${MIGRATIONS_PATH}`);
    process.exit(1);
}

// Check for legacy database and migrate if needed
if (!fs.existsSync(DB_PATH)) {
    // Try primary legacy location first
    let legacyPath = null;
    if (fs.existsSync(LEGACY_DB_PATH)) {
        legacyPath = LEGACY_DB_PATH;
    } else if (fs.existsSync(LEGACY_DATA_PATH)) {
        legacyPath = LEGACY_DATA_PATH;
    }

    if (legacyPath) {
        console.log('📦 Found legacy database at ' + legacyPath);
        console.log('📋 Copying to new location: ' + DB_PATH);
        try {
            const legacyData = fs.readFileSync(legacyPath, 'utf8');
            fs.writeFileSync(DB_PATH, legacyData, 'utf8');
            console.log('✅ Legacy database copied successfully!');
        } catch (copyErr) {
            console.error('❌ Failed to copy legacy database:', copyErr);
            // Continue anyway, app will create new db
        }
    }
}

try {
    const DatabaseMigrations = require(MIGRATIONS_PATH);

    // Check if DB exists
    if (!fs.existsSync(DB_PATH)) {
        console.log('ℹ️ No database file found at ' + DB_PATH + '. Skipping migrations (will be created by app).');
        process.exit(0);
    }

    // Load DB
    console.log('📂 Loading database from ' + DB_PATH);
    const dbData = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(dbData);

    // Instantiate Migrations
    const migrations = new DatabaseMigrations(db, DB_PATH);

    // Run Migrations
    console.log('🔄 Checking for pending migrations...');

    // We need to handle the async nature of runMigrations
    migrations.runMigrations()
        .then(() => {
            console.log('✅ Migration runner finished successfully.');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Migration failed:', err);
            process.exit(1);
        });

} catch (error) {
    console.error('❌ Fatal error in migration runner:', error);
    process.exit(1);
}
