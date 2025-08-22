# Stage 1: Build the React frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies for the frontend
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend source code and build it
COPY . .
# The "tsc &&" part is removed as Vite handles TypeScript compilation.
# If you have a separate tsconfig.json for type-checking, you can keep it.
RUN npm run build

# Stage 2: Build the production server
FROM node:20-alpine
WORKDIR /app

# Copy the built frontend from the 'builder' stage to the 'public' directory
# The backend is configured to serve files from here.
COPY --from=builder /app/dist ./public

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