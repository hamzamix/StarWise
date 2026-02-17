# StarWise v1.2.0 Release Notes 🚀

We are excited to announce the release of **StarWise v1.2.0**! This version is a major milestone, bringing a completely redesigned data architecture, new analytics insights, expanded AI capabilities, and a brand-new browser extension.

---

## ⚠️ Important: Breaking Changes
*   **New Volume Mount**: The application now uses `/data` for persistent storage (previously `/app/backend`). Please update your `docker-compose.yml` to reflect this change.
*   **Environment Variables**: New environment variables have been added for AI providers. Check the updated `docker-compose.yml` for the full list.

## 🔄 Automatic Database Migration
*   **Data Safety First**: StarWise now includes an automatic migration script. On your first start after updating to v1.2.0, the app will automatically move your database from the legacy path to the new `/data` location. **No data loss occurs during this process.**

---

## ✨ New Features

### 📊 Trends & Insights Tab
*   A brand-new dashboard to visualize your starring habits.
*   Track starred repository growth over time.
*   View your top programming languages and most-used AI tags in beautiful charts.

### 💾 Advanced Backup System
*   **Release Tracking**: StarWise now automatically tracks releases for your starred repositories.
*   **Persistent Backups**: The app can now store the last three versions of a repo's release.
*   **Automatic Downloads**: New versions are downloaded automatically when they become available.
*   **Sort by Backups**: Easily find repositories that have active backups.

### 🤖 Expanded AI Architecture
*   **New Providers**: Support for **OpenAI (GPT-4), Anthropic (Claude), and OpenRouter** (in addition to Google Gemini).
*   **Smart Rate Limiting**: New "Auto-retry" logic. If hit with a rate limit, the app can automatically wait and retry, or pause for manual resume.
*   **Progress UI**: The "Generate AI Tags" button now shows real-time progress (X of Y) so you know exactly how far the process has come.

### 📖 Integrated Readme Reader
*   Read any repository's README file directly within StarWise.
*   Clean, markdown-rendered view with a dedicated "Read" modal.

### 📤 Share My Stack
*   Export your curated lists as professional **Markdown** tables.
*   One-click publishing to **GitHub Gists** to share your collections with the world.

### 🧩 Browser Extension
*   Introducing the **StarWise Lists Importer** (Chromium-based).
*   Easily import your existing GitHub lists directly into StarWise.

---

## 🛠️ Improvements & Bug Fixes

*   **Improved Repo Cards**: 
    *   Now displays up to **8 tags** (increased from 4).
    *   New icons for Readme Reader, Backup status, and latest Release Version.
*   **Enhanced Sync Engine**: Faster and more reliable synchronization with GitHub's current state.
*   **Refined Settings**: New UI for selecting AI providers and managing database imports/exports.
*   **Stability**: Fixed several "blank page" issues in production environments and improved defensive coding against malformed API data.

---

*Thank you for using StarWise! If you enjoy the project, don't forget to [star us on GitHub](https://github.com/hamzamix/StarWise).*
