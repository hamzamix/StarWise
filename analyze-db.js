import { readFileSync } from 'fs';

console.log('=== ANALYZING OLD VERSION DATABASE ===');
try {
  const data = JSON.parse(readFileSync('db-from-container.json', 'utf8'));
  console.log('Database version:', data.dbVersion || 'NOT SET');
  console.log('Number of repos:', data.starredRepos?.length || 0);
  console.log('Number of lists:', data.lists?.length || 0);
  
  if (data.starredRepos && data.starredRepos.length > 0) {
    const firstRepo = data.starredRepos[0];
    console.log('\n=== FIRST REPO STRUCTURE ===');
    console.log('Keys:', Object.keys(firstRepo));
    
    console.log('\n=== FIRST REPO SAMPLE ===');
    console.log(JSON.stringify({
      id: firstRepo.id,
      full_name: firstRepo.full_name,
      owner: firstRepo.owner,
      backup: firstRepo.backup,
      aiTags: firstRepo.aiTags,
      aiTagsGenerated: firstRepo.aiTagsGenerated
    }, null, 2));
  }
  
  if (data.lists && data.lists.length > 0) {
    console.log('\n=== FIRST LIST SAMPLE ===');
    console.log(JSON.stringify(data.lists[0], null, 2));
  }
} catch (error) {
  console.error('Error analyzing database:', error.message);
}