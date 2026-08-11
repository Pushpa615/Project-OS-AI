#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:./db/custom.db"
export NEXTAUTH_SECRET="project-os-ai-secret-key-2024"
exec bun run dev
