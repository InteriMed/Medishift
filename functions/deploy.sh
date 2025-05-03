#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Firebase Functions deployment...${NC}"

# Ensure we're in the functions directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Run linting
echo -e "${YELLOW}Running linter...${NC}"
npm run lint

# Check for any lint errors
if [ $? -ne 0 ]; then
  echo -e "${RED}Linting failed. Please fix the errors before deploying.${NC}"
  exit 1
fi

# Ask for environment
echo -e "${YELLOW}Select environment to deploy to:${NC}"
select env in "development" "staging" "production"; do
  case $env in
    development)
      PROJECT_ID="your-dev-project-id"
      break
      ;;
    staging)
      PROJECT_ID="your-staging-project-id"
      break
      ;;
    production)
      PROJECT_ID="your-prod-project-id"
      
      # Extra confirmation for production
      echo -e "${RED}Are you sure you want to deploy to PRODUCTION? (y/n)${NC}"
      read -r confirm
      if [[ $confirm != "y" ]]; then
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 0
      fi
      break
      ;;
    *)
      echo -e "${RED}Invalid selection${NC}"
      ;;
  esac
done

# Set the project
echo -e "${YELLOW}Setting Firebase project to: $PROJECT_ID${NC}"
firebase use $PROJECT_ID

# Deploy functions
echo -e "${YELLOW}Deploying functions...${NC}"
firebase deploy --only functions

# Check deployment status
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Deployment successful!${NC}"
else
  echo -e "${RED}Deployment failed. Check the error messages above.${NC}"
  exit 1
fi

echo -e "${YELLOW}Deployment completed.${NC}" 