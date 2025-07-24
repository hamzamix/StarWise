
# 🌟 Starwise - AI GitHub Repo Manager

Starwise helps you manage and categorize your GitHub starred repositories using the power of AI. It provides a clean dashboard to view your starred repos, and allows you to add custom tags or use AI-powered suggestions to keep everything organized.

The entire application is self-contained and deployable via a single Docker Compose command.

![Starwise Screenshot](https://storage.googleapis.com/fpl-assets/starwise-screenshot.png)

## ✨ Features

- **GitHub OAuth Login**: Securely sign in with your GitHub account.
- **Starred Repo Dashboard**: View all your starred repositories in a clean, card-based layout.
- **Manual Tagging**: Add your own custom tags to any repository.
- **AI-Powered Tag Suggestions**: Use Google's Gemini AI to automatically suggest relevant tags based on repository content.
- **Dynamic Search**: Instantly filter and search your repos by name, description, or tags.
- **Persistent Storage**: Your tags are saved in a SQLite database.
- **Dark/Light Mode**: Automatic theme detection with a manual toggle.
- **Easy Deployment**: Deploy the entire stack with Docker Compose.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python)
- **AI**: Google Gemini API
- **Database**: SQLite
- **Containerization**: Docker & Docker Compose
- **Authentication**: GitHub OAuth2 with session cookies

## 🚀 Getting Started

Follow these instructions to get Starwise up and running on your local machine or server.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.
- A GitHub account.

### 1. GitHub OAuth Application

You need to create a GitHub OAuth App to handle authentication.

1.  Go to **Settings** > **Developer settings** > **OAuth Apps** on GitHub.
2.  Click **New OAuth App**.
3.  Fill in the details:
    - **Application name**: `Starwise` (or anything you like)
    - **Homepage URL**: `http://localhost:3000`
    - **Authorization callback URL**: `http://localhost:8000/api/auth/callback/github`
4.  Click **Register application**.
5.  On the next page, generate a new **client secret**. Copy the **Client ID** and the new **Client Secret**.

### 2. Google Gemini API Key

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in and click **"Get API key"**.
3.  Create a new API key in a new or existing project.
4.  Copy the generated API key.

### 3. Configuration

1.  Clone this repository:
    ```sh
    git clone <your-repo-url>
    cd starwise
    ```
2.  Create a `.env` file by copying the example file:
    ```sh
    cp .env.example .env
    ```
3.  Open the `.env` file and fill in the values you obtained in the previous steps:

    ```env
    # From your GitHub OAuth App
    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret

    # From Google AI Studio
    GEMINI_API_KEY=your_gemini_api_key

    # A long, random string for securing sessions
    SECRET_KEY=a_very_secret_random_string
    ```

### 4. Build and Run

With Docker running, build and start the application containers:

```sh
docker-compose up --build
```

The `--build` flag ensures that Docker rebuilds the images if you make any code changes.

### 5. Access Starwise

Open your web browser and navigate to:

[http://localhost:3000](http://localhost:3000)

You should be greeted with the login screen. Sign in with GitHub to start organizing your stars!

## 🐳 Portainer Deployment

To deploy using a Portainer Stack:

1.  In Portainer, go to **Stacks** > **Add stack**.
2.  Give it a name (e.g., `starwise`).
3.  Choose **Git Repository** as the build method.
4.  **Repository URL**: Your git repository URL.
5.  **Compose path**: `docker-compose.yml`
6.  Click **Advanced options**.
7.  In the **Environment variables** section, add the `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GEMINI_API_KEY`, and `SECRET_KEY` from your `.env` file.
8.  Click **Deploy the stack**.
