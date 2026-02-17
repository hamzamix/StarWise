const DatabaseMigrations = require('./backend/migrations');

// Mock DB
const db = {
  dbVersion: '1.0.0',
  starredRepos: [],
  lists: []
};

const migrations = new DatabaseMigrations(db, './mock-db.json');

// Mock saveDatabase to avoid writing to disk
migrations.saveDatabase = async () => { console.log('Mock save'); };
migrations.backupDatabase = async () => { console.log('Mock backup'); };

// Mock migration methods to avoid side effects
migrations.migrateV0ToV1 = () => { console.log('Mock migrateV0ToV1'); };
migrations.migrateV1ToV1_1 = () => { console.log('Mock migrateV1ToV1_1'); };
migrations.migrateV1_1ToV1_1_9 = () => { console.log('Mock migrateV1_1ToV1_1_9'); };

console.log('Running migrations...');
migrations.runMigrations()
  .then(() => console.log('Success!'))
  .catch(err => {
    console.error('Caught error:', err);
    if (err.message.includes('Assignment to constant variable')) {
      console.log('Reproduction SUCCESS: Found mutation bug.');
    } else {
      console.log('Reproduction FAILED: Different error.');
    }
  });
