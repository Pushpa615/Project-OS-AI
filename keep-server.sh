#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:./db/custom.db"
export NEXTAUTH_SECRET="project-os-ai-secret-key-2024"
while true; do
  bun run dev 2>&1
  echo "Server died, restarting in 3s..."
  sleep 3
done
