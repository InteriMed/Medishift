#!/bin/bash

# Document Auto-Fill Feature Setup Script
# This script sets up the Google Cloud APIs and deploys the Cloud Function

echo "========================================="
echo "Document Auto-Fill Feature Setup"
echo "========================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if firebase is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is not installed"
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Get the current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project is set"
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "✓ Using Google Cloud Project: $PROJECT_ID"
echo ""

# Step 1: Enable required APIs
echo "Step 1: Enabling required Google Cloud APIs..."
echo "-------------------------------------------"

echo "Enabling Cloud Vision API..."
gcloud services enable vision.googleapis.com --project=$PROJECT_ID

echo "Enabling Vertex AI API..."
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID

echo "Enabling Cloud Functions API..."
gcloud services enable cloudfunctions.googleapis.com --project=$PROJECT_ID

echo "Enabling Cloud Build API..."
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID

echo "✓ APIs enabled successfully"
echo ""

# Step 2: Install dependencies
echo "Step 2: Installing Cloud Function dependencies..."
echo "-------------------------------------------"

cd functions

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in functions directory"
    exit 1
fi

echo "Installing npm packages..."
npm install

echo "✓ Dependencies installed successfully"
echo ""

# Step 3: Deploy Cloud Function
echo "Step 3: Deploying processDocument Cloud Function..."
echo "-------------------------------------------"

echo "Deploying function..."
firebase deploy --only functions:processDocument

if [ $? -eq 0 ]; then
    echo "✓ Cloud Function deployed successfully"
else
    echo "❌ Error: Failed to deploy Cloud Function"
    exit 1
fi

echo ""
echo "========================================="
echo "✓ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test the feature by uploading a document in the Profile page"
echo "2. Monitor Cloud Function logs: firebase functions:log"
echo "3. Check costs in Google Cloud Console"
echo ""
echo "Documentation: .docs/FEATURE_DOCUMENT_AUTOFILL.md"
echo ""
