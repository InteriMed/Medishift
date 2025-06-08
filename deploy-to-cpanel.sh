#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting cPanel deployment preparation...${NC}"

# Create deployment directory
mkdir -p cpanel-deployment

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm install
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Frontend build failed!${NC}"
  exit 1
fi

# Copy frontend build to deployment folder
echo -e "${YELLOW}Copying frontend build files...${NC}"
cp -r build/* ../cpanel-deployment/

cd ..

# Prepare backend for cPanel
echo -e "${YELLOW}Preparing backend for cPanel...${NC}"
if [ -d "backend-for-cpanel" ]; then
  cd backend-for-cpanel
  npm install --production
  
  # Copy backend files to deployment folder
  mkdir -p ../cpanel-deployment/api
  cp -r * ../cpanel-deployment/api/
  
  cd ..
fi

# Create instructions file
cat > cpanel-deployment/DEPLOYMENT_INSTRUCTIONS.txt << EOF
CPANEL DEPLOYMENT INSTRUCTIONS
==============================

1. FRONTEND DEPLOYMENT:
   - Upload all files from this directory (except the 'api' folder) to your cPanel public_html directory
   - Your frontend will be accessible at your domain

2. BACKEND DEPLOYMENT (if using Express backend):
   - Upload the 'api' folder to your cPanel account
   - Set up Node.js application in cPanel:
     * Go to "Setup Node.js App" in cPanel
     * Create new application with these settings:
       - Node.js version: 14+ (or latest available)
       - Application mode: Production
       - Application root: /api
       - Application URL: yourdomain.com/api
       - Startup file: server.js
   - Install dependencies by running: npm install
   - Start the application

3. ENVIRONMENT VARIABLES:
   - Set up Firebase service account key
   - Configure environment variables in cPanel Node.js app

4. UPDATE FRONTEND CONFIG:
   - Update your frontend Firebase configuration to point to your new API endpoints
   - Change function calls from Firebase functions to your new Express API

IMPORTANT NOTES:
- Make sure Node.js is enabled on your cPanel hosting
- Some shared hosting providers don't support Node.js applications
- Consider using Firebase hosting instead for easier deployment with functions
EOF

echo -e "${GREEN}Deployment files prepared in 'cpanel-deployment' directory!${NC}"
echo -e "${YELLOW}Please read DEPLOYMENT_INSTRUCTIONS.txt for next steps${NC}" 