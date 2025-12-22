#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Applying CORS configuration to Firebase Storage bucket...${NC}"

if ! command -v gsutil &> /dev/null; then
    echo -e "${RED}Error: gsutil is not installed.${NC}"
    echo -e "${YELLOW}Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-${REACT_APP_FIREBASE_STORAGE_BUCKET}}"

if [ -z "$STORAGE_BUCKET" ] && [ -f "frontend/.env" ]; then
    STORAGE_BUCKET=$(grep -E "^REACT_APP_FIREBASE_STORAGE_BUCKET=" frontend/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$STORAGE_BUCKET" ]; then
    echo -e "${YELLOW}Please set FIREBASE_STORAGE_BUCKET or REACT_APP_FIREBASE_STORAGE_BUCKET environment variable${NC}"
    echo -e "${YELLOW}Example: export FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com${NC}"
    exit 1
fi

echo -e "${YELLOW}Using storage bucket: $STORAGE_BUCKET${NC}"
gsutil cors set storage.cors.json gs://$STORAGE_BUCKET

if [ $? -eq 0 ]; then
    echo -e "${GREEN}CORS configuration applied successfully!${NC}"
    echo -e "${GREEN}Storage bucket now allows requests from localhost:4000${NC}"
else
    echo -e "${RED}Failed to apply CORS configuration${NC}"
    exit 1
fi

