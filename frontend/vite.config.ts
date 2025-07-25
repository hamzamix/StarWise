import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { fileURLToPath } from 'url';

// Define __dirname in an ES module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8000', // Use the service name for Docker networking
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      // Set up the '@' alias to point to the 'src' directory
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
