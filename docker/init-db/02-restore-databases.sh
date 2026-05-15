#!/bin/bash
# Restore database schemas and data from SQL dumps
set -e

SCHEMAS_DIR="/db-schemas"

if [ ! -d "$SCHEMAS_DIR" ]; then
  echo "[init-db] WARNING: $SCHEMAS_DIR not found, skipping data restore."
  exit 0
fi

echo "[init-db] Restoring auth_db..."
if [ -f "$SCHEMAS_DIR/auth_db.sql" ]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "auth_db" < "$SCHEMAS_DIR/auth_db.sql"
  echo "[init-db] auth_db restored."
else
  echo "[init-db] WARNING: auth_db.sql not found."
fi

echo "[init-db] Restoring gis_db..."
if [ -f "$SCHEMAS_DIR/gis_db.sql" ]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "gis_db" < "$SCHEMAS_DIR/gis_db.sql"
  echo "[init-db] gis_db restored."
else
  echo "[init-db] WARNING: gis_db.sql not found."
fi

echo "[init-db] Restoring admin_db..."
if [ -f "$SCHEMAS_DIR/admin_db.sql" ]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "admin_db" < "$SCHEMAS_DIR/admin_db.sql"
  echo "[init-db] admin_db restored."
else
  echo "[init-db] WARNING: admin_db.sql not found."
fi

echo "[init-db] All databases restored successfully."
