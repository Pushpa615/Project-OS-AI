#!/bin/bash
cd /home/z/my-project

pkill -f 'next dev' 2>/dev/null
pkill -f 'agent-browser' 2>/dev/null
sleep 2

# Start dev server
bun run dev > /dev/null 2>&1 &

echo "[1/12] Waiting for server compilation (90s)..."
sleep 90

STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)
echo "Server status: $STATUS"
if [ "$STATUS" != "200" ]; then
  echo "FAIL: Server not responding"
  exit 1
fi

# Open browser
echo "[2/12] Opening browser..."
agent-browser open http://localhost:3000 2>&1
sleep 3

echo "[3/12] Login page:"
agent-browser snapshot -i 2>&1 | head -15

# Navigate to Sign Up
echo "[4/12] Clicking Sign Up..."
agent-browser click @e6 2>&1
sleep 2

# Get signup refs
echo "Signup form:"
agent-browser snapshot -i 2>&1 | head -20

# Fill signup - name=e6, email=e7, password=e8, confirm=e10, submit=e4
echo "[5/12] Filling signup..."
agent-browser fill @e6 'Test User' 2>&1
agent-browser fill @e7 'newuser@projectos.ai' 2>&1
agent-browser fill @e8 'TestPass123!' 2>&1
agent-browser fill @e10 'TestPass123!' 2>&1
sleep 1

echo "[6/12] Submitting signup..."
agent-browser click @e4 2>&1
sleep 12

# Should be on onboarding step 1
echo "[7/12] After signup - Onboarding:"
agent-browser snapshot -i 2>&1 | head -20

# Fill onboarding step 1 using JS to handle the custom Select component
echo "[8/12] Filling onboarding step 1 via JS..."
agent-browser eval "
  // Set input values directly
  const inputs = document.querySelectorAll('input');
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  
  // Name (first input)
  nativeInputValueSetter.call(inputs[0], 'Test User');
  inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  
  // College (third input - second is phone)
  nativeInputValueSetter.call(inputs[2], 'MIT');
  inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
  
  // Course (fourth input)
  nativeInputValueSetter.call(inputs[3], 'Computer Science');
  inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
  
  // Bio (textarea, sixth form element)
  const textareas = document.querySelectorAll('textarea');
  if (textareas.length > 0) {
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeTextareaValueSetter.call(textareas[0], 'Full-stack developer and AI enthusiast');
    textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  'onboarding filled'
" 2>&1
sleep 1

# Handle the Select - click to open, then click option
echo "[8b/12] Handling academic year select..."
agent-browser click @e7 2>&1
sleep 1
echo "Select opened:"
agent-browser snapshot -i 2>&1 | head -25

# Click 3rd Year option
agent-browser click @e13 2>&1
sleep 1
echo "After select:"
agent-browser snapshot -i 2>&1 | head -20

# Click Continue button
echo "[9/12] Clicking Continue..."
agent-browser click @e9 2>&1
sleep 3

# Should be on step 2 (Skills)
echo "[10/12] Onboarding step 2 (Skills):"
agent-browser snapshot -i 2>&1 | head -30

# Select some skills - click Continue to skip
echo "[11/12] Clicking Continue on skills..."
# Find the Continue button in skills step
agent-browser snapshot -i 2>&1 | rg 'Continue' | head -5
agent-browser snapshot -i 2>&1 | rg 'button' | head -15

# Click the second Continue button (skills step)
continue_ref=$(agent-browser snapshot -i 2>&1 | rg 'Continue' | rg -o 'ref=e[0-9]+' | rg -o 'e[0-9]+' | tail -1)
echo "Continue ref: $continue_ref"
if [ -n "$continue_ref" ]; then
  agent-browser click @$continue_ref 2>&1
  sleep 3
fi

# Should be on step 3 (Accounts)
echo "=== STEP 3 ==="
agent-browser snapshot -i 2>&1 | head -30

# Click Skip for now
skip_ref=$(agent-browser snapshot -i 2>&1 | rg 'Skip' | rg -o 'ref=e[0-9]+' | rg -o 'e[0-9]+' | head -1)
echo "Skip ref: $skip_ref"
if [ -n "$skip_ref" ]; then
  agent-browser click @$skip_ref 2>&1
  sleep 5
fi

# Should be on Dashboard now
echo "[12/12] Dashboard:"
agent-browser snapshot -i 2>&1 | head -60

echo "=== URL ==="
agent-browser get url 2>&1

echo "=== ERRORS ==="
agent-browser errors 2>&1 | head -20

echo "=== COMPLETE ==="