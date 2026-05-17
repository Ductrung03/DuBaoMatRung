--
-- PostgreSQL database dump
--

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ogr_system_tables; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ogr_system_tables;


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: event_trigger_function_for_metadata(); Type: FUNCTION; Schema: ogr_system_tables; Owner: -
--

CREATE FUNCTION ogr_system_tables.event_trigger_function_for_metadata() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    obj record;
BEGIN
  IF has_schema_privilege('ogr_system_tables', 'USAGE') THEN
   IF has_table_privilege('ogr_system_tables.metadata', 'DELETE') THEN
    FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
    LOOP
        IF obj.object_type = 'table' THEN
            DELETE FROM ogr_system_tables.metadata m WHERE m.schema_name = obj.schema_name AND m.table_name = obj.object_name;
        END IF;
    END LOOP;
   END IF;
  END IF;
END;
$$;


--
-- Name: get_all_churung(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_churung() RETURNS TABLE(churung text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.churung
    FROM tlaocai_tkk_3lr_cru t
    WHERE t.churung IS NOT NULL AND t.churung <> ''
    ORDER BY t.churung;
END;
$$;


--
-- Name: get_all_khoanh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_khoanh() RETURNS TABLE(khoanh text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.khoanh
    FROM tlaocai_tkk_3lr_cru t
    WHERE t.khoanh IS NOT NULL AND t.khoanh <> ''
    ORDER BY t.khoanh;
END;
$$;


--
-- Name: get_distinct_huyen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_distinct_huyen() RETURNS TABLE(huyen text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.huyen
    FROM tlaocai_tkk_3lr_cru t
    WHERE t.huyen IS NOT NULL AND t.huyen <> ''
    ORDER BY t.huyen;
END;
$$;


--
-- Name: get_district_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_district_codes() RETURNS TABLE(district_id character varying, district_name text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        mahuyen::VARCHAR AS district_id,
        huyen AS district_name
    FROM tlaocai_tkk_3lr_cru
    WHERE mahuyen IS NOT NULL
    ORDER BY mahuyen;
END;
$$;


--
-- Name: get_tk_by_xa(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tk_by_xa(p_xa text) RETURNS TABLE(tk text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.tk
    FROM tlaocai_tkk_3lr_cru t
    WHERE TRIM(t.xa) ILIKE '%' || TRIM(p_xa) || '%'
    ORDER BY t.tk;
END;
$$;


--
-- Name: get_xa_by_huyen(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_xa_by_huyen(p_huyen text) RETURNS TABLE(xa text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.xa
    FROM tlaocai_tkk_3lr_cru t
    WHERE TRIM(t.huyen) = TRIM(p_huyen)
        AND t.xa IS NOT NULL AND t.xa <> ''
    ORDER BY t.xa;
END;
$$;


--
-- Name: optimized_spatial_intersect(date, date, text, text, text, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.optimized_spatial_intersect(p_from_date date, p_to_date date, p_huyen text DEFAULT NULL::text, p_xa text DEFAULT NULL::text, p_tk text DEFAULT NULL::text, p_khoanh text DEFAULT NULL::text, p_churung text DEFAULT NULL::text, p_limit integer DEFAULT 500, p_offset integer DEFAULT 0) RETURNS TABLE(gid integer, start_dau character varying, end_sau character varying, area double precision, mahuyen character varying, huyen character varying, xa character varying, tk character varying, khoanh character varying, churung character varying, geometry text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Note: This function needs to query gis_db.mat_rung
    -- Use dblink or call from application layer
    RAISE NOTICE 'This function should be called from application layer with cross-database join';
    RETURN;
END;
$$;


--
-- Name: refresh_dropdown_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_dropdown_cache() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_huyen;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_khoanh;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_churung;

    RAISE NOTICE 'Dropdown cache refreshed at %', NOW();
END;
$$;


--
-- Name: wgs84_to_vn2000_laocai(double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wgs84_to_vn2000_laocai(longitude double precision, latitude double precision) RETURNS TABLE(x double precision, y double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), 3405)),
        ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), 3405));
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: metadata; Type: TABLE; Schema: ogr_system_tables; Owner: -
--

CREATE TABLE ogr_system_tables.metadata (
    id integer NOT NULL,
    schema_name text NOT NULL,
    table_name text NOT NULL,
    metadata text
);


--
-- Name: metadata_id_seq; Type: SEQUENCE; Schema: ogr_system_tables; Owner: -
--

CREATE SEQUENCE ogr_system_tables.metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: ogr_system_tables; Owner: -
--

ALTER SEQUENCE ogr_system_tables.metadata_id_seq OWNED BY ogr_system_tables.metadata.id;


--
-- Name: chuc_nang_rung; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chuc_nang_rung (
    id integer NOT NULL,
    ma_chuc_nang character varying(10) NOT NULL,
    ten_chuc_nang character varying(100) NOT NULL,
    mo_ta text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chuc_nang_rung_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chuc_nang_rung_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chuc_nang_rung_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chuc_nang_rung_id_seq OWNED BY public.chuc_nang_rung.id;


--
-- Name: sonla_hientrangrung; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonla_hientrangrung (
    gid integer NOT NULL,
    geom public.geometry(MultiPolygon,4326),
    tt numeric(8,0),
    id numeric(10,0),
    matinh numeric(10,0),
    maxa numeric(10,0),
    xa character varying(24),
    tk character varying(10),
    khoanh character varying(5),
    lo_rs character varying(5),
    thuad numeric(8,0),
    tobando character varying(8),
    ddanh character varying(28),
    dtich numeric(8,2),
    nggocr numeric(10,0),
    maldlr_23 numeric(10,0),
    ldlr_23 character varying(8),
    sldlr character varying(17),
    namtr numeric(10,0),
    captuoi numeric(10,0),
    ktan numeric(10,0),
    nggocrt numeric(10,0),
    thanhrung numeric(10,0),
    mgo numeric(7,2),
    mtn numeric(7,2),
    mgolo numeric(7,2),
    mtnlo numeric(7,2),
    lapdia character varying(8),
    malr3_qd32 numeric(10,0),
    malr3_qd_1 numeric(10,0),
    mdsd character varying(20),
    mamdsd numeric(10,0),
    dtuong numeric(10,0),
    churung_mo character varying(50),
    machur numeric(5,0),
    trchap numeric(10,0),
    quyensd numeric(10,0),
    thoihansd numeric(10,0),
    khoan numeric(10,0),
    ngh character varying(50),
    nguoink character varying(29),
    nguoitrch character varying(26),
    mangnk numeric(10,0),
    mangtrch numeric(10,0),
    ngsinh numeric(10,0),
    kd numeric(23,15),
    vd numeric(23,15),
    capkd numeric(23,15),
    capvd numeric(23,15),
    locu character varying(6),
    vitrithua numeric(23,15),
    tinh character varying(30),
    dodoc numeric(10,0),
    docao numeric(10,0),
    doday numeric(10,0),
    tpcg numeric(10,0),
    maluongmua numeric(10,0),
    ten_da character varying(250)
);


--
-- Name: mv_churung; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_churung AS
 SELECT DISTINCT churung_mo AS churung
   FROM public.sonla_hientrangrung
  WHERE (churung_mo IS NOT NULL)
  ORDER BY churung_mo
  WITH NO DATA;


--
-- Name: sonla_hientrangrung_new; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonla_hientrangrung_new (
    gid integer NOT NULL,
    tt integer,
    id double precision,
    matinh double precision,
    maxa double precision,
    xa character varying(24),
    tk character varying(10),
    khoanh character varying(5),
    lo_rs character varying(5),
    thuad integer,
    tobando character varying(8),
    ddanh character varying(28),
    dtich double precision,
    nggocr double precision,
    maldlr_23 double precision,
    ldlr_23 character varying(8),
    sldlr character varying(17),
    namtr double precision,
    captuoi double precision,
    ktan double precision,
    nggocrt double precision,
    thanhrung double precision,
    mgo double precision,
    mtn double precision,
    mgolo double precision,
    mtnlo double precision,
    lapdia character varying(8),
    malr3_qd32 double precision,
    malr3_qd_1 double precision,
    mdsd character varying(20),
    mamdsd double precision,
    dtuong double precision,
    churung_mo character varying(50),
    machur integer,
    trchap double precision,
    quyensd double precision,
    thoihansd double precision,
    khoan double precision,
    ngh character varying(50),
    nguoink character varying(29),
    nguoitrch character varying(26),
    mangnk double precision,
    mangtrch double precision,
    ngsinh double precision,
    kd numeric,
    vd numeric,
    capkd numeric,
    capvd numeric,
    locu character varying(6),
    vitrithua numeric,
    tinh character varying(30),
    dodoc double precision,
    docao double precision,
    doday double precision,
    tpcg double precision,
    maluongmua double precision,
    ten_da character varying(250),
    geom public.geometry(MultiPolygon,4326)
);


--
-- Name: mv_forest_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_forest_stats AS
 SELECT count(*) AS polygon_count,
    public.st_extent(geom) AS bbox,
    sum(public.st_area((geom)::public.geography)) AS total_area_m2,
    now() AS created_at,
    now() AS updated_at
   FROM public.sonla_hientrangrung_new
  WHERE (geom IS NOT NULL)
  WITH NO DATA;


--
-- Name: sonla_rgx; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonla_rgx (
    gid integer NOT NULL,
    maxa numeric(6,0),
    xa character varying(254),
    geom public.geometry(MultiPolygon,4326)
);


--
-- Name: mv_huyen; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_huyen AS
 SELECT DISTINCT
        CASE
            WHEN (((maxa)::text ~~ '364%'::text) OR ((maxa)::text ~~ '366%'::text) OR ((maxa)::text ~~ '367%'::text)) THEN 'Thành phố Sơn La'::text
            WHEN (((maxa)::text ~~ '368%'::text) OR ((maxa)::text ~~ '369%'::text) OR ((maxa)::text ~~ '370%'::text) OR ((maxa)::text ~~ '371%'::text)) THEN 'Quỳnh Nhai'::text
            WHEN (((maxa)::text ~~ '372%'::text) OR ((maxa)::text ~~ '373%'::text) OR ((maxa)::text ~~ '374%'::text) OR ((maxa)::text ~~ '375%'::text) OR ((maxa)::text ~~ '376%'::text) OR ((maxa)::text ~~ '377%'::text) OR ((maxa)::text ~~ '378%'::text)) THEN 'Thuận Châu'::text
            WHEN (((maxa)::text ~~ '379%'::text) OR ((maxa)::text ~~ '380%'::text) OR ((maxa)::text ~~ '381%'::text) OR ((maxa)::text ~~ '382%'::text)) THEN 'Mường La'::text
            WHEN (((maxa)::text ~~ '383%'::text) OR ((maxa)::text ~~ '384%'::text) OR ((maxa)::text ~~ '385%'::text) OR ((maxa)::text ~~ '386%'::text)) THEN 'Bắc Yên'::text
            WHEN (((maxa)::text ~~ '387%'::text) OR ((maxa)::text ~~ '388%'::text) OR ((maxa)::text ~~ '389%'::text) OR ((maxa)::text ~~ '390%'::text) OR ((maxa)::text ~~ '391%'::text)) THEN 'Phù Yên'::text
            WHEN (((maxa)::text ~~ '392%'::text) OR ((maxa)::text ~~ '393%'::text) OR ((maxa)::text ~~ '394%'::text) OR ((maxa)::text ~~ '395%'::text) OR ((maxa)::text ~~ '396%'::text)) THEN 'Mộc Châu'::text
            WHEN (((maxa)::text ~~ '397%'::text) OR ((maxa)::text ~~ '398%'::text) OR ((maxa)::text ~~ '399%'::text) OR ((maxa)::text ~~ '400%'::text)) THEN 'Yên Châu'::text
            WHEN (((maxa)::text ~~ '401%'::text) OR ((maxa)::text ~~ '402%'::text) OR ((maxa)::text ~~ '403%'::text) OR ((maxa)::text ~~ '404%'::text)) THEN 'Mai Sơn'::text
            WHEN (((maxa)::text ~~ '405%'::text) OR ((maxa)::text ~~ '406%'::text) OR ((maxa)::text ~~ '407%'::text) OR ((maxa)::text ~~ '408%'::text) OR ((maxa)::text ~~ '409%'::text) OR ((maxa)::text ~~ '410%'::text)) THEN 'Sông Mã'::text
            WHEN (((maxa)::text ~~ '411%'::text) OR ((maxa)::text ~~ '412%'::text) OR ((maxa)::text ~~ '413%'::text)) THEN 'Sốp Cộp'::text
            WHEN (((maxa)::text ~~ '414%'::text) OR ((maxa)::text ~~ '415%'::text) OR ((maxa)::text ~~ '416%'::text) OR ((maxa)::text ~~ '417%'::text) OR ((maxa)::text ~~ '418%'::text) OR ((maxa)::text ~~ '419%'::text) OR ((maxa)::text ~~ '420%'::text) OR ((maxa)::text ~~ '421%'::text) OR ((maxa)::text ~~ '422%'::text) OR ((maxa)::text ~~ '423%'::text) OR ((maxa)::text ~~ '424%'::text)) THEN 'Vân Hồ'::text
            ELSE 'Khác'::text
        END AS huyen
   FROM public.sonla_rgx
  WHERE (maxa IS NOT NULL)
  ORDER BY
        CASE
            WHEN (((maxa)::text ~~ '364%'::text) OR ((maxa)::text ~~ '366%'::text) OR ((maxa)::text ~~ '367%'::text)) THEN 'Thành phố Sơn La'::text
            WHEN (((maxa)::text ~~ '368%'::text) OR ((maxa)::text ~~ '369%'::text) OR ((maxa)::text ~~ '370%'::text) OR ((maxa)::text ~~ '371%'::text)) THEN 'Quỳnh Nhai'::text
            WHEN (((maxa)::text ~~ '372%'::text) OR ((maxa)::text ~~ '373%'::text) OR ((maxa)::text ~~ '374%'::text) OR ((maxa)::text ~~ '375%'::text) OR ((maxa)::text ~~ '376%'::text) OR ((maxa)::text ~~ '377%'::text) OR ((maxa)::text ~~ '378%'::text)) THEN 'Thuận Châu'::text
            WHEN (((maxa)::text ~~ '379%'::text) OR ((maxa)::text ~~ '380%'::text) OR ((maxa)::text ~~ '381%'::text) OR ((maxa)::text ~~ '382%'::text)) THEN 'Mường La'::text
            WHEN (((maxa)::text ~~ '383%'::text) OR ((maxa)::text ~~ '384%'::text) OR ((maxa)::text ~~ '385%'::text) OR ((maxa)::text ~~ '386%'::text)) THEN 'Bắc Yên'::text
            WHEN (((maxa)::text ~~ '387%'::text) OR ((maxa)::text ~~ '388%'::text) OR ((maxa)::text ~~ '389%'::text) OR ((maxa)::text ~~ '390%'::text) OR ((maxa)::text ~~ '391%'::text)) THEN 'Phù Yên'::text
            WHEN (((maxa)::text ~~ '392%'::text) OR ((maxa)::text ~~ '393%'::text) OR ((maxa)::text ~~ '394%'::text) OR ((maxa)::text ~~ '395%'::text) OR ((maxa)::text ~~ '396%'::text)) THEN 'Mộc Châu'::text
            WHEN (((maxa)::text ~~ '397%'::text) OR ((maxa)::text ~~ '398%'::text) OR ((maxa)::text ~~ '399%'::text) OR ((maxa)::text ~~ '400%'::text)) THEN 'Yên Châu'::text
            WHEN (((maxa)::text ~~ '401%'::text) OR ((maxa)::text ~~ '402%'::text) OR ((maxa)::text ~~ '403%'::text) OR ((maxa)::text ~~ '404%'::text)) THEN 'Mai Sơn'::text
            WHEN (((maxa)::text ~~ '405%'::text) OR ((maxa)::text ~~ '406%'::text) OR ((maxa)::text ~~ '407%'::text) OR ((maxa)::text ~~ '408%'::text) OR ((maxa)::text ~~ '409%'::text) OR ((maxa)::text ~~ '410%'::text)) THEN 'Sông Mã'::text
            WHEN (((maxa)::text ~~ '411%'::text) OR ((maxa)::text ~~ '412%'::text) OR ((maxa)::text ~~ '413%'::text)) THEN 'Sốp Cộp'::text
            WHEN (((maxa)::text ~~ '414%'::text) OR ((maxa)::text ~~ '415%'::text) OR ((maxa)::text ~~ '416%'::text) OR ((maxa)::text ~~ '417%'::text) OR ((maxa)::text ~~ '418%'::text) OR ((maxa)::text ~~ '419%'::text) OR ((maxa)::text ~~ '420%'::text) OR ((maxa)::text ~~ '421%'::text) OR ((maxa)::text ~~ '422%'::text) OR ((maxa)::text ~~ '423%'::text) OR ((maxa)::text ~~ '424%'::text)) THEN 'Vân Hồ'::text
            ELSE 'Khác'::text
        END
  WITH NO DATA;


--
-- Name: sonla_tkkl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonla_tkkl (
    gid integer NOT NULL,
    geom public.geometry(MultiPolygon,4326),
    maxa numeric(6,0),
    xa character varying(254),
    tieukhu character varying(10),
    khoanh character varying(10),
    dt numeric(9,2)
);


--
-- Name: mv_khoanh_by_tieukhu; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_khoanh_by_tieukhu AS
 SELECT DISTINCT khoanh
   FROM public.sonla_tkkl
  WHERE (khoanh IS NOT NULL)
  ORDER BY khoanh
  WITH NO DATA;


--
-- Name: mv_tieukhu_by_xa; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_tieukhu_by_xa AS
 SELECT DISTINCT
        CASE
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1401'::text) THEN 'Thành phố Sơn La'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1402'::text) THEN 'Quỳnh Nhai'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1403'::text) THEN 'Thuận Châu'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1404'::text) THEN 'Mường La'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1405'::text) THEN 'Bắc Yên'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1406'::text) THEN 'Phù Yên'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1407'::text) THEN 'Mộc Châu'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1408'::text) THEN 'Yên Châu'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1409'::text) THEN 'Mai Sơn'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1410'::text) THEN 'Sông Mã'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1411'::text) THEN 'Sốp Cộp'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1412'::text) THEN 'Vân Hồ'::text
            ELSE 'Khác'::text
        END AS huyen,
    xa,
    tieukhu
   FROM public.sonla_tkkl t
  WHERE ((maxa IS NOT NULL) AND (xa IS NOT NULL) AND (tieukhu IS NOT NULL))
  ORDER BY
        CASE
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1401'::text) THEN 'Thành phố Sơn La'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1402'::text) THEN 'Quỳnh Nhai'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1403'::text) THEN 'Thuận Châu'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1404'::text) THEN 'Mường La'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1405'::text) THEN 'Bắc Yên'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1406'::text) THEN 'Phù Yên'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1407'::text) THEN 'Mộc Châu'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1408'::text) THEN 'Yên Châu'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1409'::text) THEN 'Mai Sơn'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1410'::text) THEN 'Sông Mã'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1411'::text) THEN 'Sốp Cộp'::text
            WHEN (SUBSTRING((maxa)::text FROM 1 FOR 4) = '1412'::text) THEN 'Vân Hồ'::text
            ELSE 'Khác'::text
        END, xa, tieukhu
  WITH NO DATA;


