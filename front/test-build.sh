#!/bin/bash

echo "Testing Docker build for frontend..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Make sure you're in the frontend directory."
    exit 1
fi

# List files to verify build context
echo "Build context files:"
ls -la

# Test Docker build
echo "Building Docker image..."
docker build -t frontend-test .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
    echo "Cleaning up test image..."
    docker rmi frontend-test
else
    echo "❌ Docker build failed!"
    exit 1
fi 