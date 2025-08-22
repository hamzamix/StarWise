# Stage 1: Build the React frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy frontend package files and install dependencies
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

# Copy the rest of the frontend source code and build it
COPY frontend/. ./frontend/
RUN npm run build

# Stage 2: Build the production server
FROM node:20-alpine
WORKDIR /app

# Copy the built frontend from the 'builder' stage to the 'public' directory
# The backend is configured to serve files from here.
COPY --from=builder /app/frontend/dist ./public

# Copy backend package files and install production dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Copy the backend source code
COPY backend/index.js .

# Expose the port the app runs on
EXPOSE 4000

# The command to run the application
CMD ["node", "index.js"]
