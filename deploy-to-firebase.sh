#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting complete Firebase deployment (Frontend + Functions)...${NC}"

# Build frontend first
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm install
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Frontend build failed!${NC}"
  exit 1
fi

cd ..

# Deploy functions
echo -e "${YELLOW}Installing function dependencies...${NC}"
cd functions
npm install

echo -e "${YELLOW}Deploying functions...${NC}"
firebase deploy --only functions

if [ $? -ne 0 ]; then
  echo -e "${RED}Functions deployment failed!${NC}"
  exit 1
fi

cd ..

# Deploy hosting
echo -e "${YELLOW}Deploying frontend to Firebase hosting...${NC}"
firebase deploy --only hosting

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Complete deployment successful!${NC}"
  echo -e "${GREEN}Your app is now live on Firebase hosting with working functions!${NC}"
else
  echo -e "${RED}Hosting deployment failed!${NC}"
  exit 1
fi 