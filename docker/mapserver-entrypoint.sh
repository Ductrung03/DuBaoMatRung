#!/bin/sh
set -e

# Validate required environment variables
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  echo "[mapserver-entrypoint] ERROR: Missing required DB env vars (DB_HOST, DB_USER, DB_PASSWORD)"
  exit 1
fi

# DB_PORT defaults to 5432 (internal Docker port is always 5432)
export DB_PORT="${DB_PORT:-5432}"

# Generate mapfile from template, substituting all DB connection variables
envsubst '${DB_HOST} ${DB_PORT} ${DB_USER} ${DB_PASSWORD}' \
  < /mapserver/mapfiles/sonla-docker.map.template \
  > /mapserver/mapfiles/sonla-docker.map

if [ ! -s /mapserver/mapfiles/sonla-docker.map ]; then
  echo "[mapserver-entrypoint] ERROR: mapfile generation failed or empty"
  exit 1
fi

export MAPFILE_PATH=/mapserver/mapfiles/sonla-docker.map

echo "[mapserver-entrypoint] Mapfile generated: $MAPFILE_PATH"
echo "[mapserver-entrypoint] mapserv: $(mapserv -v 2>&1 | head -1 || echo 'not found')"
echo "[mapserver-entrypoint] Starting on port ${PORT:-3008}..."

exec node src/index.js
