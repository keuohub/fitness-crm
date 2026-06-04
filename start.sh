#!/bin/bash
lsof -ti :3001 | xargs kill -9 2>/dev/null
rm -rf .next
source ~/.nvm/nvm.sh && nvm use 20
npm run dev
