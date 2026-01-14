#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Deploying Firebase Storage configuration...${NC}"

if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed.${NC}"
    echo -e "${YELLOW}Install it with: npm install -g firebase-tools${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Deploying Storage Rules...${NC}"
firebase deploy --only storage

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to deploy storage rules${NC}"
    exit 1
fi

echo -e "${GREEN}Storage rules deployed successfully!${NC}"

if ! command -v gsutil &> /dev/null; then
    echo -e "${YELLOW}gsutil not found. Skipping CORS configuration.${NC}"
    echo -e "${YELLOW}To apply CORS later, run: ./apply-storage-cors.sh${NC}"
    exit 0
fi

STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-${REACT_APP_FIREBASE_STORAGE_BUCKET}}"

if [ -z "$STORAGE_BUCKET" ] && [ -f "frontend/.env" ]; then
    STORAGE_BUCKET=$(grep -E "^REACT_APP_FIREBASE_STORAGE_BUCKET=" frontend/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$STORAGE_BUCKET" ]; then
    echo -e "${YELLOW}CORS configuration skipped - bucket name not found${NC}"
    echo -e "${YELLOW}To apply CORS later, run: ./apply-storage-cors.sh${NC}"
    exit 0
fi

echo -e "${YELLOW}Step 2: Applying CORS configuration...${NC}"
echo -e "${YELLOW}Using storage bucket: $STORAGE_BUCKET${NC}"
gsutil cors set storage.cors.json gs://$STORAGE_BUCKET

if [ $? -eq 0 ]; then
    echo -e "${GREEN}CORS configuration applied successfully!${NC}"
else
    echo -e "${RED}Failed to apply CORS configuration${NC}"
    exit 1
fi

echo -e "${GREEN}Storage configuration complete!${NC}"














