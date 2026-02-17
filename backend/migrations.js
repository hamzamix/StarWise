/**
 * Database Migration System
 * Handles schema evolution and data upgrades
 * Runs automatically on app startup
 */

const fs = require('fs');
const path = require('path');

class DatabaseMigrations {
  constructor(db, dbPath) {
    this.db = db;
    this.dbPath = dbPath;
  }

  /**
   * Get current database version
   */
  getCurrentVersion() {
    // If dbVersion is missing, treat as version 0.0.0
    return this.db.dbVersion || '0.0.0';
  }

  /**
   * Check if database needs migration (handles missing version field)
   */
  needsMigration() {
    const currentVersion = this.getCurrentVersion();
    const targetVersion = '1.2.0';

    // If database has no version field, it definitely needs migration
    if (!this.db.dbVersion) {
      console.log('🔄 Legacy database detected - migration required');
      return true;
    }

    return this.shouldMigrate(currentVersion, targetVersion);
  }

  /**
   * Parse version string to comparable numbers
   */
  parseVersion(version) {
    const parts = (version || '0.0.0').split('.').map(p => parseInt(p || 0, 10));
    return {
      major: parts[0],
      minor: parts[1],
      patch: parts[2],
      toString: () => `${parts[0]}.${parts[1]}.${parts[2]}`
    };
  }

  /**
   * Create mutable version object for tracking migration progress
   */
  createMutableVersion(version) {
    const parsed = this.parseVersion(version);
    return {
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      toString: () => `${parsed.major}.${parsed.minor}.${parsed.patch}`
    };
  }

  /**
   * Check if needsUpdate version is greater than currentVersion
   */
  shouldMigrate(currentVersion, targetVersion) {
    const current = this.parseVersion(currentVersion);
    const target = this.parseVersion(targetVersion);

    if (target.major > current.major) return true;
    if (target.major === current.major && target.minor > current.minor) return true;
    if (target.major === current.major && target.minor === current.minor && target.patch > current.patch) return true;
    return false;
  }

  /**
   * Migration from v0.x (old version) to v1.0 (with backup field)
   * Ensures all repos have the backup object structure
   */
  migrateV0ToV1() {
    console.log('🔄 Running migration: v0.x → v1.0 (Adding backup field to repos)');

    if (!Array.isArray(this.db.starredRepos)) {
      console.warn('⚠️ Warning: starredRepos is not an array, skipping migration');
      return false;
    }

    let updated = 0;
    this.db.starredRepos.forEach(repo => {
      if (!repo.backup || typeof repo.backup !== 'object') {
        updated++;
        repo.backup = {
          status: 'none', // 'none', 'in_progress', 'success', 'error'
          lastBackup: null,
          backupCount: 0,
          latestBackupPath: null,
          versions: [] // Array of backup versions with metadata
        };
      }
    });

    console.log(`✅ Migration v0.x → v1.0 complete: ${updated} repos updated with backup field`);
    return updated > 0;
  }

  /**
   * Migration v1.0 → v1.1: Ensure lists have proper structure
   */
  migrateV1ToV1_1() {
    console.log('🔄 Running migration: v1.0 → v1.1 (Ensuring lists structure)');

    if (!Array.isArray(this.db.lists)) {
      this.db.lists = [];
      console.log('✅ Migration v1.0 → v1.1 complete: lists array created');
      return true;
    }

    let updated = 0;
    this.db.lists = this.db.lists.map(list => {
      // Ensure list has all required fields
      if (!list.id || !list.name || list.repoCount === undefined) {
        updated++;
        return {
          id: list.id || `list-${Date.now()}`,
          name: list.name || 'Unnamed List',
          repoCount: list.repoCount ?? 0,
          ...list
        };
      }
      return list;
    });

    console.log(`✅ Migration v1.0 → v1.1 complete: ${updated} lists verified/updated`);
    return true;
  }

  /**
   * Migration v1.1 → v1.1.9: Ensure all repos have backup field (critical for new features)
   */
  migrateV1_1ToV1_1_9() {
    console.log('🔄 Running migration: v1.1 → v1.1.9 (Adding backup field to all repos)');

    if (!Array.isArray(this.db.starredRepos)) {
      console.warn('⚠️ Warning: starredRepos is not an array, skipping backup field migration');
      return false;
    }

    let updated = 0;
    this.db.starredRepos.forEach(repo => {
      // Ensure repo has backup field (critical for new features to work)
      if (!repo.backup || typeof repo.backup !== 'object') {
        updated++;
        repo.backup = {
          status: 'none', // 'none', 'in_progress', 'success', 'error'
          lastBackup: null,
          backupCount: 0,
          latestBackupPath: null,
          latestVersionId: null,
          fileSize: null,
          lastError: null,
          versions: [], // Array of backup versions with metadata
          scheduledUpdates: false,
          updateInterval: 24
        };
        console.log(`Added backup field to repo: ${repo.full_name}`);
      } else {
        // Ensure backup object has all required fields
        if (!repo.backup.status) repo.backup.status = 'none';
        if (!Array.isArray(repo.backup.versions)) repo.backup.versions = [];
        if (!repo.backup.latestVersionId) repo.backup.latestVersionId = null;
        if (!repo.backup.fileSize) repo.backup.fileSize = null;
        if (!repo.backup.lastError) repo.backup.lastError = null;
        if (repo.backup.scheduledUpdates === undefined) repo.backup.scheduledUpdates = false;
        if (!repo.backup.updateInterval) repo.backup.updateInterval = 24;
      }
    });

    console.log(`✅ Migration v1.1 → v1.1.9 complete: ${updated} repos updated with backup field`);
    return updated > 0;
  }

