#!/bin/bash

# StarWise Fresh Deployment Script
# This script ensures a completely clean deployment with no existing data

echo "============================================"
echo "   StarWise Fresh Deployment Script"
echo "============================================"
echo

# Stop and remove existing containers
echo "[1/6] Stopping existing containers..."
docker-compose down

# Remove the persistent volume (this removes ALL existing data)
echo "[2/6] Removing old data volumes (WARNING: This deletes all existing data)..."
docker volume rm starwise_db 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Note: Volume starwise_db does not exist or already removed"
fi

# Remove old images to ensure clean build
echo "[3/6] Removing old Docker images..."
docker rmi starwise-docker-version-starwise 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Note: No old StarWise images found to remove"
fi

# Build fresh image
echo "[4/6] Building fresh Docker image..."
docker-compose build --no-cache

# Start the application with fresh database
echo "[5/6] Starting application with empty database..."
docker-compose up -d

# Show logs to verify startup
echo "[6/6] Application logs (first 20 lines):"
docker-compose logs --tail=20

echo
echo "============================================"
echo "   Deployment Complete!"
echo "============================================"
echo
echo "Your StarWise application is now running with a fresh, empty database."
echo "Access it at: http://localhost:4000"
echo
echo "IMPORTANT NOTES:"
echo "- This deployment starts with NO data"
echo "- All existing repositories and lists have been removed"
echo "- The backup folder content is preserved"
echo
echo "To keep data between deployments, uncomment the volume line in docker-compose.yml"
echo "and remove the '#' before: # - starwise_db:/app/backend"
echo