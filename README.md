# StarWise

Organize your GitHub Stars with AI-powered tagging using Google Gemini.

This project uses a standard two-server development setup:
-   **React Frontend:** A modern frontend built with Vite, running on its own dev server.
-   **Node.js Backend:** An Express server that handles API requests and GitHub authentication.

## Features

-   **GitHub Authentication:** Securely log in with your GitHub account.
-   **Sync Starred Repos:** Fetch and sync all your starred repositories from GitHub.
-   **AI-Powered Tagging:** Automatically generates relevant, technical tags for each repository using the Google Gemini API.
-   **Custom Lists:** Create custom lists to categorize and organize your starred repos.
-   **Filter & Search:** Easily filter repositories by list.
-   **Modern UI:** A sleek, responsive, dark-themed interface built with Material-UI.

## Local Installation and Setup

Follow these steps to run StarWise on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) (comes with Node.js)
-   A [GitHub account](https://github.com/)
-   A [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository

First, clone this repository to your local machine.

```bash
git clone <repository_url>
cd <repository_directory>
```

### 2. Set Up the GitHub OAuth App

StarWise uses GitHub for authentication. You need to create a GitHub OAuth application to get a client ID and secret.

1.  Go to your GitHub **Settings**.
2.  Navigate to **Developer settings** > **OAuth Apps**.
3.  Click **New OAuth App**.
4.  Fill in the application details:
    *   **Application name:** StarWise (or any name you prefer)
    *   **Homepage URL:** `http://localhost:5173` (This is the default Vite port for the frontend)
    *   **Authorization callback URL:** `http://localhost:4000/auth/github/callback` (This must point to your backend)
5.  Click **Register application**.
6.  On the next page, you will see your **Client ID**.
7.  Click **Generate a new client secret**. Copy this secret immediately, as you won't be able to see it again.

### 3. Configure Backend Environment Variables

The backend needs several secret keys to run.

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create a new file named `.env`:
    ```bash
    touch .env
    ```
3.  Open the `.env` file and add the following variables, replacing the placeholders.

    ```env
    # GitHub OAuth App Credentials (from Step 2)
    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret

    # Google Gemini API Key
    # Get yours from https://aistudio.google.com/app/apikey
    API_KEY=your_google_ai_api_key

    # A long random string for session security
    SESSION_SECRET=a_long_random_string_for_session_security
    ```

### 4. Run the Application

You will need two terminals open to run both the backend and frontend servers.

**Terminal 1: Start the Backend**

1.  Navigate to the `backend` directory.
    ```bash
    cd backend
    ```
2.  Install dependencies.
    ```bash
    npm install
    ```
3.  Start the backend server.
    ```bash
    npm start
    ```
4.  You should see the message `Backend listening on http://localhost:4000`. Leave this terminal running.

**Terminal 2: Start the Frontend**

1.  Open a new terminal and navigate to the **root** project directory.
2.  Install dependencies.
    ```bash
    npm install
    ```
3.  Start the frontend development server.
    ```bash
    npm run dev
    ```
4.  Vite will start the server and show you a URL, typically `http://localhost:5173`.

### 5. Open the App

Open your web browser and navigate to the frontend URL provided by Vite: **[http://localhost:5173](http://localhost:5173)**. The application should now be running correctly.

## Running with Docker

You can also run the entire application in a single Docker container using Docker Compose.

1.  **Ensure Docker is installed** and running on your machine.
2.  **Make sure you have configured `backend/.env`** as described in Step 3 of the local installation.
3.  From the root directory of the project, run:
    ```bash
    docker-compose up --build
    ```
4.  This command will build the Docker image (which includes building the frontend and installing backend dependencies) and start the container.
5.  Open your browser and navigate to **[http://localhost:4000](http://localhost:4000)**. The application should be running.

To stop the application, press `Ctrl+C` in the terminal and then run `docker-compose down`.
