// StarWise Lists Importer - Enhanced Background Service Worker

// Global state management
const globalState = {
  activeExtractions: new Map(),
  cache: new Map(),
  maxConcurrentTabs: 3,
  extractionTimeouts: new Map()
};

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('StarWise Lists Importer installed/updated:', details.reason);

  // Set default settings
  chrome.storage.sync.set({
    starwiseUrl: 'http://localhost:5173',
    backendUrl: 'http://localhost:4000',
    autoDetect: true,
    maxRetries: 3,
    extractionTimeout: 45000
  });

  // Clean up old cache on installation
  if (details.reason === 'install') {
    chrome.storage.local.clear();
  }
});

// Enhanced message handling with better error handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Received message:', request.action);

  try {
    switch (request.action) {
      case 'checkConnection':
        checkStarWiseConnection()
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ connected: false, error: error.message }));
        return true;

      case 'importLists':
        importListsToStarWise(request.lists)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;

      case 'openTabAndExtract':
        openTabAndExtract(request.url, request.timeout || 45000)
          .then(result => sendResponse({ success: true, result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;

      case 'getGlobalState':
        sendResponse({
          state: {
            activeExtractions: globalState.activeExtractions.size,
            cacheSize: globalState.cache.size,
            maxConcurrentTabs: globalState.maxConcurrentTabs
          }
        });
        return true;

      case 'clearCache':
        globalState.cache.clear();
        sendResponse({ success: true, message: 'Cache cleared' });
        return true;

      case 'clearBackgroundCache':
        globalState.cache.clear();
        globalState.activeExtractions.clear();
        console.log('Background: Cache and active extractions cleared');
        sendResponse({ success: true, message: 'Background cache cleared' });
        return true;

      default:
        sendResponse({ error: 'Unknown action: ' + request.action });
        return true;
    }
  } catch (error) {
    console.error('Background: Message handling error:', error);
    sendResponse({ error: error.message });
    return true;
  }
});

// Enhanced StarWise connection checking
async function checkStarWiseConnection() {
  try {
    const { backendUrl } = await chrome.storage.sync.get(['backendUrl']);
    const url = backendUrl || 'http://localhost:4000';

    console.log('Background: Checking connection to:', url);

    // Enhanced timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${url}/api/user`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const result = {
        connected: true,
        authenticated: !!data.user,
        user: data.user,
        backendUrl: url
      };
      console.log('Background: Connection successful', result);
      return result;
    } else {
      const error = `HTTP ${response.status}`;
      console.warn('Background: Connection failed with status:', response.status);
      return { connected: false, error };
    }
  } catch (error) {
    console.warn('Background: Connection error:', error.message);
    return { connected: false, error: error.message };
  }
}

// Enhanced list import to StarWise
async function importListsToStarWise(lists) {
  try {
    const { backendUrl } = await chrome.storage.sync.get(['backendUrl']);
    const url = backendUrl || 'http://localhost:4000';

    console.log('Background: Importing', lists.length, 'lists to:', url);

    // Process lists in smaller batches to avoid overwhelming the server
    const batchSize = 5;
    const batches = [];

    for (let i = 0; i < lists.length; i += batchSize) {
      batches.push(lists.slice(i, i + batchSize));
    }

    const results = [];

    for (const batch of batches) {
      try {
        const response = await fetch(`${url}/api/lists/import-github`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ lists: batch })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        results.push(result);

        // Small delay between batches
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (batchError) {
        console.error('Background: Batch import failed:', batchError);
        results.push({ error: batchError.message, lists: batch });
      }
    }

    return {
      success: true,
      results,
      totalBatches: batches.length,
      successfulBatches: results.filter(r => !r.error).length
    };
  } catch (error) {
    console.error('Background: Import failed:', error);
    return { success: false, error: error.message };
  }
}