  /**
   * Migration v1.1.9 → v1.2.0: Ensure all backup fields are complete
   */
  migrateV1_1_9ToV1_2_0() {
    console.log('🔄 Running migration: v1.1.9 → v1.2.0 (Completing backup field structure)');

    if (!Array.isArray(this.db.starredRepos)) {
      console.warn('⚠️ Warning: starredRepos is not an array, skipping backup completion migration');
      return false;
    }

    let updated = 0;
    this.db.starredRepos.forEach(repo => {
      if (repo.backup && typeof repo.backup === 'object') {
        // Ensure all required backup fields are present
        let repoUpdated = false;

        if (!repo.backup.latestVersionId) {
          repo.backup.latestVersionId = null;
          repoUpdated = true;
        }
        if (!repo.backup.fileSize) {
          repo.backup.fileSize = null;
          repoUpdated = true;
        }
        if (!repo.backup.lastError) {
          repo.backup.lastError = null;
          repoUpdated = true;
        }
        if (repo.backup.scheduledUpdates === undefined) {
          repo.backup.scheduledUpdates = false;
          repoUpdated = true;
        }
        if (!repo.backup.updateInterval) {
          repo.backup.updateInterval = 24;
          repoUpdated = true;
        }

        if (repoUpdated) {
          updated++;
        }
      }
    });

    console.log(`✅ Migration v1.1.9 → v1.2.0 complete: ${updated} repos updated with complete backup fields`);
    return updated > 0;
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    const currentVersion = this.getCurrentVersion();
    let targetVersion = '1.1.0';

    console.log(`📊 Database Version: ${currentVersion}`);
    console.log(`🎯 Target Version: ${targetVersion}`);

    // If no version is set, this is an old database that needs all migrations
    if (!this.db.dbVersion) {
      console.log('🔄 No version set - this is a legacy database that needs all migrations');
    }

    if (!this.needsMigration()) {
      console.log('✅ Database is up to date, no migrations needed');
      return true;
    }

    try {
      // Ensure settings object exists (for legacy databases)
      if (!this.db.settings) {
        console.log('🔄 Adding settings field to database');
        this.db.settings = {
          aiProvider: 'gemini',
          aiModel: null
        };
      }

      // Run migrations sequentially based on current version
      let current = this.parseVersion(currentVersion);

      // v0.x → v1.0
      if (current.major === 0) {
        this.migrateV0ToV1();
        current = { major: 1, minor: 0, patch: 0, toString: () => '1.0.0' };
      }

      // v1.0 → v1.1
      if (current.major === 1 && current.minor === 0) {
        this.migrateV1ToV1_1();
        current = { major: 1, minor: 1, patch: 0, toString: () => '1.1.0' };
      }

      // v1.1 → v1.1.9 (critical backup field migration for new features)
      if (current.major === 1 && current.minor === 1 && current.patch < 9) {
        this.migrateV1_1ToV1_1_9();
        current = { major: 1, minor: 1, patch: 9, toString: () => '1.1.9' };
      }

      // v1.1.9 → v1.2.0 (complete backup field structure)
      if (current.major === 1 && current.minor === 1 && current.patch === 9) {
        this.migrateV1_1_9ToV1_2_0();
        current = { major: 1, minor: 2, patch: 0, toString: () => '1.2.0' };
        targetVersion = '1.2.0';
      }

      // Update version in db
      this.db.dbVersion = targetVersion;
      console.log(`✅ All migrations completed successfully. Database updated to v${targetVersion}`);

      // Save the updated db
      await this.saveDatabase();

      // Verify backup structures were added
      const reposWithBackup = this.db.starredRepos.filter(r => r.backup).length;
      console.log(`✅ Verified: ${reposWithBackup}/${this.db.starredRepos.length} repos have backup structures`);

      return true;

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Save database to file
   */
  async saveDatabase() {
    return new Promise((resolve, reject) => {
      try {
        const json = JSON.stringify(this.db, null, 2);
        fs.writeFileSync(this.dbPath, json, 'utf8');
        console.log('💾 Database saved after migration');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create a backup of current database before migration
   */
  async backupDatabase() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.dbPath}.backup.${timestamp}.json`;

      const json = JSON.stringify(this.db, null, 2);
      fs.writeFileSync(backupPath, json, 'utf8');
      console.log(`💾 Database backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.warn('⚠️ Warning: Could not create backup:', error.message);
      return null;
    }
  }
}

module.exports = DatabaseMigrations;
