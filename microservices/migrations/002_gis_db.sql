-- ========================================
-- Migration: GIS Database Schema
-- Database: gis_db
-- Version: 1.0
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Table: mat_rung (Core deforestation data)
-- ========================================
CREATE TABLE IF NOT EXISTS mat_rung (
    gid SERIAL PRIMARY KEY,
    start_sau VARCHAR(10),
    area DOUBLE PRECISION,
    start_dau VARCHAR(10),
    end_sau VARCHAR(10),
    mahuyen VARCHAR(2),
    end_dau VARCHAR(10),
    geom GEOMETRY(MultiPolygon, 4326),
    geom_simplified GEOMETRY(MultiPolygon, 4326),

    -- Verification fields
    detection_status VARCHAR(20) DEFAULT 'Chưa xác minh',
    detection_date DATE,
    verified_by INTEGER, -- Reference to auth_db.users.id (cross-database)
    verified_area DOUBLE PRECISION,
    verification_reason VARCHAR(100),
    verification_notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_detection_status CHECK (
        detection_status IN ('Chưa xác minh', 'Đã xác minh', 'Từ chối', 'Đang xử lý')
    )
);

-- ========================================
-- Table: mat_rung_verification_log
-- ========================================
CREATE TABLE IF NOT EXISTS mat_rung_verification_log (
    id SERIAL PRIMARY KEY,
    gid INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_verified_area DOUBLE PRECISION,
    new_verified_area DOUBLE PRECISION,
    old_verification_reason VARCHAR(100),
    new_verification_reason VARCHAR(100),
    changed_by INTEGER NOT NULL, -- Reference to auth_db.users.id
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    client_ip INET,
    user_agent TEXT,

    CONSTRAINT fk_mat_rung FOREIGN KEY (gid) REFERENCES mat_rung(gid) ON DELETE CASCADE,
    CONSTRAINT chk_action CHECK (action IN ('VERIFY', 'UPDATE_VERIFICATION', 'REJECT', 'RESET'))
);

-- ========================================
-- Table: mat_rung_monthly_summary (Aggregated data)
-- ========================================
CREATE TABLE IF NOT EXISTS mat_rung_monthly_summary (
    month_year TIMESTAMP WITH TIME ZONE,
    mahuyen VARCHAR(2),
    geom GEOMETRY,
    alert_count BIGINT,
    total_area DOUBLE PRECISION,
    avg_area DOUBLE PRECISION,
    status_list VARCHAR[]
);

-- ========================================
-- Indexes - Spatial
-- ========================================
CREATE INDEX idx_mat_rung_geom_gist ON mat_rung USING gist(geom);
CREATE INDEX idx_mat_rung_geom_simplified_gist ON mat_rung USING gist(geom_simplified);
CREATE INDEX idx_mat_rung_geom_gist_optimized ON mat_rung USING gist(geom)
    WHERE ST_IsValid(geom) AND geom IS NOT NULL;
CREATE INDEX idx_mat_rung_geom_3857 ON mat_rung USING gist(ST_Transform(geom, 3857));

-- ========================================
-- Indexes - Attributes
-- ========================================
CREATE INDEX idx_mat_rung_gid ON mat_rung(gid);
CREATE INDEX idx_mat_rung_dates ON mat_rung(start_dau, end_sau);
CREATE INDEX idx_mat_rung_mahuyen ON mat_rung(mahuyen);
CREATE INDEX idx_mat_rung_detection_status ON mat_rung(detection_status);
CREATE INDEX idx_mat_rung_verified_by ON mat_rung(verified_by) WHERE verified_by IS NOT NULL;
CREATE INDEX idx_mat_rung_composite ON mat_rung(start_dau, end_sau, mahuyen);
CREATE INDEX idx_mat_rung_status_date ON mat_rung(detection_status, detection_date DESC)
    WHERE detection_status = 'Đã xác minh';

-- Verification log indexes
CREATE INDEX idx_verification_log_gid ON mat_rung_verification_log(gid);
CREATE INDEX idx_verification_log_changed_by ON mat_rung_verification_log(changed_by);
CREATE INDEX idx_verification_log_changed_at ON mat_rung_verification_log(changed_at DESC);

-- ========================================
-- Functions - Triggers
-- ========================================

