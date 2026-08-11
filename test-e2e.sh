#!/bin/bash
cd /home/z/my-project

# Kill any existing processes
pkill -f 'next dev' 2>/dev/null
pkill -f 'agent-browser' 2>/dev/null
sleep 2

# Start dev server
bun run dev > /dev/null 2>&1 &

echo "[1/10] Waiting for server compilation (90s)..."
sleep 90

# Verify server
echo "[2/10] Checking server..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)
echo "Server status: $STATUS"
if [ "$STATUS" != "200" ]; then
  echo "FAIL: Server not responding"
  exit 1
fi

# Open browser
echo "[3/10] Opening browser..."
agent-browser open http://localhost:3000 2>&1
sleep 3

# Get login page elements
echo "[4/10] Login page snapshot:"
agent-browser snapshot -i 2>&1 | head -15

# Click Sign Up
echo "[5/10] Navigating to signup..."
agent-browser click @e6 2>&1
sleep 2

# Get signup form elements
echo "Signup page snapshot:"
agent-browser snapshot -i 2>&1 | head -20

# Fill signup form: name=e6, email=e7, password=e8, confirm=e10, submit=e4
echo "[6/10] Filling signup form..."
agent-browser fill @e6 'Test User' 2>&1
agent-browser fill @e7 'testuser@projectos.ai' 2>&1
agent-browser fill @e8 'TestPass123!' 2>&1
agent-browser fill @e10 'TestPass123!' 2>&1
sleep 1

echo "[7/10] Submitting signup..."
agent-browser click @e4 2>&1
sleep 12

# Check result - should be on onboarding
echo "[8/10] After signup snapshot:"
agent-browser snapshot -i 2>&1 | head -50

# Check for errors
echo "[9/10] Console errors:"
agent-browser errors 2>&1 | head -20

# Get page URL
echo "[10/10] Current URL:"
agent-browser get url 2>&1

echo "\n=== TEST COMPLETE ==="
