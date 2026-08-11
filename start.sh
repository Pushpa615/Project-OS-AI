#!/bin/bash
cd /home/z/my-project
exec bun run dev 2>&1 | tee -a /home/z/my-project/dev.log
