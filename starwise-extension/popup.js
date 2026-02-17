// Enhanced StarWise Lists Importer Extension Popup
class StarWiseImporter {
  constructor() {
    this.starwiseUrl = 'http://localhost:5173';
    this.backendUrl = 'http://localhost:4000';
    this.isConnected = false;
    this.isExtracting = false;
    this.stats = {
      listsFound: 0,
      reposFound: 0,
      extractionTime: 0
    };

    this.init();
  }

  async init() {
    console.log('StarWise Popup: Initializing...');

    // Load settings
    const settings = await chrome.storage.sync.get(['backendUrl', 'starwiseUrl']);
    this.backendUrl = settings.backendUrl || 'http://localhost:4000';
    this.starwiseUrl = settings.starwiseUrl || 'http://localhost:5173';

    // Initialize inputs
    const backendInput = document.getElementById('backendUrlInput');
    const frontendInput = document.getElementById('frontendUrlInput');
    if (backendInput) backendInput.value = this.backendUrl;
    if (frontendInput) frontendInput.value = this.starwiseUrl;

    await this.checkConnection();
    this.setupEventListeners();
    this.updateUI();
  }

  async checkConnection() {
    try {
      console.log('StarWise Popup: Checking connection...');

      const response = await fetch(`${this.backendUrl}/api/user`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.user) {
          this.isConnected = true;
          this.user = userData.user;
          this.updateStatus(`Connected as ${userData.user.username}`, 'connected');
          this.enableImportButton();
          console.log('StarWise Popup: Connection successful');
        } else {
          throw new Error('Not authenticated');
        }
      } else {
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error) {
      console.warn('StarWise Popup: Connection check failed:', error.message);
      this.isConnected = false;
      this.updateStatus('StarWise not running or not logged in', 'disconnected');
      this.disableImportButton();
    }
  }

