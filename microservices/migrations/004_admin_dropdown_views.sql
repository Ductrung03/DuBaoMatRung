-- ========================================
-- Migration: Dropdown Materialized Views
-- Database: admin_db
-- Version: 1.0
-- Description: Create optimized materialized views for dropdown menus
-- ========================================

-- Function to refresh dropdown cache
CREATE OR REPLACE FUNCTION refresh_dropdown_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_huyen;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_xa;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_tieukhu;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_khoanh;

    RAISE NOTICE 'Dropdown cache refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get all districts
CREATE OR REPLACE FUNCTION get_all_districts()
RETURNS TABLE(district_id TEXT, district_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        huyen AS district_id,
        convertTcvn3ToUnicode(huyen) AS district_name
    FROM mv_dropdown_huyen
    ORDER BY huyen;
END;
$$ LANGUAGE plpgsql;

-- Function to get communes by district
CREATE OR REPLACE FUNCTION get_communes_by_district(p_district TEXT)
RETURNS TABLE(commune_id TEXT, commune_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        xa AS commune_id,
        convertTcvn3ToUnicode(xa) AS commune_name
    FROM mv_dropdown_xa
    WHERE huyen = p_district
    ORDER BY xa;
END;
$$ LANGUAGE plpgsql;

-- Function to get sub zones by district and commune
CREATE OR REPLACE FUNCTION get_sub_zones_by_area(p_district TEXT, p_commune TEXT)
RETURNS TABLE(sub_zone_id TEXT, sub_zone_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tieukhu AS sub_zone_id,
        convertTcvn3ToUnicode(tieukhu) AS sub_zone_name
    FROM mv_dropdown_tieukhu
    WHERE huyen = p_district AND xa = p_commune
    ORDER BY tieukhu;
END;
$$ LANGUAGE plpgsql;

-- Function to get plots by district, commune and sub zone
CREATE OR REPLACE FUNCTION get_plots_by_area(p_district TEXT, p_commune TEXT, p_sub_zone TEXT)
RETURNS TABLE(plot_id TEXT, plot_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        khoanh AS plot_id,
        convertTcvn3ToUnicode(khoanh) AS plot_name
    FROM mv_dropdown_khoanh
    WHERE huyen = p_district AND xa = p_commune AND tieukhu = p_sub_zone
    ORDER BY khoanh;
END;
$$ LANGUAGE plpgsql;
