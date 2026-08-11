#!/bin/bash
set -e

cd /home/z/my-project
pkill -f 'next dev' 2>/dev/null; pkill -f 'agent-browser' 2>/dev/null; sleep 2

echo '[1/7] Starting dev server...'
bun run dev > /dev/null 2>&1 &
echo 'Waiting 90s for compilation...'
sleep 90

STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)
if [ "$STATUS" != "200" ]; then
  echo "FAIL: Server returned $STATUS"
  tail -20 /home/z/my-project/dev.log
  exit 1
fi
echo "Server: $STATUS ✓"

# API Tests
echo '[2/7] Register API...'
REG=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Verify Test","email":"verify-final@proj.ai","password":"VerifyFinal123!"}')
REG_STATUS=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo '?')
echo "  Register: $REG_STATUS"

USER_ID=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo '')
echo "  User ID: $USER_ID"

# Test auth-protected endpoints without session (should 401)
echo '[3/7] Auth-protected endpoints (no session)...'
P_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Test\",\"userId\":\"$USER_ID\"}")
echo "  POST /projects (no auth): $P_STATUS (expect 401)"

T_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"Test\",\"projectId\":\"fake\",\"userId\":\"$USER_ID\"}")
echo "  POST /tasks (no auth): $T_STATUS (expect 401)"

C_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/checkins \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$USER_ID\"}")
echo "  POST /checkins (no auth): $C_STATUS (expect 401)"

# Browser Tests
echo '[4/7] Browser: Login page...'
agent-browser open http://localhost:3000 2>&1
sleep 3
echo "  Page title: $(agent-browser get title 2>&1)"

echo '[5/7] Browser: Signup flow...'
agent-browser click @e6 2>&1
sleep 2

# Fill form using JavaScript for reliability
echo '  Filling form via JS...'
agent-browser eval "
  const name = document.querySelector('input[placeholder=\"John Doe\"]');
  const email = document.querySelector('input[placeholder=\"you@example.com\"]');
  const pwd = document.querySelectorAll('input[type=\"password\"]');
  
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  nativeSetter.call(name, 'Browser Verified User');
  name.dispatchEvent(new Event('input', { bubbles: true }));
  
  nativeSetter.call(email, 'browseruser@proj.ai');
  email.dispatchEvent(new Event('input', { bubbles: true }));
  
  nativeSetter.call(pwd[0], 'BrowserUser123!');
  pwd[0].dispatchEvent(new Event('input', { bubbles: true }));
  
  nativeSetter.call(pwd[1], 'BrowserUser123!');
  pwd[1].dispatchEvent(new Event('input', { bubbles: true }));
  
  'form filled'
" 2>&1
sleep 1

# Find and click submit button
echo '  Submitting...'
agent-browser find text "Create Account" click 2>&1
sleep 15

# Check result
echo '[6/7] After signup...'
PAGE_TITLE=$(agent-browser get title 2>&1)
echo "  Page title: $PAGE_TITLE"

# Check if we're on onboarding or dashboard
SNAP=$(agent-browser snapshot -c 2>&1)
echo "$SNAP" | head -15

echo '[7/7] Console errors...'
agent-browser errors 2>&1 | head -10

echo ''
echo '=== DEV LOG (last 15 lines) ==='
tail -15 /home/z/my-project/dev.log

echo ''
echo '=== VERIFICATION COMPLETE ==='
