#!/bin/sh
set -e

# Generate mapfile from template, substituting DB connection variables
envsubst '${DB_HOST} ${DB_USER} ${DB_PASSWORD}' \
  < /mapserver/mapfiles/sonla-docker.map.template \
  > /mapserver/mapfiles/sonla-docker.map

export MAPFILE_PATH=/mapserver/mapfiles/sonla-docker.map

echo "[mapserver-entrypoint] Generated mapfile at $MAPFILE_PATH"
echo "[mapserver-entrypoint] MapServer binary: $(which mapserv 2>/dev/null || echo 'not found')"
echo "[mapserver-entrypoint] Starting mapserver-service on port ${PORT:-3008}..."

exec node src/index.js