// Enhanced tab extraction with better error handling and performance
async function openTabAndExtract(url, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    // Check if we're already processing this URL
    const cacheKey = `extract_${url}`;
    if (globalState.cache.has(cacheKey)) {
      console.log('Background: Returning cached result for', url);
      return resolve(globalState.cache.get(cacheKey));
    }

    // Limit concurrent extractions
    if (globalState.activeExtractions.size >= globalState.maxConcurrentTabs) {
      return reject(new Error('Maximum concurrent extractions reached'));
    }

    const extractionId = Date.now().toString();
    globalState.activeExtractions.set(extractionId, { url, startTime: Date.now() });

    console.log('Background: Starting enhanced extraction for', url);

    try {
      chrome.tabs.create({ url: url, active: false }, (tab) => {
        if (!tab || typeof tab.id === 'undefined') {
          globalState.activeExtractions.delete(extractionId);
          return reject(new Error('Failed to create tab'));
        }

        const tabId = tab.id;
        let timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Extraction timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        const cleanup = () => {
          clearTimeout(timeoutId);
          chrome.tabs.onUpdated.removeListener(onUpdated);
          if (tabId !== undefined) {
            try { chrome.tabs.remove(tabId); } catch (e) { }
          }
          globalState.activeExtractions.delete(extractionId);
        };

        const onUpdated = async (updatedTabId, changeInfo, updatedTab) => {
          if (updatedTabId !== tabId) return;

          if (changeInfo.status === 'complete') {
            try {
              // Enhanced extraction with multiple strategies
              const result = await performEnhancedExtraction(tabId, url);

              // Cache successful results
              if (result && result.repos && result.repos.length > 0) {
                globalState.cache.set(cacheKey, result);
                console.log('Background: Enhanced extraction successful, cached result');
              }

              cleanup();
              resolve(result);

            } catch (error) {
              console.warn('Background: Enhanced extraction failed, trying fallback', error);

              try {
                // Fallback to message-based extraction
                const fallbackResult = await performFallbackExtraction(tabId);
                cleanup();
                resolve(fallbackResult);
              } catch (fallbackError) {
                cleanup();
                reject(new Error(`All extraction methods failed: ${error.message}, ${fallbackError.message}`));
              }
            }
          }
        };

        chrome.tabs.onUpdated.addListener(onUpdated);
      });

    } catch (error) {
      globalState.activeExtractions.delete(extractionId);
      reject(error);
    }
  });
}

