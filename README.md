# ⭐ StarWise

<p align="center">
  <img src="./logo.PNG" alt="StarWise Logo" width="120" height="120">
</p>

<p align="center">
  <strong>Important: Check out the <a href="https://github.com/hamzamix/LoanDash/releases/tag/v1.2.0">v1.2.0 release notes</a></strong>
</p>

<p align="center">
  <strong>Organize your GitHub Stars with AI-powered tagging</strong>
</p>

<p align="center">
  Transform your scattered GitHub stars into an organized, searchable knowledge base using the power of Google Gemini AI.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#docker">Docker</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## ✨ Features

### 🤖 **AI-Powered Smart Tagging**
- **Automatic Tag Generation:** Uses Google Gemini AI to analyze repository metadata and generate relevant, technical tags
- **Background Processing:** Tag generation runs in the background with real-time progress tracking
- **Rate Limit Handling:** Automatically detects and handles API rate limits with pause/resume functionality
- **Progress Persistence:** Resume tagging from where you left off after any interruption

### 📋 **Powerful Organization**
- **Custom Lists:** Create and manage custom lists to categorize repositories
- **Advanced Filtering:** Filter by language, repository type, tags, and more
- **Smart Search:** Search across repository names, descriptions, and tags
- **Bulk Operations:** Move repositories between lists and manage tags efficiently
- **Force Sync:** Automatic sync when selecting "Recently Active" filter for up-to-date data

### 🔐 **Secure & Private**
- **GitHub OAuth:** Secure authentication using your GitHub account
- **Local Data Storage:** All your data stays on your machine
- **API Key Security:** Environment-based configuration for API keys

### 🎨 **Modern Interface**
- **Dark/Light Theme:** Beautiful themes that adapt to your preference
- **Responsive Design:** Works perfectly on desktop and mobile
- **Material-UI Components:** Clean, modern interface built with Material-UI
- **Real-time Updates:** Live progress tracking and instant feedback
- **Version Management:** Built-in version display with update notifications

---

## 📸 Screenshots

