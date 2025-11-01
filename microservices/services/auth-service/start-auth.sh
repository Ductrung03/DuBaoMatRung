#!/bin/bash

# Start Auth Service Script

echo "🚀 Starting Auth Service..."

# Kill existing process
pkill -f "node.*src/index.js" 2>/dev/null
sleep 2

# Start service
cd "$(dirname "$0")"
NODE_ENV=development node src/index.js