--
-- Name: mv_xa_by_huyen; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_xa_by_huyen AS
 SELECT DISTINCT
        CASE
            WHEN (((maxa)::text ~~ '364%'::text) OR ((maxa)::text ~~ '366%'::text) OR ((maxa)::text ~~ '367%'::text)) THEN 'Thành phố Sơn La'::text
            WHEN (((maxa)::text ~~ '368%'::text) OR ((maxa)::text ~~ '369%'::text) OR ((maxa)::text ~~ '370%'::text) OR ((maxa)::text ~~ '371%'::text)) THEN 'Quỳnh Nhai'::text
            WHEN (((maxa)::text ~~ '372%'::text) OR ((maxa)::text ~~ '373%'::text) OR ((maxa)::text ~~ '374%'::text) OR ((maxa)::text ~~ '375%'::text) OR ((maxa)::text ~~ '376%'::text) OR ((maxa)::text ~~ '377%'::text) OR ((maxa)::text ~~ '378%'::text)) THEN 'Thuận Châu'::text
            WHEN (((maxa)::text ~~ '379%'::text) OR ((maxa)::text ~~ '380%'::text) OR ((maxa)::text ~~ '381%'::text) OR ((maxa)::text ~~ '382%'::text)) THEN 'Mường La'::text
            WHEN (((maxa)::text ~~ '383%'::text) OR ((maxa)::text ~~ '384%'::text) OR ((maxa)::text ~~ '385%'::text) OR ((maxa)::text ~~ '386%'::text)) THEN 'Bắc Yên'::text
            WHEN (((maxa)::text ~~ '387%'::text) OR ((maxa)::text ~~ '388%'::text) OR ((maxa)::text ~~ '389%'::text) OR ((maxa)::text ~~ '390%'::text) OR ((maxa)::text ~~ '391%'::text)) THEN 'Phù Yên'::text
            WHEN (((maxa)::text ~~ '392%'::text) OR ((maxa)::text ~~ '393%'::text) OR ((maxa)::text ~~ '394%'::text) OR ((maxa)::text ~~ '395%'::text) OR ((maxa)::text ~~ '396%'::text)) THEN 'Mộc Châu'::text
            WHEN (((maxa)::text ~~ '397%'::text) OR ((maxa)::text ~~ '398%'::text) OR ((maxa)::text ~~ '399%'::text) OR ((maxa)::text ~~ '400%'::text)) THEN 'Yên Châu'::text
            WHEN (((maxa)::text ~~ '401%'::text) OR ((maxa)::text ~~ '402%'::text) OR ((maxa)::text ~~ '403%'::text) OR ((maxa)::text ~~ '404%'::text)) THEN 'Mai Sơn'::text
            WHEN (((maxa)::text ~~ '405%'::text) OR ((maxa)::text ~~ '406%'::text) OR ((maxa)::text ~~ '407%'::text) OR ((maxa)::text ~~ '408%'::text) OR ((maxa)::text ~~ '409%'::text) OR ((maxa)::text ~~ '410%'::text)) THEN 'Sông Mã'::text
            WHEN (((maxa)::text ~~ '411%'::text) OR ((maxa)::text ~~ '412%'::text) OR ((maxa)::text ~~ '413%'::text)) THEN 'Sốp Cộp'::text
            WHEN (((maxa)::text ~~ '414%'::text) OR ((maxa)::text ~~ '415%'::text) OR ((maxa)::text ~~ '416%'::text) OR ((maxa)::text ~~ '417%'::text) OR ((maxa)::text ~~ '418%'::text) OR ((maxa)::text ~~ '419%'::text) OR ((maxa)::text ~~ '420%'::text) OR ((maxa)::text ~~ '421%'::text) OR ((maxa)::text ~~ '422%'::text) OR ((maxa)::text ~~ '423%'::text) OR ((maxa)::text ~~ '424%'::text)) THEN 'Vân Hồ'::text
            ELSE 'Khác'::text
        END AS huyen,
    xa
   FROM public.sonla_rgx
  WHERE ((maxa IS NOT NULL) AND (xa IS NOT NULL))
  ORDER BY
        CASE
            WHEN (((maxa)::text ~~ '364%'::text) OR ((maxa)::text ~~ '366%'::text) OR ((maxa)::text ~~ '367%'::text)) THEN 'Thành phố Sơn La'::text
            WHEN (((maxa)::text ~~ '368%'::text) OR ((maxa)::text ~~ '369%'::text) OR ((maxa)::text ~~ '370%'::text) OR ((maxa)::text ~~ '371%'::text)) THEN 'Quỳnh Nhai'::text
            WHEN (((maxa)::text ~~ '372%'::text) OR ((maxa)::text ~~ '373%'::text) OR ((maxa)::text ~~ '374%'::text) OR ((maxa)::text ~~ '375%'::text) OR ((maxa)::text ~~ '376%'::text) OR ((maxa)::text ~~ '377%'::text) OR ((maxa)::text ~~ '378%'::text)) THEN 'Thuận Châu'::text
            WHEN (((maxa)::text ~~ '379%'::text) OR ((maxa)::text ~~ '380%'::text) OR ((maxa)::text ~~ '381%'::text) OR ((maxa)::text ~~ '382%'::text)) THEN 'Mường La'::text
            WHEN (((maxa)::text ~~ '383%'::text) OR ((maxa)::text ~~ '384%'::text) OR ((maxa)::text ~~ '385%'::text) OR ((maxa)::text ~~ '386%'::text)) THEN 'Bắc Yên'::text
            WHEN (((maxa)::text ~~ '387%'::text) OR ((maxa)::text ~~ '388%'::text) OR ((maxa)::text ~~ '389%'::text) OR ((maxa)::text ~~ '390%'::text) OR ((maxa)::text ~~ '391%'::text)) THEN 'Phù Yên'::text
            WHEN (((maxa)::text ~~ '392%'::text) OR ((maxa)::text ~~ '393%'::text) OR ((maxa)::text ~~ '394%'::text) OR ((maxa)::text ~~ '395%'::text) OR ((maxa)::text ~~ '396%'::text)) THEN 'Mộc Châu'::text
            WHEN (((maxa)::text ~~ '397%'::text) OR ((maxa)::text ~~ '398%'::text) OR ((maxa)::text ~~ '399%'::text) OR ((maxa)::text ~~ '400%'::text)) THEN 'Yên Châu'::text
            WHEN (((maxa)::text ~~ '401%'::text) OR ((maxa)::text ~~ '402%'::text) OR ((maxa)::text ~~ '403%'::text) OR ((maxa)::text ~~ '404%'::text)) THEN 'Mai Sơn'::text
            WHEN (((maxa)::text ~~ '405%'::text) OR ((maxa)::text ~~ '406%'::text) OR ((maxa)::text ~~ '407%'::text) OR ((maxa)::text ~~ '408%'::text) OR ((maxa)::text ~~ '409%'::text) OR ((maxa)::text ~~ '410%'::text)) THEN 'Sông Mã'::text
            WHEN (((maxa)::text ~~ '411%'::text) OR ((maxa)::text ~~ '412%'::text) OR ((maxa)::text ~~ '413%'::text)) THEN 'Sốp Cộp'::text
            WHEN (((maxa)::text ~~ '414%'::text) OR ((maxa)::text ~~ '415%'::text) OR ((maxa)::text ~~ '416%'::text) OR ((maxa)::text ~~ '417%'::text) OR ((maxa)::text ~~ '418%'::text) OR ((maxa)::text ~~ '419%'::text) OR ((maxa)::text ~~ '420%'::text) OR ((maxa)::text ~~ '421%'::text) OR ((maxa)::text ~~ '422%'::text) OR ((maxa)::text ~~ '423%'::text) OR ((maxa)::text ~~ '424%'::text)) THEN 'Vân Hồ'::text
            ELSE 'Khác'::text
        END, xa
  WITH NO DATA;


