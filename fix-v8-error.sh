#!/bin/bash

echo "Fixing V8 Fatal Error - Cleaning build artifacts and dependencies..."

cd "$(dirname "$0")"

echo "1. Removing node_modules..."
rm -rf node_modules

echo "2. Removing build directory..."
rm -rf build

echo "3. Removing .cache directories..."
find . -type d -name ".cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true

echo "4. Clearing npm cache..."
npm cache clean --force

echo "5. Removing package-lock.json..."
rm -f package-lock.json

echo "6. Clearing webpack cache..."
rm -rf .webpack-cache 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

echo "7. Reinstalling dependencies..."
npm install

echo "8. Verifying Node.js version (should be 18.x or 20.x)..."
node --version

echo ""
echo "✅ Cleanup complete! Try running 'npm start' again."
echo ""
echo "If the error persists, try:"
echo "  - Update Node.js to latest LTS version (18.x or 20.x)"
echo "  - Increase Node.js memory: NODE_OPTIONS='--max-old-space-size=4096' npm start"
echo "  - Check for native module compatibility issues"

