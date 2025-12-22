#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GoDaddy Deployment Preparation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ ! -d "frontend" ]; then
  echo -e "${RED}Error: 'frontend' directory not found!${NC}"
  echo "Please run this script from the project root directory."
  exit 1
fi

echo -e "${YELLOW}Step 1: Installing frontend dependencies...${NC}"
cd frontend

if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found in frontend directory!${NC}"
  exit 1
fi

npm install

if [ $? -ne 0 ]; then
  echo -e "${RED}npm install failed!${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Building React application for production...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed!${NC}"
  exit 1
fi

if [ ! -d "build" ]; then
  echo -e "${RED}Error: Build directory was not created!${NC}"
  exit 1
fi

cd ..

echo ""
echo -e "${YELLOW}Step 3: Preparing deployment package...${NC}"

DEPLOY_DIR="godaddy-deployment"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

cp -r frontend/build/* "$DEPLOY_DIR/"

if [ -f "frontend/public/.htaccess" ]; then
  cp frontend/public/.htaccess "$DEPLOY_DIR/.htaccess"
  echo -e "${GREEN}✓ .htaccess file included${NC}"
else
  echo -e "${YELLOW}⚠ .htaccess file not found, creating default one...${NC}"
  cat > "$DEPLOY_DIR/.htaccess" << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
EOF
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment package ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Files are ready in: ${YELLOW}$DEPLOY_DIR${NC}"
echo ""
echo "2. Upload all files from '$DEPLOY_DIR' to your GoDaddy hosting:"
echo "   - Login to GoDaddy cPanel"
echo "   - Open File Manager"
echo "   - Navigate to public_html"
echo "   - Upload all files from $DEPLOY_DIR"
echo ""
echo "3. Or use FTP:"
echo "   - Connect to your GoDaddy FTP server"
echo "   - Navigate to /public_html"
echo "   - Upload all files from $DEPLOY_DIR"
echo ""
echo "4. Make sure .htaccess file is uploaded (it may be hidden)"
echo ""
echo -e "${YELLOW}For detailed instructions, see: GODADDY_DEPLOYMENT_GUIDE.md${NC}"
echo ""