--
-- Name: nguyen_nhan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nguyen_nhan (
    id integer NOT NULL,
    ma_nguyen_nhan character varying(10) NOT NULL,
    ten_nguyen_nhan character varying(100) NOT NULL,
    mo_ta text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: nguyen_nhan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nguyen_nhan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nguyen_nhan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nguyen_nhan_id_seq OWNED BY public.nguyen_nhan.id;


--
-- Name: sonla_hientrangrung_backup_20260126; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonla_hientrangrung_backup_20260126 (
    gid integer,
    geom public.geometry(MultiPolygon,4326),
    tt numeric(8,0),
    id numeric(10,0),
    matinh numeric(10,0),
    maxa numeric(10,0),
    xa character varying(24),
    tk character varying(10),
    khoanh character varying(5),
    lo_rs character varying(5),
    thuad numeric(8,0),
    tobando character varying(8),
    ddanh character varying(28),
    dtich numeric(8,2),
    nggocr numeric(10,0),
    maldlr_23 numeric(10,0),
    ldlr_23 character varying(8),
    sldlr character varying(17),
    namtr numeric(10,0),
    captuoi numeric(10,0),
    ktan numeric(10,0),
    nggocrt numeric(10,0),
    thanhrung numeric(10,0),
    mgo numeric(7,2),
    mtn numeric(7,2),
    mgolo numeric(7,2),
    mtnlo numeric(7,2),
    lapdia character varying(8),
    malr3_qd32 numeric(10,0),
    malr3_qd_1 numeric(10,0),
    mdsd character varying(20),
    mamdsd numeric(10,0),
    dtuong numeric(10,0),
    churung_mo character varying(50),
    machur numeric(5,0),
    trchap numeric(10,0),
    quyensd numeric(10,0),
    thoihansd numeric(10,0),
    khoan numeric(10,0),
    ngh character varying(50),
    nguoink character varying(29),
    nguoitrch character varying(26),
    mangnk numeric(10,0),
    mangtrch numeric(10,0),
    ngsinh numeric(10,0),
    kd numeric(23,15),
    vd numeric(23,15),
    capkd numeric(23,15),
    capvd numeric(23,15),
    locu character varying(6),
    vitrithua numeric(23,15),
    tinh character varying(30),
    dodoc numeric(10,0),
    docao numeric(10,0),
    doday numeric(10,0),
    tpcg numeric(10,0),
    maluongmua numeric(10,0),
    ten_da character varying(250)
);


--
-- Name: sonla_hientrangrung_gid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sonla_hientrangrung_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sonla_hientrangrung_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sonla_hientrangrung_gid_seq OWNED BY public.sonla_hientrangrung.gid;


--
-- Name: sonla_hientrangrung_new_gid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sonla_hientrangrung_new_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sonla_hientrangrung_new_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sonla_hientrangrung_new_gid_seq OWNED BY public.sonla_hientrangrung_new.gid;


--
-- Name: sonla_rgx_backup_20260126; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonla_rgx_backup_20260126 (
    gid integer,
    maxa numeric(6,0),
    xa character varying(254),
    geom public.geometry(MultiPolygon,4326)
);


--
-- Name: sonla_rgx_gid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sonla_rgx_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sonla_rgx_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sonla_rgx_gid_seq OWNED BY public.sonla_rgx.gid;


--
-- Name: sonla_tkkl_backup_20260126; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonla_tkkl_backup_20260126 (
    gid integer,
    geom public.geometry(MultiPolygon,4326),
    maxa numeric(6,0),
    xa character varying(254),
    tieukhu character varying(10),
    khoanh character varying(10),
    dt numeric(9,2)
);


--
-- Name: sonla_tkkl_gid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sonla_tkkl_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sonla_tkkl_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sonla_tkkl_gid_seq OWNED BY public.sonla_tkkl.gid;


--
-- Name: trang_thai_xac_minh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trang_thai_xac_minh (
    id integer NOT NULL,
    ma_trang_thai character varying(20) NOT NULL,
    ten_trang_thai character varying(50) NOT NULL,
    mo_ta text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: trang_thai_xac_minh_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trang_thai_xac_minh_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trang_thai_xac_minh_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trang_thai_xac_minh_id_seq OWNED BY public.trang_thai_xac_minh.id;


--
-- Name: metadata id; Type: DEFAULT; Schema: ogr_system_tables; Owner: -
--

ALTER TABLE ONLY ogr_system_tables.metadata ALTER COLUMN id SET DEFAULT nextval('ogr_system_tables.metadata_id_seq'::regclass);


--
-- Name: chuc_nang_rung id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuc_nang_rung ALTER COLUMN id SET DEFAULT nextval('public.chuc_nang_rung_id_seq'::regclass);


--
-- Name: nguyen_nhan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguyen_nhan ALTER COLUMN id SET DEFAULT nextval('public.nguyen_nhan_id_seq'::regclass);


--
-- Name: sonla_hientrangrung gid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_hientrangrung ALTER COLUMN gid SET DEFAULT nextval('public.sonla_hientrangrung_gid_seq'::regclass);


--
-- Name: sonla_hientrangrung_new gid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_hientrangrung_new ALTER COLUMN gid SET DEFAULT nextval('public.sonla_hientrangrung_new_gid_seq'::regclass);


--
-- Name: sonla_rgx gid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_rgx ALTER COLUMN gid SET DEFAULT nextval('public.sonla_rgx_gid_seq'::regclass);


--
-- Name: sonla_tkkl gid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_tkkl ALTER COLUMN gid SET DEFAULT nextval('public.sonla_tkkl_gid_seq'::regclass);


--
-- Name: trang_thai_xac_minh id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trang_thai_xac_minh ALTER COLUMN id SET DEFAULT nextval('public.trang_thai_xac_minh_id_seq'::regclass);


--
-- Name: metadata metadata_schema_name_table_name_key; Type: CONSTRAINT; Schema: ogr_system_tables; Owner: -
--

ALTER TABLE ONLY ogr_system_tables.metadata
    ADD CONSTRAINT metadata_schema_name_table_name_key UNIQUE (schema_name, table_name);


--
-- Name: chuc_nang_rung chuc_nang_rung_ma_chuc_nang_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuc_nang_rung
    ADD CONSTRAINT chuc_nang_rung_ma_chuc_nang_key UNIQUE (ma_chuc_nang);


--
-- Name: chuc_nang_rung chuc_nang_rung_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuc_nang_rung
    ADD CONSTRAINT chuc_nang_rung_pkey PRIMARY KEY (id);


--
-- Name: nguyen_nhan nguyen_nhan_ma_nguyen_nhan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguyen_nhan
    ADD CONSTRAINT nguyen_nhan_ma_nguyen_nhan_key UNIQUE (ma_nguyen_nhan);


--
-- Name: nguyen_nhan nguyen_nhan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguyen_nhan
    ADD CONSTRAINT nguyen_nhan_pkey PRIMARY KEY (id);


--
-- Name: sonla_hientrangrung_new sonla_hientrangrung_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_hientrangrung_new
    ADD CONSTRAINT sonla_hientrangrung_new_pkey PRIMARY KEY (gid);


--
-- Name: sonla_hientrangrung sonla_hientrangrung_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_hientrangrung
    ADD CONSTRAINT sonla_hientrangrung_pkey PRIMARY KEY (gid);


--
-- Name: sonla_rgx sonla_rgx_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_rgx
    ADD CONSTRAINT sonla_rgx_pkey PRIMARY KEY (gid);


--
-- Name: sonla_tkkl sonla_tkkl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonla_tkkl
    ADD CONSTRAINT sonla_tkkl_pkey PRIMARY KEY (gid);


--
-- Name: trang_thai_xac_minh trang_thai_xac_minh_ma_trang_thai_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trang_thai_xac_minh
    ADD CONSTRAINT trang_thai_xac_minh_ma_trang_thai_key UNIQUE (ma_trang_thai);


--
-- Name: trang_thai_xac_minh trang_thai_xac_minh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trang_thai_xac_minh
    ADD CONSTRAINT trang_thai_xac_minh_pkey PRIMARY KEY (id);


--
-- Name: idx_chuc_nang_rung_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chuc_nang_rung_ma ON public.chuc_nang_rung USING btree (ma_chuc_nang);


--
-- Name: idx_mv_churung; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_churung ON public.mv_churung USING btree (churung);


--
-- Name: idx_mv_khoanh_by_tieukhu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_khoanh_by_tieukhu ON public.mv_khoanh_by_tieukhu USING btree (khoanh);


--
-- Name: idx_mv_tieukhu_by_xa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_tieukhu_by_xa ON public.mv_tieukhu_by_xa USING btree (huyen, xa, tieukhu);


--
-- Name: idx_mv_tieukhu_by_xa_huyen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_tieukhu_by_xa_huyen ON public.mv_tieukhu_by_xa USING btree (huyen);


--
-- Name: idx_mv_tieukhu_by_xa_xa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_tieukhu_by_xa_xa ON public.mv_tieukhu_by_xa USING btree (xa);


--
-- Name: idx_nguyen_nhan_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nguyen_nhan_ma ON public.nguyen_nhan USING btree (ma_nguyen_nhan);


--
-- Name: idx_sonla_hientrangrung_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_geom ON public.sonla_hientrangrung USING gist (geom);


--
-- Name: idx_sonla_hientrangrung_ldlr23; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_ldlr23 ON public.sonla_hientrangrung USING btree (ldlr_23);


--
-- Name: idx_sonla_hientrangrung_new_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_new_geom ON public.sonla_hientrangrung_new USING gist (geom) WITH (fillfactor='90');


--
-- Name: idx_sonla_hientrangrung_new_khoanh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_new_khoanh ON public.sonla_hientrangrung_new USING btree (khoanh) WHERE (khoanh IS NOT NULL);


--
-- Name: idx_sonla_hientrangrung_new_ldlr23; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_new_ldlr23 ON public.sonla_hientrangrung_new USING btree (ldlr_23) WHERE (ldlr_23 IS NOT NULL);


--
-- Name: idx_sonla_hientrangrung_new_tk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_new_tk ON public.sonla_hientrangrung_new USING btree (tk) WHERE (tk IS NOT NULL);


--
-- Name: idx_sonla_hientrangrung_new_xa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_new_xa ON public.sonla_hientrangrung_new USING btree (xa) WHERE (xa IS NOT NULL);


--
-- Name: idx_sonla_hientrangrung_tk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_tk ON public.sonla_hientrangrung USING btree (tk);


--
-- Name: idx_sonla_hientrangrung_xa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_hientrangrung_xa ON public.sonla_hientrangrung USING btree (xa);


--
-- Name: idx_sonla_rgx_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_rgx_geom ON public.sonla_rgx USING gist (geom);


--
-- Name: idx_sonla_rgx_maxa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_rgx_maxa ON public.sonla_rgx USING btree (maxa);


--
-- Name: idx_sonla_rgx_xa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_rgx_xa ON public.sonla_rgx USING btree (xa);


--
-- Name: idx_sonla_tkkl_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_tkkl_geom ON public.sonla_tkkl USING gist (geom);


--
-- Name: idx_sonla_tkkl_maxa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_tkkl_maxa ON public.sonla_tkkl USING btree (maxa);


--
-- Name: idx_sonla_tkkl_tieukhu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonla_tkkl_tieukhu ON public.sonla_tkkl USING btree (tieukhu);


--
-- Name: idx_trang_thai_xac_minh_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trang_thai_xac_minh_ma ON public.trang_thai_xac_minh USING btree (ma_trang_thai);


--
-- Name: sonla_hientrangrung_geom_geom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sonla_hientrangrung_geom_geom_idx ON public.sonla_hientrangrung USING gist (geom);


--
-- Name: sonla_rgx_geom_geom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sonla_rgx_geom_geom_idx ON public.sonla_rgx USING gist (geom);


--
-- Name: sonla_tkkl_geom_geom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sonla_tkkl_geom_geom_idx ON public.sonla_tkkl USING gist (geom);


--
-- Name: ogr_system_tables_event_trigger_for_metadata; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER ogr_system_tables_event_trigger_for_metadata ON sql_drop
   EXECUTE FUNCTION ogr_system_tables.event_trigger_function_for_metadata();


--
-- PostgreSQL database dump complete
--

