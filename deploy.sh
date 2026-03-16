#!/bin/bash

# Agent7 Intelligence Interface - Deployment Script

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     AGENT7 INTELLIGENCE INTERFACE - DEPLOYMENT             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project root?"
    exit 1
fi

# Check environment
print_status "Checking environment..."

if [ "$NODE_ENV" = "production" ]; then
    print_warning "NODE_ENV is already set to production"
fi

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set"
    exit 1
fi

print_success "Environment check passed"

# Install dependencies
print_status "Installing dependencies..."
npm ci
print_success "Dependencies installed"

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Run type checking
print_status "Running TypeScript type check..."
npm run lint
print_success "Type check passed"

# Build application
print_status "Building application..."
npm run build
print_success "Build completed"

# Check if dist folder was created
if [ ! -d "dist" ]; then
    print_error "Build failed - dist folder not found"
    exit 1
fi

print_success "Build artifacts verified"

# Option to deploy with Docker
if command -v docker &> /dev/null; then
    echo ""
    read -p "Deploy with Docker? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Building Docker image..."
        docker build -t agent7-intelligence .
        print_success "Docker image built"
        
        print_status "Starting container..."
        docker run -d \
            --name agent7 \
            -p 3000:3000 \
            -e DATABASE_URL="$DATABASE_URL" \
            -e GEMINI_API_KEY="$GEMINI_API_KEY" \
            -e OPENAI_API_KEY="$OPENAI_API_KEY" \
            -e NODE_ENV=production \
            --restart unless-stopped \
            agent7-intelligence
        
        print_success "Container started"
        print_status "Application available at: http://localhost:3000"
    fi
else
    print_warning "Docker not found. Skipping Docker deployment."
    print_status "To start the server manually, run: npm start"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   DEPLOYMENT COMPLETE                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
