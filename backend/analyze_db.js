const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));

console.log(`Total Repos: ${db.starredRepos.length}`);
console.log(`Total Lists: ${db.lists.length}`);

db.lists.forEach(list => {
    const reposInList = db.starredRepos.filter(r => r.listIds && r.listIds.includes(list.id));
    console.log(`List: "${list.name}" (ID: ${list.id}) - Repos: ${reposInList.length}`);
});
