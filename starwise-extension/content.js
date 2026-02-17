// StarWise Lists Importer - Ultra-Aggressive Repository Extraction
class GitHubListsExtractor {
  constructor() {
    this.cache = new Map();
    this.processingLock = false;
    this.init();
  }

  init() {
    console.log('StarWise: Initializing ultra-aggressive extractor...');

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'extractLists') {
        this.extractLists()
          .then(lists => sendResponse({ lists }))
          .catch(error => sendResponse({ error: error.message }));
        return true;
      }

      if (request.action === 'extractListFromPage') {
        this.extractIndividualList()
          .then(list => sendResponse(list))
          .catch(err => sendResponse({ error: err.message }));
        return true;
      }

      if (request.action === 'getCache') {
        sendResponse({ cache: Object.fromEntries(this.cache) });
        return true;
      }

      if (request.action === 'clearCache') {
        this.cache.clear();
        console.log('StarWise: Content script cache cleared');
        sendResponse({ success: true, message: 'Cache cleared' });
        return true;
      }
    });

    this.addImportButton();
  }

  addImportButton() {
    const url = window.location.href;
    const isGitHub = url.includes('github.com');
    const isStarsPage = url.includes('/stars');

    if (!isGitHub || !isStarsPage) {
      return;
    }

    const enhancedHeaderSelectors = [
      '.application-main header',
      'header.AppHeader',
      '[data-testid="header"]',
      '.Header',
      'header',
      '[role="banner"]',
      '.js-header-wrapper header',
      '.repository-content-header',
      '.pagehead'
    ];

    let retryCount = 0;
    const maxRetries = 10;

    const findAndCreateButton = () => {
      if (retryCount >= maxRetries) {
        return;
      }

      for (const selector of enhancedHeaderSelectors) {
        const headers = document.querySelectorAll(selector);
        for (const header of headers) {
          if (header && !header.querySelector('.starwise-import-btn') && this.isValidHeader(header)) {
            this.createImportButton(header);
            return;
          }
        }
      }

      retryCount++;
      setTimeout(findAndCreateButton, 500);
    };

    findAndCreateButton();
  }

  isValidHeader(header) {
    if (!header || !header.offsetParent) return false;
    const rect = header.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  createImportButton(header) {
    const button = document.createElement('button');
    button.className = 'starwise-import-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
        <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.5 5L7 10.5 4.5 8l.71-.71L7 9.08l4.79-4.79.71.71z"/>
      </svg>
      Import to StarWise
    `;
    button.style.cssText = `
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 12px;
      display: inline-flex;
      align-items: center;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
      position: relative;
      z-index: 1000;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 4px 8px rgba(25, 118, 210, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 4px rgba(25, 118, 210, 0.2)';
    });

    button.addEventListener('click', () => {
      this.handleImportClick(button);
    });

    const existingButtons = header.querySelectorAll('button, a[role="button"], .btn');
    if (existingButtons.length > 0) {
      const lastButton = existingButtons[existingButtons.length - 1];
      lastButton.parentNode.insertBefore(button, lastButton.nextSibling);
    } else {
      header.appendChild(button);
    }
  }

  async handleImportClick(button) {
    const originalText = button.innerHTML;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px; animation: spin 1s linear infinite;">
        <path d="M8 0a8 8 0 1 0 8 8A8 8 0 0 0 8 0zm0 12a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" opacity=".25"/>
        <path d="M8 4a4 4 0 0 1 4 4H8z"/>
      </svg>
      Importing...
    `;
    button.disabled = true;

    try {
      const lists = await this.extractLists();
      await this.sendToStarWise(lists);

      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
          <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.5 5L7 10.5 4.5 8l.71-.71L7 9.08l4.79-4.79.71.71z"/>
        </svg>
        Imported!
      `;

      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 3000);

    } catch (error) {
      console.error('Import failed:', error);
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
          <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 3H7v6h2V3zm0 8H7v2h2v-2z"/>
        </svg>
        Failed
      `;

      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 3000);
    }
  }

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

  async extractLists() {
    if (this.processingLock) {
      await new Promise(resolve => {
        const checkLock = () => {
          if (!this.processingLock) {
            resolve();
          } else {
            setTimeout(checkLock, 100);
          }
        };
        checkLock();
      });
    }

    this.processingLock = true;

    try {
      const currentUrl = window.location.href;
      const lists = [];

      if (currentUrl.includes('/lists/')) {
        const singleList = await this.extractIndividualList();
        if (singleList) {
          lists.push(singleList);
        }
      } else {
        // Overview page
        console.log('StarWise: Checking for individual lists...');
        const listUrls = this.getListUrls();

        if (listUrls.length > 0) {
          console.log(`StarWise: 📋 Found ${listUrls.length} lists. Prioritizing detailed extraction.`);
          const detailedLists = await this.extractFromMultipleLists(listUrls);
          lists.push(...detailedLists);

          // Also get the overview stars as a catch-all "Uncategorized" or "Recent" list
          // But only if we want to be exhaustive. For now, let's focus on the lists.
          if (detailedLists.length === 0) {
            console.log('StarWise: Detailed extraction returned no lists, falling back to overview.');
            const extractedLists = await this.extractOverviewPageUltraAggressive();
            lists.push(...extractedLists);
          }
        } else {
          console.log('StarWise: No specific lists found. Extracting from overview page.');
          const extractedLists = await this.extractOverviewPageUltraAggressive();
          lists.push(...extractedLists);
        }
      }

      const totalRepos = lists.reduce((sum, list) => sum + list.repos.length, 0);
      console.log(`StarWise: Final result - Extracted ${lists.length} lists with ${totalRepos} total repos`);

      return lists;
    } finally {
      this.processingLock = false;
    }
  }

  // NEW ULTRA-AGGRESSIVE APPROACH - Multiple parallel extraction methods
  async extractOverviewPageUltraAggressive() {
    console.log('StarWise: 🚀 ULTRA-AGGRESSIVE MULTI-METHOD EXTRACTION');

    // Step 1: Wait for page to fully load and repositories to appear
    await this.waitForRepositoriesToLoad();

    // Step 2: Run multiple extraction methods in parallel
    const [reposFromLinks, reposFromContainers, reposFromText, reposFromGitHubSpecific] = await Promise.all([
      this.extractReposFromLinks(),
      this.extractReposFromContainers(),
      this.extractReposFromTextAggressive(),
      this.extractReposFromGitHubSpecific()
    ]);

    // Step 3: Combine all results and deduplicate
    const allRepos = [...new Set([
      ...reposFromLinks,
      ...reposFromContainers,
      ...reposFromText,
      ...reposFromGitHubSpecific
    ])];

    console.log(`StarWise: Combined extraction found ${allRepos.length} total repositories`);
    console.log('StarWise: Breakdown:', {
      links: reposFromLinks.length,
      containers: reposFromContainers.length,
      text: reposFromText.length,
      githubSpecific: reposFromGitHubSpecific.length,
      total: allRepos.length
    });

    if (allRepos.length === 0) {
      console.log('StarWise: ❌ No repositories found with any method');
      return [];
    }

    // Step 4: Get clean list names and create organized lists
    const cleanListNames = this.getCleanListNames();
    const lists = this.createListsSmart(allRepos, cleanListNames);

    console.log(`StarWise: ✅ Successfully created ${lists.length} organized lists`);
    return lists;
  }

  async waitForRepositoriesToLoad() {
    console.log('StarWise: ⏳ Waiting for repositories to load...');

    // Wait for potential dynamic content loading
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if we can see repository elements
    const repoElements = document.querySelectorAll('.Box-row, [data-testid*="repository"], .repo-row, .stars-list-item');
    console.log(`StarWise: Found ${repoElements.length} potential repository elements`);

    // If we see very few elements, wait a bit more
    if (repoElements.length < 3) {
      console.log('StarWise: Few repository elements found, waiting additional time...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async extractReposFromLinks() {
    console.log('StarWise: Method 1 - Link-based extraction');
    const repos = new Set();

    const allLinks = document.querySelectorAll('a[href*="github.com/"]');
    console.log(`StarWise: Scanning ${allLinks.length} GitHub links`);

    let found = 0;
    allLinks.forEach((link, index) => {
      const repoInfo = this.extractRepoSimple(link);
      if (repoInfo) {
        repos.add(repoInfo);
        found++;
        if (found <= 10) {
          console.log(`StarWise: Link method found: ${repoInfo}`);
        }
      }
    });

    console.log(`StarWise: Link method: ${found} repositories`);
    return Array.from(repos);
  }

  async extractReposFromContainers() {
    console.log('StarWise: Method 2 - Container-based extraction');
    const repos = new Set();

    // GitHub-specific repository container selectors
    const containerSelectors = [
      // Modern GitHub selectors
      '[data-testid="repository-row"]',
      '[data-testid="starred-repository-row"]',
      '[data-testid="repository-item"]',
      '[data-testid="stars-list-item"]',

      // Traditional GitHub selectors  
      '.Box-row',
      '.repo-row',
      '.stars-list-item',
      '.starred-repo-item',
      '.stars-overview-item',

      // Layout-specific selectors
      '.col-12.d-flex.flex-column.border-bottom',
      '.py-3.border-bottom',
      '.d-flex.py-3',
      '.d-flex.border-bottom.py-3',

      // Grid and card layouts
      '.col-12.col-lg-6',
      '.col-lg-6',
      '.pinned-item',
      '.pinned-item-body',
      '.stars-grid-item',

      // GitHub's current structure
      '.stars-list .Box-row',
      '.stars-page .Box-row',
      '.stars-layout .Box-row',
      '.repository-list .Box-row'
    ];

    let totalContainers = 0;
    let foundInContainers = 0;

    for (const selector of containerSelectors) {
      const containers = document.querySelectorAll(selector);
      if (containers.length > 0) {
        console.log(`StarWise: Found ${containers.length} containers with "${selector}"`);
        totalContainers += containers.length;

        containers.forEach(container => {
          // Look for repository links within this container
          const repoLinks = container.querySelectorAll('a[href*="github.com/"]');

          repoLinks.forEach(link => {
            const repoInfo = this.extractRepoFromContainer(container, link);
            if (repoInfo) {
              repos.add(repoInfo);
              foundInContainers++;
            }
          });
        });
      }
    }

    console.log(`StarWise: Container method: ${foundInContainers} repositories from ${totalContainers} containers`);
    return Array.from(repos);
  }

  extractRepoFromContainer(container, link) {
    const href = link.href;

    // Skip navigation and UI links
    const skipPatterns = [
      '/stars', '/lists/', '/followers', '/following', '/settings',
      '/profile', '/issues', '/pulls', '/discussions', '/actions',
      '/notifications', '/tab=', '/search', '/explore', '/organizations'
    ];

    if (skipPatterns.some(pattern => href.includes(pattern))) {
      return null;
    }

    // Extract repository name from GitHub URL
    const match = href.match(/github\.com\/([^\/\?#]+)\/([^\/\?#]+)(?:\/|$)/);
    if (match && match[1] && match[2]) {
      const owner = match[1];
      const repo = match[2];

      if (owner.length > 0 && owner.length < 40 &&
        repo.length > 0 && repo.length < 100 &&
        !owner.includes('.') && !repo.includes('.')) {
        return `${owner}/${repo}`;
      }
    }

    return null;
  }

  async extractReposFromTextAggressive() {
    console.log('StarWise: Method 3 - Aggressive text extraction');
    const repos = new Set();
    const text = document.body.textContent || '';

    // Multiple regex patterns for repository names
    const patterns = [
      /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g,  // Standard pattern
      /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g, // Full URLs
      /\b([a-zA-Z0-9][a-zA-Z0-9_-]*\/[a-zA-Z0-9][a-zA-Z0-9_-]*)\b/g // Word boundaries
    ];

    let totalMatches = 0;
    patterns.forEach((pattern, index) => {
      const matches = text.match(pattern) || [];
      console.log(`StarWise: Pattern ${index + 1} found ${matches.length} matches`);

      matches.forEach(match => {
        let repoName = match;

        // If it's a full URL, extract just the repo part
        if (match.includes('github.com/')) {
          const urlMatch = match.match(/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
          if (urlMatch) {
            repoName = `${urlMatch[1]}/${urlMatch[2]}`;
          }
        }

        // Validate the repository name
        if (this.isValidRepoName(repoName)) {
          repos.add(repoName);
          totalMatches++;

          if (totalMatches <= 10) {
            console.log(`StarWise: Text method found: ${repoName}`);
          }
        }
      });
    });

    console.log(`StarWise: Text method: ${totalMatches} repositories`);
    return Array.from(repos);
  }

  async extractReposFromGitHubSpecific() {
    console.log('StarWise: Method 4 - GitHub-specific extraction');
    const repos = new Set();

    // Look for GitHub's specific data attributes and structures
    const githubSpecificElements = document.querySelectorAll(`
      [data-testid*="repository"],
      [data-testid*="repo"],
      [data-testid*="starred"],
      [data-testid*="stars"],
      [data-testid*="list"],
      .js-pinned-repo,
      .pinned-item,
      .pinned-item-body,
      .repo-name,
      .repo-title,
      .repository-name,
      .repository-title
    `);

    console.log(`StarWise: Found ${githubSpecificElements.length} GitHub-specific elements`);

    githubSpecificElements.forEach(element => {
      // Method 1: Look for links within the element
      const links = element.querySelectorAll('a[href*="github.com/"]');
      links.forEach(link => {
        const repoInfo = this.extractRepoSimple(link);
        if (repoInfo) {
          repos.add(repoInfo);
        }
      });

      // Method 2: Extract from text content if no links found
      if (links.length === 0) {
        const text = element.textContent || '';
        const repoMatches = text.match(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g) || [];
        repoMatches.forEach(match => {
          if (this.isValidRepoName(match)) {
            repos.add(match);
          }
        });
      }
    });

    console.log(`StarWise: GitHub-specific method: ${repos.size} repositories`);
    return Array.from(repos);
  }

  isValidRepoName(repoName) {
    if (!repoName || !repoName.includes('/')) return false;

    const parts = repoName.split('/');
    if (parts.length !== 2) return false;

    const [owner, repo] = parts;

    // Basic validation
    return owner.length > 0 && owner.length < 40 &&
      repo.length > 0 && repo.length < 100 &&
      !owner.includes('.') && !repo.includes('.');
  }

  extractRepoSimple(link) {
    const href = link.href;
    if (!href || !href.includes('github.com')) return null;

    const skipPatterns = [
      '/stars', '/lists/', '/followers', '/following', '/settings',
      '/profile', '/issues', '/pulls', '/discussions', '/actions',
      '/notifications', '/tab=', '/search', '/explore', '/organizations'
    ];

    if (skipPatterns.some(pattern => href.includes(pattern))) {
      return null;
    }

    const match = href.match(/github\.com\/([^\/\?#]+)\/([^\/\?#]+)(?:\/|$)/);
    if (match && match[1] && match[2]) {
      const owner = match[1];
      const repo = match[2];

      if (owner.length > 0 && owner.length < 40 &&
        repo.length > 0 && repo.length < 100 &&
        !owner.includes('.') && !repo.includes('.')) {
        return `${owner}/${repo}`;
      }
    }

    return null;
  }

  getCleanListNames() {
    console.log('StarWise: 🧹 Getting clean list names');
    const cleanNames = [];
    const seenNames = new Set();

    const listLinks = document.querySelectorAll('a[href*="/lists/"]');
    console.log(`StarWise: Scanning ${listLinks.length} list links`);

    listLinks.forEach(link => {
      const text = link.textContent.trim();
      const cleanName = this.cleanNameUltra(text);

      if (cleanName &&
        cleanName.length > 1 &&
        cleanName.length < 50 &&
        !seenNames.has(cleanName.toLowerCase())) {
        cleanNames.push(cleanName);
        seenNames.add(cleanName.toLowerCase());
        console.log(`StarWise: Clean list name: "${cleanName}"`);
      }
    });

    return cleanNames;
  }

  cleanNameUltra(text) {
    if (!text) return '';

    return text
      .replace(/\s*\(\d+\)$/g, '')
      .replace(/\s*\d+\s*repos?itories?$/gi, '')
      .replace(/\s*\d+$/g, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\n+\s*\d+\s*repositories?/gi, '')
      .replace(/\n+\s*\d+\s*repository/gi, '')
      .replace(/\s+repository.*$/gi, '')
      .replace(/\s+repositories.*$/gi, '')
      .replace(/\s+\d+.*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  createListsSmart(allRepos, cleanListNames) {
    console.log('StarWise: 📊 Creating smart lists');

    // If we are here, it means we are extracting from the overview page
    // and we want to return a single list with all found repos,
    // rather than trying to guess which repo belongs to which list.

    if (allRepos.length > 0) {
      console.log(`StarWise: Creating single comprehensive list with ${allRepos.length} repos`);
      return [{
        name: 'GitHub Stars Overview',
        repos: allRepos,
        description: `Found ${allRepos.length} repositories from GitHub stars overview`,
        extractionMethod: 'overview-multi-method',
        needsIndividualVisit: false,
        extractedAt: new Date().toISOString()
      }];
    }

    return [];
  }

  async extractIndividualList() {
    const cacheKey = `list_${window.location.href}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;

        const listName = await this.extractListName();
        if (!listName) {
          throw new Error('Could not extract list name');
        }

        const repos = await this.extractRepositories();

        if (repos.length === 0) {
          const result = {
            name: listName,
            repos: [],
            description: 'Empty list - no repositories found',
            isEmpty: true
          };

          this.cache.set(cacheKey, result);
          return result;
        }

        const result = {
          name: listName,
          repos: repos,
          description: `Imported ${repos.length} repositories from GitHub list`,
          extractedAt: new Date().toISOString()
        };

        this.cache.set(cacheKey, result);
        return result;

      } catch (error) {
        if (attempts >= maxAttempts) {
          return null;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  async extractListName() {
    const urlMatch = window.location.href.match(/\/stars\/[^\/]+\/lists\/([^\/\?#]+)/);
    if (urlMatch && urlMatch[1]) {
      const rawListName = urlMatch[1];
      const listName = this.normalizeListName(rawListName);
      return listName;
    }

    const isListPage = window.location.href.includes('/lists/');
    if (!isListPage) {
      return null;
    }

    const altUrlMatch = window.location.href.match(/\/lists\/([^\/\?#]+)/);
    if (altUrlMatch && altUrlMatch[1]) {
      const rawListName = altUrlMatch[1];
      const listName = this.normalizeListName(rawListName);
      return listName;
    }

    return null;
  }

  normalizeListName(name) {
    let normalized = decodeURIComponent(name).trim();
    normalized = normalized.replace(/-/g, ' ');
    return normalized.split(' ').map(word =>
      word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word
    ).join(' ');
  }

  async extractRepositories() {
    const repos = new Set();
    await new Promise(resolve => setTimeout(resolve, 1500));

    const repoSelectors = [
      '.Box-row',
      '.list-row',
      '.repository-list .Box-row',
      '.starred-repo-list .Box-row',
      '.repo-list-item',
      '.d-inline-block',
      '[data-testid="repository-row"]',
      '[data-testid="repository-item"]',
      '.repository-row',
      '.starred-repo-item',
      '.stars-overview-item',
      '.stars-grid-item',
      '.col-12.d-flex.flex-column.border-bottom',
      '.col-12.flex-auto.py-3',
      '.pinned-item-body',
      '.Box-row.d-flex.py-3',
      '.py-3.border-bottom',
      '.repo-wrapper',
      '.github-repo-item',
      '.grid-item'
    ];

    for (const sel of repoSelectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes && nodes.length > 0) {
        nodes.forEach(node => {
          const repoInfo = this.extractRepoFromContainerEnhanced(node);
          if (repoInfo) {
            repos.add(repoInfo);
          }
        });

        if (repos.size >= 3) {
          break;
        }
      }
    }

    if (repos.size === 0) {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      allLinks.forEach(link => {
        const repoInfo = this.extractRepoFromLinkEnhanced(link);
        if (repoInfo) {
          repos.add(repoInfo);
        }
      });
    }

    const isOverviewPage = window.location.href.includes('/stars') && !window.location.href.includes('/lists/');
    if (repos.size === 0 && isOverviewPage) {
      const overviewRepos = this.extractReposFromOverviewPage();
      overviewRepos.forEach(repo => repos.add(repo));
    }

    if (repos.size === 0) {
      const textRepos = this.extractReposFromText();
      textRepos.forEach(repo => repos.add(repo));
    }

    return Array.from(repos);
  }

  extractRepoFromContainerEnhanced(container) {
    const repoLinks = container.querySelectorAll('a[href*="/"]');

    for (const link of repoLinks) {
      const repoInfo = this.extractRepoFromLinkEnhanced(link);
      if (repoInfo) {
        return repoInfo;
      }
    }

    const text = container.textContent || '';
    const repoMatch = text.match(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/);
    if (repoMatch && repoMatch[0]) {
      const parts = repoMatch[0].split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        return repoMatch[0];
      }
    }

    return null;
  }

  extractRepoFromLinkEnhanced(link) {
    const href = link.href;
    if (!href || !href.includes('github.com')) return null;

    if (href.includes('/stars') ||
      href.includes('/lists/') ||
      href.includes('/tab=') ||
      href.includes('/following') ||
      href.includes('/followers') ||
      href.includes('/issues') ||
      href.includes('/pulls') ||
      href.includes('/settings') ||
      href.includes('/profile') ||
      href.includes('/notifications')) {
      return null;
    }

    const match = href.match(/github\.com\/([^\/\?#]+)\/([^\/\?#]+)(?:\/|$)/);
    if (match && match[1] && match[2]) {
      const owner = match[1];
      const repo = match[2];

      if (owner.length > 0 && owner.length < 40 &&
        repo.length > 0 && repo.length < 100) {
        return `${owner}/${repo}`;
      }
    }

    return null;
  }

  extractReposFromText() {
    const repos = new Set();
    const text = document.body.textContent || '';

    const repoPattern = /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g;
    const matches = text.match(repoPattern) || [];

    matches.forEach(match => {
      if (match.includes('.') || match.includes('_')) {
        return;
      }

      const parts = match.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        repos.add(match);
      }
    });

    return Array.from(repos);
  }

  extractReposFromOverviewPage() {
    const repos = new Set();

    const overviewSelectors = [
      '.col-12.d-flex.flex-column.border-bottom',
      '.py-3.border-bottom',
      '.d-flex.py-3',
      '.Box-row.py-3',
      '.repo-row',
      '.col-12.col-lg-6',
      '.pinned-item',
      '.stars-grid .col-lg-6',
      '.stars-list .Box-row',
      '.stars-page .Box-row',
      '[data-testid="starred-repository-row"]',
      '[data-testid="repository-item"]',
      '[data-testid="stars-list-item"]',
      '.stars-list-item',
      '.starred-repo-item',
      '.d-flex.border-bottom.py-3',
      '.d-flex.py-3.align-items-center'
    ];

    for (const selector of overviewSelectors) {
      const elements = document.querySelectorAll(selector);

      elements.forEach(element => {
        const repoLinks = element.querySelectorAll('a[href*="github.com/"]');

        repoLinks.forEach(link => {
          if (link.href.includes('/stars') ||
            link.href.includes('/lists/') ||
            link.href.includes('/followers') ||
            link.href.includes('/following') ||
            link.href.includes('/settings') ||
            link.href.includes('/profile') ||
            link.href.includes('/issues') ||
            link.href.includes('/pulls') ||
            link.href.includes('/discussions') ||
            link.href.includes('/actions')) {
            return;
          }

          const match = link.href.match(/github\.com\/([^\/\?#]+)\/([^\/\?#]+)(?:\/|$)/);
          if (match && match[1] && match[2]) {
            const owner = match[1];
            const repo = match[2];

            if (owner.length > 0 && owner.length < 40 &&
              repo.length > 0 && repo.length < 100 &&
              !owner.includes('.') && !repo.includes('.')) {
              repos.add(`${owner}/${repo}`);
            }
          }
        });
      });

      if (repos.size >= 5) {
        break;
      }
    }

    if (repos.size === 0) {
      const textRepos = this.extractReposFromText();
      textRepos.forEach(repo => repos.add(repo));
    }

    return Array.from(repos);
  }

  async sendToStarWise(lists) {
    console.log('StarWise: Sending lists to StarWise:', lists);

    // Get backend URL from settings or default
    const getBackendUrl = () => {
      return new Promise((resolve) => {
        chrome.storage.sync.get(['backendUrl'], (result) => {
          resolve(result.backendUrl || 'http://localhost:4000');
        });
      });
    };

    const backendUrl = await getBackendUrl();
    console.log(`StarWise: Using backend: ${backendUrl}`);

    try {
      const healthCheck = await fetch(`${backendUrl}/api/user`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!healthCheck.ok) {
        throw new Error('StarWise backend is not running or you are not logged in');
      }

      const userData = await healthCheck.json();
      if (!userData.user) {
        throw new Error('You are not logged in to StarWise');
      }

    } catch (error) {
      console.error('StarWise: Backend health check failed:', error);
      throw new Error('Cannot connect to StarWise. Please ensure it is running and you are logged in.');
    }

    const response = await fetch(`${backendUrl}/api/lists/import-github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ lists })
    });

    console.log('StarWise: Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('StarWise: Error response:', errorText);
      throw new Error(`Failed to send lists to StarWise: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('StarWise: Success response:', result);
    return result;
  }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Initialize the extractor
new GitHubListsExtractor();