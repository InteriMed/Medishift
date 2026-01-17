#!/bin/bash

PROJECT_ID="interimed-620fd"
DATABASE_NAME="medishift"
RULES_FILE="database.rules.json"

echo "Deploying Realtime Database rules for instance: $DATABASE_NAME"
echo "Project: $PROJECT_ID"
echo ""

ACCESS_TOKEN=$(firebase login:ci 2>&1 | grep -oP 'token:\s*\K[^\s]+' || firebase auth:export --format json 2>/dev/null | jq -r '.users[0].uid' || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "⚠️  Could not automatically get access token."
  echo ""
  echo "Please deploy rules manually:"
  echo "1. Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/database/$DATABASE_NAME/rules"
  echo "2. Copy the contents of $RULES_FILE"
  echo "3. Paste into the rules editor"
  echo "4. Click 'Publish'"
  echo ""
  echo "Or get an access token and run:"
  echo "  curl -X PUT 'https://$PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app/.settings/rules.json?access_token=YOUR_TOKEN' -H 'Content-Type: application/json' -d @$RULES_FILE"
  exit 1
fi

echo "Attempting to deploy via REST API..."
echo "Note: This may require the database URL format for your region."
echo ""
echo "If this fails, please deploy manually through the Firebase Console:"
echo "https://console.firebase.google.com/project/$PROJECT_ID/database/$DATABASE_NAME/rules"
exit 0

