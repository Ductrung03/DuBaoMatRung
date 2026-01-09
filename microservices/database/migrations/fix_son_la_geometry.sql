-- Migration: Fix invalid geometries in son_la_mat_rung table
-- Purpose: Fix geometric errors and remove duplicates

-- Step 1: Fix invalid geometries
UPDATE son_la_mat_rung
SET geom = ST_MakeValid(geom)
WHERE NOT ST_IsValid(geom);

-- Step 2: Remove exact duplicates (same geometry and dates)
DELETE FROM son_la_mat_rung a
USING son_la_mat_rung b
WHERE a.gid < b.gid
AND ST_Equals(a.geom, b.geom)
AND a.start_dau = b.start_dau
AND a.end_sau = b.end_sau;

-- Step 3: Create index on geometry if not exists
CREATE INDEX IF NOT EXISTS idx_son_la_mat_rung_geom ON son_la_mat_rung USING GIST (geom);

-- Step 4: Create index on dates for better query performance
CREATE INDEX IF NOT EXISTS idx_son_la_mat_rung_dates ON son_la_mat_rung (start_dau, end_sau);

-- Step 5: Analyze table to update statistics
ANALYZE son_la_mat_rung;

-- Report statistics
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT geom) as unique_geometries,
  SUM(CASE WHEN ST_IsValid(geom) THEN 1 ELSE 0 END) as valid_geometries,
  SUM(CASE WHEN NOT ST_IsValid(geom) THEN 1 ELSE 0 END) as invalid_geometries
FROM son_la_mat_rung;
