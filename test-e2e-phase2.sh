#!/bin/bash

echo "=== PHASE 2: Onboarding + Dashboard + Project Creation ==="

# Complete onboarding step 1
echo "[1/8] Filling onboarding step 1..."
agent-browser fill @e3 'Test User' 2>&1
agent-browser fill @e5 'MIT' 2>&1
agent-browser fill @e6 'Computer Science' 2>&1
agent-browser select @e7 '3rd Year' 2>&1
agent-browser fill @e8 'AI/ML enthusiast and full-stack developer' 2>&1
sleep 1
echo "Submitting step 1..."
agent-browser click @e9 2>&1
sleep 2

echo "=== AFTER STEP 1 ==="
agent-browser snapshot -i 2>&1 | head -40

# Complete onboarding step 2 - skills
echo "[2/8] Filling onboarding step 2 (skills)..."
# Get current refs
elements=$(agent-browser snapshot -i 2>&1)
echo "$elements" | head -30

# Look for checkbox elements for skills
echo "$elements" | rg 'checkbox' | head -10

# Click checkboxes for skills (typically TypeScript, React, Next.js, etc.)
# Based on the onboarding page, skills are presented as clickable tags
# Let me just click Continue to skip to step 3
sleep 1

# Find the Continue button
continue_ref=$(echo "$elements" | rg 'Continue' | rg -o 'ref=e[0-9]+' | rg -o 'e[0-9]+' | head -1)
if [ -n "$continue_ref" ]; then
  echo "Clicking Continue ($continue_ref)..."
  agent-browser click @$continue_ref 2>&1
  sleep 2
fi

echo "=== AFTER STEP 2 ==="
agent-browser snapshot -i 2>&1 | head -30

# Step 3 - skip connected accounts
continue_ref=$(agent-browser snapshot -i 2>&1 | rg 'Continue|Skip|Finish' | rg -o 'ref=e[0-9]+' | rg -o 'e[0-9]+' | head -1)
if [ -n "$continue_ref" ]; then
  echo "[3/8] Clicking $continue_ref to finish onboarding..."
  agent-browser click @$continue_ref 2>&1
  sleep 5
fi

echo "=== AFTER ONBOARDING ==="
agent-browser snapshot -i 2>&1 | head -50

echo "=== URL ==="
agent-browser get url 2>&1

# Should now be on dashboard
echo "[4/8] Checking dashboard..."
agent-browser snapshot -i 2>&1 | head -50

echo "[5/8] Console errors:"
agent-browser errors 2>&1 | head -20

echo "=== PHASE 2 COMPLETE ==="