// Enhanced extraction using chrome.scripting API with improved GitHub detection
async function performEnhancedExtraction(tabId, url) {
  if (!chrome.scripting || !chrome.scripting.executeScript) {
    throw new Error('chrome.scripting API not available');
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      return new Promise((resolve) => {
        // --- HELPER FUNCTIONS DEFINED INSIDE INJECTED SCRIPT ---

        // Helper function to normalize list names
        function normalizeListName(name) {
          let normalized = decodeURIComponent(name).trim();
          normalized = normalized.replace(/-/g, ' ');
          return normalized.split(' ').map(word =>
            word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word
          ).join(' ');
        }

        // Enhanced repository extraction from link
        function extractRepoFromLinkEnhanced(link) {
          const href = link.href;
          if (!href || !href.includes('github.com')) return null;

          const skipPatterns = [
            '/stars', '/lists/', '/tab=', '/following', '/followers',
            '/issues', '/pulls', '/settings', '/profile', '/notifications',
            '/search', '/explore', '/marketplace', '/topics', '/collections'
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

        // Enhanced repository extraction from container
        function extractRepoFromContainerEnhanced(container) {
          const repoLinks = container.querySelectorAll('a[href*="/"]');

          for (const link of repoLinks) {
            const repoInfo = extractRepoFromLinkEnhanced(link);
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

        // Enhanced list name extraction
        async function extractListNameEnhanced() {
          console.log('Background: 🔍 DEBUGGING - Current URL:', window.location.href);

          const urlMatch = window.location.href.match(/\/stars\/[^\/]+\/lists\/([^\/\?#]+)/);

          if (urlMatch && urlMatch[1]) {
            const rawListName = urlMatch[1];
            const listName = normalizeListName(rawListName);
            return listName;
          }

          const isListPage = window.location.href.includes('/lists/');

          if (!isListPage) {
            return null;
          }

          const altUrlMatch = window.location.href.match(/\/lists\/([^\/\?#]+)/);

          if (altUrlMatch && altUrlMatch[1]) {
            const rawListName = altUrlMatch[1];
            const listName = normalizeListName(rawListName);
            return listName;
          }

          return null;
        }

        // Aggressive text-based extraction (similar to content.js)
        function extractReposFromTextAggressive() {
          console.log('Background: Method 3 - Aggressive text extraction');
          const repos = new Set();
          const text = document.body.textContent || '';

          // Multiple regex patterns for repository names
          const patterns = [
            /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g,  // Standard pattern
            /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g, // Full URLs
            /\b([a-zA-Z0-9][a-zA-Z0-9_-]*\/[a-zA-Z0-9][a-zA-Z0-9_-]*)\b/g // Word boundaries
          ];

          patterns.forEach((pattern) => {
            const matches = text.match(pattern) || [];
            matches.forEach(match => {
              let repoName = match;

              // If it's a full URL, extract just the repo part
              if (match.includes('github.com/')) {
                const urlMatch = match.match(/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
                if (urlMatch) {
                  repoName = `${urlMatch[1]}/${urlMatch[2]}`;
                }
              }

              // Validate
              if (repoName && repoName.includes('/')) {
                const parts = repoName.split('/');
                if (parts.length === 2 &&
                  parts[0].length < 40 && parts[1].length < 100 &&
                  !parts[0].includes('.') && !parts[1].includes('.')) {
                  repos.add(repoName);
                }
              }
            });
          });

          console.log(`Background: Text method found ${repos.size} repos`);
          return Array.from(repos);
        }

        // Enhanced repository extraction
        async function extractRepositoriesEnhanced() {
          console.log('Background: Extracting repositories with enhanced methods...');
          const repos = new Set();

          const containerSelectors = [
            '.Box-row',
            '.list-row',
            '.repository-list .Box-row',
            '.starred-repo-list .Box-row',
            '[data-testid="repository-row"]',
            '[data-testid="starred-repository-row"]',
            '[data-testid="repository-item"]',
            '.repository-row',
            '.starred-repo-item',
            '.col-12.d-flex.flex-column.border-bottom', // Generic layout
            '.py-3.border-bottom'
          ];

          // Method 1: Containers
          for (const sel of containerSelectors) {
            const nodes = document.querySelectorAll(sel);
            if (nodes && nodes.length > 0) {
              nodes.forEach(node => {
                const repoInfo = extractRepoFromContainerEnhanced(node);
                if (repoInfo) {
                  repos.add(repoInfo);
                }
              });
            }
          }

          // Method 2: All Links
          if (repos.size === 0) {
            const links = document.querySelectorAll('a[href]');
            links.forEach(link => {
              const repoInfo = extractRepoFromLinkEnhanced(link);
              if (repoInfo) {
                repos.add(repoInfo);
              }
            });
          }

          // Method 3: Aggressive Text
          if (repos.size === 0) {
            const textRepos = extractReposFromTextAggressive();
            textRepos.forEach(r => repos.add(r));
          }

          return Array.from(repos);
        }

        // Helper function for scrolling
        async function scrollToLoadContent() {
          return new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight || document.documentElement.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight || totalHeight > 20000) {
                clearInterval(timer);
                window.scrollTo(0, 0);
                setTimeout(resolve, 500);
              }
            }, 200);
          });
        }

        // --- END HELPER FUNCTIONS ---

        // Enhanced extraction logic specifically for GitHub list pages
        async function extractWithRetry(retryCount = 0) {
          const maxRetries = 3;

          try {
            console.log('Background: Starting enhanced extraction...');

            // Wait for page to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Auto-scroll to load lazy content
            await scrollToLoadContent();

            // Extract list name and repositories using enhanced methods
            const listName = await extractListNameEnhanced();
            const repos = await extractRepositoriesEnhanced();

            resolve({
              repos: Array.from(new Set(repos)),
              listName: listName,
              url: window.location.href,
              extractedAt: new Date().toISOString(),
              retryCount: retryCount
            });

          } catch (error) {
            if (retryCount < maxRetries) {
              console.log(`Background: Extraction attempt ${retryCount + 1} failed, retrying...`);
              setTimeout(() => extractWithRetry(retryCount + 1), 1000 * (retryCount + 1));
            } else {
              resolve({ error: error.message, retryCount });
            }
          }
        }

        extractWithRetry();
      });
    }
  });

  if (!result) {
    throw new Error('No result from enhanced extraction script');
  }

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

// Fallback extraction using message passing
async function performFallbackExtraction(tabId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { action: 'extractListFromPage' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error('No response from content script'));
        } else {
          resolve(response);
        }
      });
    }, 1000);
  });
}

// Enhanced tab update handling
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('github.com')) {
    console.log('GitHub page loaded:', tab.url);

    // Track active GitHub tabs for better user experience
    if (tab.url.includes('/stars')) {
      chrome.action.setBadgeText({
        text: '★',
        tabId: tabId
      });
      chrome.action.setBadgeBackgroundColor({ color: '#ff6b35' });
    }
  }
});

// Enhanced extension icon handling
chrome.action.onClicked.addListener((tab) => {
  // Default behavior is handled by popup, but we can provide additional functionality
  if (tab.url && tab.url.includes('github.com')) {
    console.log('Extension clicked on GitHub page:', tab.url);
  }
});

// Cleanup resources periodically
setInterval(() => {
  // Clean up old cache entries (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, value] of globalState.cache.entries()) {
    if (value.timestamp && value.timestamp < oneHourAgo) {
      globalState.cache.delete(key);
    }
  }

  // Clean up finished extractions
  for (const [id, extraction] of globalState.activeExtractions.entries()) {
    if (Date.now() - extraction.startTime > 300000) { // 5 minutes
      globalState.activeExtractions.delete(id);
    }
  }

  console.log('Background: Cleanup completed', {
    cacheSize: globalState.cache.size,
    activeExtractions: globalState.activeExtractions.size
  });
}, 300000); // Run every 5 minutes

// Handle browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('StarWise extension started');
  // Reset any stale state
  globalState.activeExtractions.clear();
});