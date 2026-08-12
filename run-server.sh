#!/bin/bash
cd /home/z/my-project
exec setsid bash -c '
while true; do
    NODE_OPTIONS="--max-old-space-size=256" npx next dev -p 3000 >> /home/z/my-project/server-run.log 2>&1
    sleep 1
done
'
