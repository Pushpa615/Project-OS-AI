#!/bin/bash
cd /home/z/my-project/.next/standalone
while true; do
    NODE_OPTIONS="--max-old-space-size=384" PORT=3000 node server.js > /home/z/my-project/server.log 2>&1
    echo "Server exited, restarting in 1s..." >> /home/z/my-project/server.log
    sleep 1
done