  updateStatus(message, type) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
    }
  }

  updateStats(stats) {
    this.stats = { ...this.stats, ...stats };
    this.renderStats();
  }

  renderStats() {
    const statsContainer = document.getElementById('stats');
    if (!statsContainer || !this.stats.listsFound) return;

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-number">${this.stats.listsFound}</span>
          <span class="stat-label">Lists</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${this.stats.reposFound}</span>
          <span class="stat-label">Repositories</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${this.stats.extractionTime}s</span>
          <span class="stat-label">Time</span>
        </div>
      </div>
    `;
  }

  enableImportButton() {
    const button = document.getElementById('importButton');
    if (button) {
      button.disabled = false;
      button.textContent = 'Import GitHub Lists';
      button.classList.remove('loading');
    }
  }

  disableImportButton() {
    const button = document.getElementById('importButton');
    if (button) {
      button.disabled = true;
      button.textContent = 'StarWise Not Connected';
    }
  }

  setupEventListeners() {
    const importButton = document.getElementById('importButton');
    const settingsButton = document.getElementById('settingsButton');
    const refreshButton = document.getElementById('refreshButton');

    if (importButton) {
      importButton.addEventListener('click', () => this.startImport());
    }

    if (settingsButton) {
      settingsButton.addEventListener('click', () => this.toggleSettings());
    }

    const saveSettingsButton = document.getElementById('saveSettingsBtn');
    if (saveSettingsButton) {
      saveSettingsButton.addEventListener('click', () => this.saveSettings());
    }

    if (refreshButton) {
      refreshButton.addEventListener('click', () => this.refreshConnection());
    }
  }

  async refreshConnection() {
    const refreshBtn = document.getElementById('refreshButton');
    if (refreshBtn) {
      refreshBtn.innerHTML = '<span class="spinner"></span> Clearing cache...';
      refreshBtn.disabled = true;
    }

    try {
      // Clear content script cache first
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('github.com')) {
        await chrome.tabs.sendMessage(tab.id, { action: 'clearCache' });
      }

      // Clear background cache
      await chrome.runtime.sendMessage({ action: 'clearBackgroundCache' });

      this.showMessage('✅ Cache cleared! Refreshing connection...', 'success');

    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }

    await this.checkConnection();

    if (refreshBtn) {
      refreshBtn.innerHTML = 'Refresh';
      refreshBtn.disabled = false;
    }

    // Auto-close popup after successful refresh
    setTimeout(() => {
      window.close();
    }, 1500);
  }

  updateUI() {
    // Update popup UI based on current state
    const statsContainer = document.getElementById('stats');
    if (statsContainer) {
      statsContainer.style.display = this.stats.listsFound ? 'block' : 'none';
    }
  }

  async startImport() {
    if (!this.isConnected) {
      this.showMessage('Please ensure StarWise is running and you are logged in.', 'error');
      return;
    }

    if (this.isExtracting) {
      this.showMessage('Import already in progress...', 'info');
      return;
    }

    try {
      this.isExtracting = true;
      const startTime = Date.now();

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('github.com')) {
        throw new Error('Please navigate to your GitHub stars page first.');
      }

      console.log('StarWise Popup: Starting import from:', tab.url);

      // Show progress with enhanced UI
      this.showProgress('🔍 Scanning GitHub for lists...', 0);

      // Enhanced extraction with better error handling
      const response = await this.extractWithRetry(tab.id);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.lists || response.lists.length === 0) {
        throw new Error('No lists found on this page. Make sure you\'re on your GitHub stars page.');
      }

      // Update stats
      const totalRepos = response.lists.reduce((sum, list) => sum + (list.repos?.length || 0), 0);
      const extractionTime = Math.round((Date.now() - startTime) / 1000);

      this.updateStats({
        listsFound: response.lists.length,
        reposFound: totalRepos,
        extractionTime: extractionTime
      });

      console.log('StarWise Popup: Found', response.lists.length, 'lists with', totalRepos, 'repos');

      // Process the lists with enhanced feedback
      await this.processListsWithFeedback(response.lists);

    } catch (error) {
      console.error('StarWise Popup: Import failed:', error);
      this.showMessage(error.message || 'Failed to import lists. Please try again.', 'error');
    } finally {
      this.isExtracting = false;
      this.hideProgress();
    }
  }

  async extractWithRetry(tabId, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.showProgress(`🔍 Scanning GitHub (attempt ${attempt}/${maxRetries})...`, attempt * 20);

        const response = await chrome.tabs.sendMessage(tabId, { action: 'extractLists' });

        if (response && (response.lists || response.error)) {
          return response;
        }

        throw new Error('No response from content script');
      } catch (error) {
        console.warn(`StarWise Popup: Extraction attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }



  async processListsWithFeedback(lists) {
    const total = lists.length;
    let completed = 0;
    const createdLists = [];
    const failedLists = [];

    this.showProgress(`📤 Importing ${total} lists to StarWise...`, 0);

    // Enhanced processing with better error handling and user feedback
    for (const list of lists) {
      try {
        this.showProgress(`📋 Processing "${list.name}" (${completed + 1}/${total})...`,
          Math.round((completed / total) * 100));

        const response = await fetch(`${this.backendUrl}/api/lists/import-github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ lists: [list] })
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        completed++;

        // Fix: The backend returns createdLists, not created
        if (data && data.createdLists && Array.isArray(data.createdLists)) {
          createdLists.push(...data.createdLists);
        }

        // Also check for results with different statuses
        if (data && data.results && Array.isArray(data.results)) {
          data.results.forEach(result => {
            if (result.status === 'created' || result.status === 'updated') {
              // This is a successful operation
              createdLists.push(result);
            }
          });
        }

        // Update progress
        const progress = Math.round((completed / total) * 100);
        this.showProgress(`✅ Imported ${completed}/${total} lists`, progress);

      } catch (error) {
        console.error('StarWise Popup: Import failed for list', list.name, error);
        failedLists.push({ name: list.name, error: error.message });
        completed++;
      }
    }

    // Final results
    const successCount = createdLists.length;
    const failCount = failedLists.length;

    // Enhanced debug logging
    console.log('StarWise Popup: Import results:', {
      successCount,
      failCount,
      createdLists,
      failedLists
    });

    if (successCount > 0) {
      this.showMessage(`🎉 Successfully imported ${successCount} lists!`, 'success');

      // Open StarWise lists page after a short delay
      setTimeout(() => {
        chrome.tabs.create({ url: `${this.starwiseUrl}/lists` });
      }, 1500);
    }

    if (failCount > 0) {
      const failureMessage = `⚠️ ${failCount} lists failed to import: ${failedLists.map(l => l.name).join(', ')}`;
      this.showMessage(failureMessage, 'warning');
    }

    if (successCount === 0 && failCount === 0) {
      this.showMessage('📋 No new lists to import (all lists already exist)', 'info');
    }

    this.updateStats({
      listsFound: total,
      reposFound: createdLists.reduce((sum, list) => sum + (list.repos?.length || 0), 0)
    });
  }

  showProgress(message, progress = 50) {
    const progressEl = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const messageEl = document.getElementById('message');

    if (progressEl) {
      progressEl.style.display = 'block';
    }

    if (progressFill) {
      progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = 'message';
    }
  }

  hideProgress() {
    const progressEl = document.getElementById('progress');
    if (progressEl) {
      setTimeout(() => {
        progressEl.style.display = 'none';
      }, 1000);
    }
  }

  showMessage(message, type = '') {
    const messageEl = document.getElementById('message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `message ${type}`;
    }

    // Auto-hide success messages after a while
    if (type === 'success') {
      setTimeout(() => {
        if (messageEl && messageEl.textContent === message) {
          messageEl.textContent = '';
          messageEl.className = 'message';
        }
      }, 5000);
    }
  }

  toggleSettings() {
    const settingsDiv = document.getElementById('settings');
    if (settingsDiv) {
      const isHidden = settingsDiv.style.display === 'none';
      settingsDiv.style.display = isHidden ? 'block' : 'none';
    }
  }

  async saveSettings() {
    const backendInput = document.getElementById('backendUrlInput');
    const frontendInput = document.getElementById('frontendUrlInput');

    if (!backendInput || !frontendInput) return;

    const newBackendUrl = backendInput.value.trim().replace(/\/$/, '');
    const newFrontendUrl = frontendInput.value.trim().replace(/\/$/, '');

    if (!newBackendUrl || !newFrontendUrl) {
      this.showMessage('Please enter valid URLs', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({
        backendUrl: newBackendUrl,
        starwiseUrl: newFrontendUrl
      });

      this.backendUrl = newBackendUrl;
      this.starwiseUrl = newFrontendUrl;

      this.showMessage('Settings saved! Reconnecting...', 'success');
      this.toggleSettings();
      this.refreshConnection();

    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    }
  }
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('StarWise Popup: DOM loaded, initializing...');
  new StarWiseImporter();
});