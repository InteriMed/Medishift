#!/bin/bash
cd ~/Interimed/NEW\ INTERIMED\ MERGED

echo "=== Checking latest deployment status ==="
firebase functions:list | grep -i banking

echo ""
echo "=== Latest requestBankingAccessCode logs ==="
firebase functions:log --only requestBankingAccessCode | head -50

echo ""
echo "=== All recent errors ==="
firebase functions:log | grep -i "requestbankingaccesscode" | tail -10

