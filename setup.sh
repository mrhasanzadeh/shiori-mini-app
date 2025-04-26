#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Shiori Mini App...${NC}"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Create necessary directories
echo -e "${GREEN}Creating project structure...${NC}"
mkdir -p src/components
mkdir -p src/pages
mkdir -p src/store
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/types

# Initialize git repository if not already initialized
if [ ! -d .git ]; then
  echo -e "${GREEN}Initializing git repository...${NC}"
  git init
  git add .
  git commit -m "Initial commit"
fi

echo -e "${BLUE}Setup complete! You can now start the development server with:${NC}"
echo -e "${GREEN}npm run dev${NC}" 