-- Function: Auto-calculate area before insert/update
CREATE OR REPLACE FUNCTION update_area_in_hectares()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate area in m² using geography cast
    NEW.area = ST_Area(NEW.geom::geography);
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Log verification changes
CREATE OR REPLACE FUNCTION log_verification_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when verification fields change
    IF (OLD.detection_status IS DISTINCT FROM NEW.detection_status) OR
       (OLD.verified_area IS DISTINCT FROM NEW.verified_area) OR
       (OLD.verification_reason IS DISTINCT FROM NEW.verification_reason) THEN

        INSERT INTO mat_rung_verification_log (
            gid,
            action,
            old_status,
            new_status,
            old_verified_area,
            new_verified_area,
            old_verification_reason,
            new_verification_reason,
            changed_by
        ) VALUES (
            NEW.gid,
            CASE
                WHEN OLD.detection_status IS NULL OR OLD.detection_status != 'Đã xác minh'
                     AND NEW.detection_status = 'Đã xác minh'
                THEN 'VERIFY'
                WHEN NEW.detection_status = 'Từ chối' THEN 'REJECT'
                ELSE 'UPDATE_VERIFICATION'
            END,
            OLD.detection_status,
            NEW.detection_status,
            OLD.verified_area,
            NEW.verified_area,
            OLD.verification_reason,
            NEW.verification_reason,
            COALESCE(NEW.verified_by, 0)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Triggers
-- ========================================
CREATE TRIGGER set_area_in_hectares
    BEFORE INSERT OR UPDATE ON mat_rung
    FOR EACH ROW EXECUTE FUNCTION update_area_in_hectares();

CREATE TRIGGER trigger_log_verification_change
    AFTER UPDATE ON mat_rung
    FOR EACH ROW EXECUTE FUNCTION log_verification_change();

-- ========================================
-- Functions - Spatial Queries
-- ========================================

-- Function: Search surrounding deforestation lots
CREATE OR REPLACE FUNCTION search_surrounding_lots(
    p_gid INTEGER,
    p_radius_meters INTEGER DEFAULT 5000
) RETURNS TABLE(
    gid INTEGER,
    distance_meters DOUBLE PRECISION,
    area DOUBLE PRECISION,
    detection_status VARCHAR,
    start_date VARCHAR,
    end_date VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.gid,
        ST_Distance(
            ST_Transform(m.geom, 3857),
            ST_Transform((SELECT geom FROM mat_rung WHERE gid = p_gid), 3857)
        ) as distance_meters,
        m.area,
        m.detection_status,
        m.start_dau,
        m.end_sau
    FROM mat_rung m
    WHERE m.geom IS NOT NULL
        AND ST_DWithin(
            ST_Transform(m.geom, 3857),
            ST_Transform((SELECT geom FROM mat_rung WHERE gid = p_gid), 3857),
            p_radius_meters
        )
    ORDER BY
        CASE WHEN m.gid = p_gid THEN 0 ELSE 1 END,
        distance_meters ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function: Get verification info (includes user info from service call)
CREATE OR REPLACE FUNCTION get_verification_basic_info(p_gid INTEGER)
RETURNS TABLE(
    gid INTEGER,
    area DOUBLE PRECISION,
    verified_area DOUBLE PRECISION,
    detection_status VARCHAR,
    verification_reason VARCHAR,
    verification_notes TEXT,
    detection_date DATE,
    verified_by INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.gid,
        m.area,
        m.verified_area,
        m.detection_status,
        m.verification_reason,
        m.verification_notes,
        m.detection_date,
        m.verified_by
    FROM mat_rung m
    WHERE m.gid = p_gid;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Views
-- ========================================

-- Optimized mat_rung view
CREATE OR REPLACE VIEW v_mat_rung_optimized AS
SELECT
    gid,
    start_dau,
    end_sau,
    area,
    mahuyen,
    geom,
    start_dau::DATE AS start_date,
    end_sau::DATE AS end_date,
    ROUND((area / 10000.0)::NUMERIC, 2) AS area_ha,
    detection_status,
    verified_by
FROM mat_rung m
WHERE ST_IsValid(geom) AND geom IS NOT NULL;

-- Verification statistics by status
CREATE OR REPLACE VIEW verification_stats_by_status AS
SELECT
    detection_status,
    COUNT(*) as total_cases,
    SUM(area) / 10000.0 as total_area_ha,
    AVG(area) / 10000.0 as avg_area_ha,
    MIN(detection_date) as first_case,
    MAX(detection_date) as last_case
FROM mat_rung
WHERE detection_status IS NOT NULL
GROUP BY detection_status
ORDER BY COUNT(*) DESC;

-- Verification statistics by reason
CREATE OR REPLACE VIEW verification_stats_by_reason AS
SELECT
    verification_reason,
    COUNT(*) as total_cases,
    SUM(area) / 10000.0 as total_area_ha,
    AVG(area) / 10000.0 as avg_area_ha,
    MIN(detection_date) as first_case,
    MAX(detection_date) as last_case
FROM mat_rung
WHERE detection_status = 'Đã xác minh'
    AND verification_reason IS NOT NULL
GROUP BY verification_reason
ORDER BY COUNT(*) DESC;

-- ========================================
-- Comments
-- ========================================
COMMENT ON TABLE mat_rung IS 'Deforestation detection data with spatial geometries';
COMMENT ON COLUMN mat_rung.geom IS 'Main geometry in WGS84 (EPSG:4326)';
COMMENT ON COLUMN mat_rung.geom_simplified IS 'Simplified geometry for faster rendering';
COMMENT ON COLUMN mat_rung.detection_status IS 'Verification status: Chưa xác minh, Đã xác minh, Từ chối, Đang xử lý';
COMMENT ON COLUMN mat_rung.verified_by IS 'User ID from auth_db who verified this record';
