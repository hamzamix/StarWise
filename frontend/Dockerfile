# Stage 1: Build the React application
# Use the full Node.js 18 image for maximum compatibility with build tools.
FROM node:18 as builder

WORKDIR /app

# Copy package.json and the lock file if it exists.
# This takes advantage of Docker's layer caching.
COPY package.json ./
# If package-lock.json exists, copy it. If not, this command is skipped without error.
COPY package-lock.json ./

# Install dependencies. Using --verbose to get more logs if it fails again.
RUN npm install --verbose

# Copy the rest of the application files
COPY . .

# Build the application for production
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:1.25-alpine

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
