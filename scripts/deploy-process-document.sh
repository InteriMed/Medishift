#!/bin/bash

# Quick Deploy Script for processDocument Function
# This script deploys the updated Cloud Function with CORS support

echo "================================================"
echo "Deploying processDocument Cloud Function"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: firebase.json not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if functions directory exists
if [ ! -d "functions" ]; then
    echo "❌ Error: functions directory not found"
    exit 1
fi

echo "✓ Project structure verified"
echo ""

# Install dependencies if needed
echo "Step 1: Installing dependencies..."
echo "-----------------------------------"
cd functions

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "✓ Dependencies already installed"
fi

echo ""

# Deploy the function
echo "Step 2: Deploying processDocument function..."
echo "----------------------------------------------"
cd ..

echo "Running: firebase deploy --only functions:processDocument"
echo ""

firebase deploy --only functions:processDocument

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ Deployment Successful!"
    echo "================================================"
    echo ""
    echo "The processDocument function has been deployed with CORS support."
    echo ""
    echo "Next steps:"
    echo "1. Refresh your browser (Ctrl+Shift+R)"
    echo "2. Try uploading a document again"
    echo "3. The CORS error should be resolved!"
    echo ""
    echo "Monitor logs with:"
    echo "  firebase functions:log --only processDocument"
    echo ""
else
    echo ""
    echo "================================================"
    echo "❌ Deployment Failed"
    echo "================================================"
    echo ""
    echo "Please check the error messages above."
    echo ""
    echo "Common issues:"
    echo "1. Not logged in to Firebase CLI"
    echo "   Solution: firebase login"
    echo ""
    echo "2. Wrong project selected"
    echo "   Solution: firebase use <project-id>"
    echo ""
    echo "3. Missing dependencies"
    echo "   Solution: cd functions && npm install"
    echo ""
    exit 1
fi
