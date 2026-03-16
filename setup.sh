#!/bin/bash

# Agent7 Intelligence Interface - Setup Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     AGENT7 INTELLIGENCE INTERFACE - SETUP                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then 
        echo -e "${GREEN}✓ Node.js ${NODE_VERSION} detected${NC}"
    else
        echo -e "${RED}✗ Node.js 18+ required. Found: ${NODE_VERSION}${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm ${NPM_VERSION} detected${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Dependency installation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Setup environment
echo ""
echo "Setting up environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}! .env file created from .env.example${NC}"
        echo -e "${YELLOW}! Please edit .env with your API keys${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Prisma client generation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prisma client generated${NC}"

# Push database schema (optional)
echo ""
read -p "Push database schema? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma db push
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database schema pushed${NC}"
    else
        echo -e "${RED}✗ Database schema push failed${NC}"
    fi
fi

# Build the application
echo ""
echo "Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     SETUP COMPLETE                         ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  Next steps:                                               ║"
echo "║  1. Edit .env with your API keys                           ║"
echo "║  2. Run: npm run dev                                       ║"
echo "║  3. Open: http://localhost:3000                            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
