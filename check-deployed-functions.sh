#!/bin/bash
echo "Checking deployed Firebase functions..."
firebase functions:list | grep -i "banking"

