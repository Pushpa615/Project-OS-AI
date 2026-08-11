#!/bin/bash
cd /home/z/my-project

# Clean start
pkill -f 'next-server' 2>/dev/null
pkill -f 'next dev' 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Start server
./node_modules/.bin/next dev -p 3000 > /tmp/pos.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server
echo "Waiting for server..."
for i in $(seq 1 90); do
  if curl -s --max-time 3 http://localhost:3000/api/auth/session > /dev/null 2>&1; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
done

USER_ID='cmsobnzli0000ou69jlpbdejl'

echo ''
echo '=== 1. ONBOARDING ==='
RESP=$(curl -s --max-time 60 -X POST http://localhost:3000/api/onboarding \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"fullName\":\"Test User\",\"college\":\"MIT\",\"course\":\"CS\",\"academicYear\":\"3rd\",\"phone\":\"\",\"bio\":\"AI enthusiast\",\"skills\":[\"React\",\"Next.js\",\"TypeScript\"]}")
echo "$RESP"

# Check server still alive
echo ''
echo '=== CHECK ALIVE ==='
curl -s --max-time 5 -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000/api/auth/session
echo ''

if [ ! -d "/proc/$SERVER_PID" ]; then
  echo 'SERVER DIED - checking log:'
  tail -30 /tmp/pos.log
  exit 1
fi

echo ''
echo '=== 2. CREATE PROJECT ==='
RESP2=$(curl -s --max-time 60 -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"name\":\"AI Chat App\",\"description\":\"A real-time AI chat application\",\"projectType\":\"web_app\",\"targetUsers\":\"Students\",\"goal\":\"Build full-stack chat app\",\"deadline\":\"2025-09-01\",\"difficulty\":\"medium\",\"techStack\":[\"React\",\"Node.js\",\"OpenAI\"],\"features\":[\"Real-time chat\",\"AI responses\",\"User auth\"]}")
echo "$RESP2" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Created:', d['data']['name'], '| ID:', d['data']['id'])" 2>/dev/null || echo "Project response: $(echo $RESP2 | head -c 200)"

PROJ_ID=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

echo ''
echo '=== 3. LIST PROJECTS ==='
curl -s --max-time 15 "http://localhost:3000/api/projects?userId=$USER_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Projects: {len(d[\"data\"])}')" 2>/dev/null
echo ''
echo '=== 4. TASKS FOR PROJECT ==='
curl -s --max-time 15 "http://localhost:3000/api/tasks?projectId=$PROJ_ID&userId=$USER_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Tasks: {len(d.get(\"data\",[]))}')" 2>/dev/null
echo ''
echo '=== 5. NOTIFICATIONS ==='
curl -s --max-time 15 "http://localhost:3000/api/notifications?userId=$USER_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Notifications: {len(d.get(\"data\",[]))}')" 2>/dev/null
echo ''
echo '=== ALL TESTS DONE ==='
tail -5 /tmp/pos.log

# Don't kill server - leave it running
# kill $SERVER_PID 2>/dev/null
