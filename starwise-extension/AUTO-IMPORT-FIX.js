// Add these two functions to content.js after the extractIndividualList function

// NEW: Get all list URLs from the overview page
getListUrls() {
    const listUrls = [];
    const listLinks = document.querySelectorAll('a[href*="/lists/"]');

    listLinks.forEach(link => {
        const href = link.href;
        // Match URLs like: https://github.com/stars/USERNAME/lists/LISTNAME
        if (href.includes('/stars/') && href.includes('/lists/') && !href.endsWith('/lists')) {
            if (!listUrls.includes(href)) {
                listUrls.push(href);
            }
        }
    });

    console.log(`StarWise: Found ${listUrls.length} list URLs`);
    return listUrls;
}

  // NEW: Extract from multiple lists by sending messages to background script
  async extractFromMultipleLists(listUrls) {
    console.log(`StarWise: 🔄 Extracting from ${listUrls.length} individual lists...`);
    const lists = [];

    for (let i = 0; i < listUrls.length; i++) {
        try {
            console.log(`StarWise: Processing list ${i + 1}/${listUrls.length}: ${listUrls[i]}`);

            // Send message to background script to open tab and extract
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: 'openTabAndExtract', url: listUrls[i], timeout: 30000 },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else if (response && response.success) {
                            resolve(response.result);
                        } else {
                            reject(new Error(response?.error || 'Failed to extract'));
                        }
                    }
                );
            });

            if (result && result.repos && result.repos.length > 0) {
                lists.push({
                    name: result.listName || `List ${i + 1}`,
                    repos: result.repos,
                    description: `Imported ${result.repos.length} repositories from GitHub list`,
                    extractedAt: new Date().toISOString()
                });
                console.log(`StarWise: ✅ Extracted ${result.repos.length} repos from list ${i + 1}`);
            }

            // Small delay to avoid overwhelming GitHub
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`StarWise: ❌ Failed to extract list ${i + 1}:`, error.message);
            // Continue with next list even if one fails
        }
    }

    console.log(`StarWise: ✅ Successfully extracted ${lists.length} lists with repos`);
    return lists;
}

// ALSO: Update extractLists() function - replace the else block (line 213-215) with:
      } else {
    // Overview page - try quick extraction first
    const extractedLists = await this.extractOverviewPageUltraAggressive();
    const totalRepos = extractedLists.reduce((sum, list) => sum + list.repos.length, 0);

    // If we found very few repos on overview page, visit individual lists
    if (totalRepos < 10) {
        console.log('StarWise: 🔄 Overview extraction found few repos, visiting individual lists...');
        const listUrls = this.getListUrls();

        if (listUrls.length > 0) {
            const detailedLists = await this.extractFromMultipleLists(listUrls);
            lists.push(...detailedLists);
        } else {
            // Fallback to whatever we extracted
            lists.push(...extractedLists);
        }
    } else {
        lists.push(...extractedLists);
    }
}