**home 1**
![Starwise logo](https://raw.githubusercontent.com/hamzamix/StarWise/refs/heads/main/Screenshots/home1.png)

**home 2**
![Starwise logo](https://raw.githubusercontent.com/hamzamix/StarWise/refs/heads/main/Screenshots/home2.png)

**lists**
![Starwise logo](https://raw.githubusercontent.com/hamzamix/StarWise/refs/heads/main/Screenshots/lists.png)

**Backups**
![Starwise logo](https://raw.githubusercontent.com/hamzamix/StarWise/refs/heads/main/Screenshots/backups.png)

**Insights**
![Starwise logo](https://raw.githubusercontent.com/hamzamix/StarWise/refs/heads/main/Screenshots/insights.png)

**Settings**
![Starwise logo](https://raw.githubusercontent.com/hamzamix/StarWise/refs/heads/main/Screenshots/settings.png)

**Share Stack**
![Starwise logo](https://raw.githubusercontent.com/hamzamix/StarWise/refs/heads/main/Screenshots/share.png)

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/starwise.git
   cd starwise
   ```

2. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys (see setup guide below)
   ```

3. **Run with Docker:**
   ```bash
   docker-compose up --build
   ```

4. **Open your browser:**
   Navigate to [http://localhost:4000](http://localhost:4000)

### Option 2: Local Development

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

3. **Start the backend:**
   ```bash
   cd backend && npm start
   ```

4. **Start the frontend (new terminal):**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:5173](http://localhost:5173)

---

## 🛠 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (optional, for Docker setup)
- [GitHub account](https://github.com/)
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 1. GitHub OAuth Setup

Create a GitHub OAuth application to enable authentication:

#### For Local Development
1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name:** StarWise (Development)
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:4000/auth/github/callback`
4. Save your **Client ID** and **Client Secret**

#### For Docker Deployment
1. Create another OAuth App (or update the existing one):
   - **Application name:** StarWise (Docker)
   - **Homepage URL:** `http://localhost:4000` ⚠️ **Important: Use port 4000 for Docker**
   - **Authorization callback URL:** `http://localhost:4000/auth/github/callback`
2. Use the same **Client ID** and **Client Secret** in your `.env` file

> **💡 Port Explanation:**
> - **Local Development:** Frontend runs on port `5173`, backend on port `4000`
> - **Docker Deployment:** Both frontend and backend run on port `4000` in a single container
> - **OAuth Setup:** Always use port `4000` for the callback URL, but Homepage URL differs based on deployment method

### 2. Google AI API Setup

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Save your API key securely

### 3. Environment Configuration

Create `backend/.env` with your credentials:

```env
# GitHub OAuth (from step 1)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/auth/github/callback

# Google Gemini AI (from step 2)
API_KEY=your_google_ai_api_key

# Security
SESSION_SECRET=generate_a_long_random_string_here

# Server Configuration
PORT=4000

# AI Provider API Keys
OPENROUTER_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEFAULT_AI_PROVIDER=
```

---

## 🐳 Docker

StarWise includes full Docker support for easy deployment with secure environment variable handling:

### 📊 Port Configuration Summary

| Deployment Method | Frontend Port | Backend Port | Access URL | GitHub OAuth Homepage URL |
|-------------------|---------------|--------------|------------|---------------------------|
| **Local Development** | `5173` | `4000` | `http://localhost:5173` | `http://localhost:5173` |
| **Docker** | `4000` | `4000` | `http://localhost:4000` | `http://localhost:4000` |

### 🔒 Security Note
For security, API keys are **never hardcoded** in the Docker Compose files. Instead, they're loaded from your local `.env` file or system environment variables.

### Development Deployment

1. **Ensure your `.env` file exists:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your actual API keys
   ```

2. **Update GitHub OAuth App:**
   - Set **Homepage URL** to `http://localhost:4000`
   - Keep **Callback URL** as `http://localhost:4000/auth/github/callback`

3. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```
   This uses `env_file: backend/.env` to securely load your environment variables.

4. **Access the application:**
   Navigate to [http://localhost:4000](http://localhost:4000)

### Production Deployment

For production, use environment variables from your deployment platform:

```bash
# Set environment variables in your deployment platform (Heroku, DigitalOcean, etc.)
export GITHUB_CLIENT_ID="your_actual_client_id"
export GITHUB_CLIENT_SECRET="your_actual_secret"
export API_KEY="your_actual_api_key"
export SESSION_SECRET="your_secure_session_secret"

# AI Provider API Keys
OPENROUTER_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEFAULT_AI_PROVIDER=

# Then deploy with production compose file
docker-compose -f docker-compose.prod.yml up --build
```

### Docker Files Explained

- **`docker-compose.yml`** - Development setup, loads from `backend/.env` file
- **`docker-compose.prod.yml`** - Production setup, uses system environment variables
- **`dockerfile`** - Multi-stage build with verification steps

### Environment Variables Loading Order

1. **Development:** `backend/.env` file → Docker container
2. **Production:** System environment variables → Docker container
3. **Fallbacks:** Default values for non-sensitive settings (like PORT=4000)

---

## 🏗 Technology Stack

- **Frontend:** React 18 + TypeScript + Vite + Material-UI
- **Backend:** Node.js + Express.js + Passport (GitHub OAuth)
- **AI:** Google Gemini API
- **Deployment:** Docker + Docker Compose
- **Styling:** Material-UI with dark/light theme support

---

## 🤝 Contributing

We welcome contributions! StarWise is built with ❤️ for the developer community.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit:** `git commit -m 'Add amazing feature'`
6. **Push:** `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Areas for Contribution

- 🎨 UI/UX improvements
- 🔧 Additional AI providers (OpenAI, Claude, etc.)
- 📊 Analytics and insights features
- 🔍 Enhanced search and filtering
- 🌐 Internationalization
- 📱 Mobile app development
- 🧪 Testing improvements

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💝 Support

If StarWise helps you organize your GitHub stars, consider:

- ⭐ **Starring this repository**
- 🐛 **Reporting bugs** via [Issues](../../issues)
- 💡 **Suggesting features** via [Discussions](../../discussions)
- 🔗 **Sharing with fellow developers**

---

## 🎯 Roadmap

- [✅] **Export/Import functionality**
- [✅] **Backup repositories feature**
- [✅] **Sync GitHub Lists** - Import and sync GitHub's native starred repository lists
- [✅] **Collaboration features** (shared lists)
- [✅] **Browser extension**
- [✅] **Advanced analytics**
- [ ] **Mobile app**
- [✅] **Additional AI providers**
- [ ] **Team/Organization support**

---

<p align="center">
  Made with ❤️ for the GitHub community
</p>

<p align="center">
  <a href="#top">↑ Back to top</a>
</p>
