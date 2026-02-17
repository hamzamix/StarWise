# Multi-stage build for StarWise application
# Build stage for React frontend
FROM node:20-alpine AS frontend-builder

# Add labels for better container management
LABEL maintainer="StarWise Contributors"
LABEL version="1.2.0"
LABEL description="StarWise - AI-powered GitHub Stars organization tool"

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application with version information
ARG APP_VERSION=1.2.0
ENV VITE_APP_VERSION=${APP_VERSION}
ENV NPM_PACKAGE_VERSION=${APP_VERSION}
RUN echo "Building StarWise version: ${VITE_APP_VERSION}" && npm run build

# Production stage
FROM node:20-alpine AS production

# Add labels
LABEL maintainer="StarWise Contributors"
LABEL version="1.2.0"

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S starwise -u 1001

# Set working directory
WORKDIR /app

# Copy built frontend from builder stage
COPY --from=frontend-builder --chown=starwise:nodejs /app/dist ./public

# Copy backend files
COPY --chown=starwise:nodejs backend/package*.json ./backend/
COPY --chown=starwise:nodejs backend/ ./backend/

# Copy migration files and fix script
COPY --chown=starwise:nodejs backend/migrations.js /app/migrations.js
COPY --chown=starwise:nodejs run-migrations-entry.js /app/run-migrations.js
COPY --chown=starwise:nodejs fix-database.js /app/fix-database.js

# Install production dependencies for backend
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Create data directory with proper permissions
RUN mkdir -p /data && chown -R starwise:nodejs /data && chown -R starwise:nodejs /app

# Switch back to app directory
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Expose port
EXPOSE 4000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run migrations first on container start, then start the main backend.
CMD ["sh", "-c", "node /app/run-migrations.js || true; exec node backend/index.js"]