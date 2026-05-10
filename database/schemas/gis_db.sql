--
-- PostgreSQL database dump
--

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: admin_fdw; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA admin_fdw;


--
-- Name: ogr_system_tables; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ogr_system_tables;


--
-- Name: dblink; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA public;


--
-- Name: EXTENSION dblink; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION dblink IS 'connect to other PostgreSQL databases from within a database';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgres_fdw; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgres_fdw WITH SCHEMA public;


--
-- Name: EXTENSION postgres_fdw; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgres_fdw IS 'foreign-data wrapper for remote PostgreSQL servers';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


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
-- Name: auto_clip_mat_rung_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_clip_mat_rung_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  forest_union geometry;
  clipped geometry;
  clipped_area_val double precision;
  has_intersection_val boolean;
  start_time timestamp;
  elapsed_ms integer;
  forest_count integer;
BEGIN
  start_time := clock_timestamp();

  -- Query intersecting forest polygons and union them on-the-fly
  -- This is FAST because it only unions polygons that intersect (using spatial index)
  BEGIN
    SELECT geom_union, polygon_count INTO forest_union, forest_count
    FROM dblink(
      'host=localhost port=5432 dbname=admin_db user=postgres password=YOUR_DB_PASSWORD',
      format(
        'SELECT ST_Union(geom) as geom_union, COUNT(*)::integer as polygon_count ' ||
        'FROM sonla_hientrangrung_new ' ||
        'WHERE geom && ST_GeomFromText(%L, 4326) ' ||
        'AND ST_Intersects(geom, ST_GeomFromText(%L, 4326))',
        ST_AsText(NEW.geom),
        ST_AsText(NEW.geom)
      )
    ) AS t(geom_union geometry, polygon_count integer);

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to query forest polygons via dblink: %', SQLERRM;
    RETURN NEW;
  END;

  -- If no intersecting forest polygons found
  IF forest_union IS NULL THEN
    RAISE DEBUG 'No intersecting forest polygons found for new record';
    NEW.clipped_geom := NULL;
    NEW.clipped_area := 0;
    NEW.has_intersection := false;
    NEW.last_clipped_at := NOW();
    RETURN NEW;
  END IF;

  RAISE DEBUG 'Found % intersecting forest polygons', forest_count;

  -- Clip geometry with forest union
  BEGIN
    clipped := ST_Intersection(NEW.geom, forest_union);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ST_Intersection failed: %', SQLERRM;
    RETURN NEW;
  END;

  -- Calculate results
  IF clipped IS NULL OR ST_IsEmpty(clipped) THEN
    has_intersection_val := false;
    clipped := NULL;
    clipped_area_val := 0;
  ELSE
    has_intersection_val := true;

    -- Ensure MultiPolygon type
    BEGIN
      IF ST_GeometryType(clipped) = 'ST_Polygon' THEN
        clipped := ST_Multi(clipped);
      ELSIF ST_GeometryType(clipped) = 'ST_GeometryCollection' THEN
        clipped := ST_Multi(ST_CollectionExtract(clipped, 3));
      ELSIF ST_GeometryType(clipped) NOT IN ('ST_MultiPolygon') THEN
        clipped := ST_Multi(ST_CollectionExtract(ST_MakeValid(clipped), 3));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Geometry type conversion failed: %', SQLERRM;
      clipped := NULL;
      has_intersection_val := false;
      clipped_area_val := 0;
    END;

    -- Calculate area in m²
    IF clipped IS NOT NULL THEN
      BEGIN
        clipped_area_val := ST_Area(ST_Transform(clipped, 32648)::geography);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to calculate area: %', SQLERRM;
        clipped_area_val := 0;
      END;
    ELSE
      clipped_area_val := 0;
    END IF;
  END IF;

  -- Update NEW record
  NEW.clipped_geom := clipped;
  NEW.clipped_area := clipped_area_val;
  NEW.has_intersection := has_intersection_val;
  NEW.last_clipped_at := NOW();

  -- Log performance
  elapsed_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - start_time))::integer;
  RAISE INFO 'Auto-clip: % ms, intersection: %, forest polygons: %, area: % m²',
    elapsed_ms, has_intersection_val, forest_count, ROUND(clipped_area_val::numeric, 2);

  RETURN NEW;
END;
$$;


--
-- Name: get_verification_basic_info(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_verification_basic_info(p_gid integer) RETURNS TABLE(gid integer, area double precision, verified_area double precision, detection_status character varying, verification_reason character varying, verification_notes text, detection_date date, verified_by integer)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: log_son_la_verification_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_son_la_verification_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Chỉ log khi status thay đổi
  IF OLD.detection_status IS DISTINCT FROM NEW.detection_status THEN
    INSERT INTO son_la_mat_rung_verification_log (
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
        WHEN NEW.detection_status = 'Đã xác minh' THEN 'VERIFY'
        WHEN NEW.detection_status = 'Từ chối' THEN 'REJECT'
        WHEN NEW.detection_status = 'Chưa xác minh' THEN 'RESET'
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
$$;


--
-- Name: log_verification_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_verification_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Chỉ log khi status thay đổi
  IF OLD.detection_status IS DISTINCT FROM NEW.detection_status THEN
    -- Insert vào verification log (nếu table tồn tại)
    -- Có thể mở rộng sau
    NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: refresh_admin_materialized_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_admin_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_huyen;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xa_by_huyen;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tieukhu_by_xa;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_khoanh_by_tieukhu;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_churung;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mat_rung_admin_lookup;
  
  RAISE NOTICE 'All administrative materialized views refreshed successfully';
END;
$$;


--
-- Name: refresh_mat_rung_with_admin_mv(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_mat_rung_with_admin_mv() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mat_rung_with_admin;
    RAISE NOTICE 'Materialized View đã được refresh thành công!';
END;
$$;


--
-- Name: search_surrounding_lots(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_surrounding_lots(p_gid integer, p_radius_meters integer DEFAULT 5000) RETURNS TABLE(gid integer, distance_meters double precision, area double precision, detection_status character varying, start_date character varying, end_date character varying)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_area_in_hectares(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_area_in_hectares() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.geom IS NOT NULL THEN
    -- Tính area tự động từ geometry (chuyển đổi sang hectares)
    NEW.area := ST_Area(ST_Transform(NEW.geom, 3857)) / 10000.0;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: admin_db_server; Type: SERVER; Schema: -; Owner: -
--

CREATE SERVER admin_db_server FOREIGN DATA WRAPPER postgres_fdw OPTIONS (
    dbname 'admin_db',
    host 'localhost',
    port '5433'
);


--
-- Name: USER MAPPING postgres SERVER admin_db_server; Type: USER MAPPING; Schema: -; Owner: -
--

CREATE USER MAPPING FOR postgres SERVER admin_db_server OPTIONS (
    password 'YOUR_DB_PASSWORD',
    "user" 'postgres'
);


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
-- Name: bang_ke_xu_ly_anh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bang_ke_xu_ly_anh (
    id integer NOT NULL,
    maxa text,
    ten_xa text,
    start_dau timestamp without time zone,
    end_dau timestamp without time zone,
    start_sau timestamp without time zone,
    end_sau timestamp without time zone,
    so_lan integer DEFAULT 1,
    ngay_xu_ly timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    ghi_chu text
);


--
-- Name: bang_ke_xu_ly_anh_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bang_ke_xu_ly_anh_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bang_ke_xu_ly_anh_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bang_ke_xu_ly_anh_id_seq OWNED BY public.bang_ke_xu_ly_anh.id;


--
-- Name: clip_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clip_progress (
    id integer DEFAULT 1 NOT NULL,
    total_records integer,
    clipped_records integer,
    progress_percent numeric(5,2),
    last_updated timestamp without time zone,
    CONSTRAINT single_row CHECK ((id = 1))
);


--
-- Name: son_la_mat_rung; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.son_la_mat_rung (
    gid integer NOT NULL,
    start_sau character varying(10),
    area double precision,
    start_dau character varying(10),
    end_sau character varying(10),
    mahuyen character varying(2),
    end_dau character varying(10),
    geom public.geometry(MultiPolygon,4326),
    geom_simplified public.geometry(MultiPolygon,4326),
    detection_status character varying(20) DEFAULT 'Chưa xác minh'::character varying,
    detection_date date,
    verified_by integer,
    verified_area double precision,
    verification_reason character varying(100),
    verification_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    clipped_geom public.geometry(MultiPolygon,4326),
    clipped_area double precision,
    has_intersection boolean,
    last_clipped_at timestamp without time zone,
    CONSTRAINT chk_son_la_detection_status CHECK (((detection_status)::text = ANY (ARRAY[('Chưa xác minh'::character varying)::text, ('Đã xác minh'::character varying)::text, ('Từ chối'::character varying)::text, ('Đang xử lý'::character varying)::text])))
);


--
-- Name: son_la_mat_rung_gid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.son_la_mat_rung_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: son_la_mat_rung_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.son_la_mat_rung_gid_seq OWNED BY public.son_la_mat_rung.gid;


--
-- Name: son_la_mat_rung_monthly_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.son_la_mat_rung_monthly_summary (
    month_year timestamp with time zone,
    mahuyen character varying(2),
    geom public.geometry,
    alert_count bigint,
    total_area double precision,
    avg_area double precision,
    status_list character varying[]
);


--
-- Name: son_la_mat_rung_verification_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.son_la_mat_rung_verification_log (
    id integer NOT NULL,
    gid integer NOT NULL,
    action character varying(50) NOT NULL,
    old_status character varying(50),
    new_status character varying(50),
    old_verified_area double precision,
    new_verified_area double precision,
    old_verification_reason character varying(100),
    new_verification_reason character varying(100),
    changed_by integer NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    client_ip inet,
    user_agent text,
    CONSTRAINT chk_son_la_action CHECK (((action)::text = ANY (ARRAY[('VERIFY'::character varying)::text, ('UPDATE_VERIFICATION'::character varying)::text, ('REJECT'::character varying)::text, ('RESET'::character varying)::text])))
);


--
-- Name: son_la_mat_rung_verification_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.son_la_mat_rung_verification_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: son_la_mat_rung_verification_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.son_la_mat_rung_verification_log_id_seq OWNED BY public.son_la_mat_rung_verification_log.id;


--
-- Name: metadata id; Type: DEFAULT; Schema: ogr_system_tables; Owner: -
--

ALTER TABLE ONLY ogr_system_tables.metadata ALTER COLUMN id SET DEFAULT nextval('ogr_system_tables.metadata_id_seq'::regclass);


--
-- Name: bang_ke_xu_ly_anh id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bang_ke_xu_ly_anh ALTER COLUMN id SET DEFAULT nextval('public.bang_ke_xu_ly_anh_id_seq'::regclass);


--
-- Name: son_la_mat_rung gid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.son_la_mat_rung ALTER COLUMN gid SET DEFAULT nextval('public.son_la_mat_rung_gid_seq'::regclass);


--
-- Name: son_la_mat_rung_verification_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.son_la_mat_rung_verification_log ALTER COLUMN id SET DEFAULT nextval('public.son_la_mat_rung_verification_log_id_seq'::regclass);


--
-- Name: bang_ke_xu_ly_anh bang_ke_xu_ly_anh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bang_ke_xu_ly_anh
    ADD CONSTRAINT bang_ke_xu_ly_anh_pkey PRIMARY KEY (id);


--
-- Name: clip_progress clip_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clip_progress
    ADD CONSTRAINT clip_progress_pkey PRIMARY KEY (id);


--
-- Name: idx_bkxla_maxa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bkxla_maxa ON public.bang_ke_xu_ly_anh USING btree (maxa);


--
-- Name: idx_son_la_mat_rung_clipped_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_son_la_mat_rung_clipped_geom ON public.son_la_mat_rung USING gist (clipped_geom) WHERE (clipped_geom IS NOT NULL);


--
-- Name: idx_son_la_mat_rung_intersection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_son_la_mat_rung_intersection ON public.son_la_mat_rung USING btree (has_intersection) WHERE (has_intersection IS NOT NULL);


--
-- Name: idx_son_la_mat_rung_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_son_la_mat_rung_recent ON public.son_la_mat_rung USING btree (created_at DESC, detection_status) WHERE (clipped_geom IS NOT NULL);


--
-- Name: idx_son_la_mat_rung_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_son_la_mat_rung_status ON public.son_la_mat_rung USING btree (detection_status) WHERE (detection_status IS NOT NULL);


--
-- Name: son_la_mat_rung trigger_auto_clip_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_clip_on_insert BEFORE INSERT ON public.son_la_mat_rung FOR EACH ROW EXECUTE FUNCTION public.auto_clip_mat_rung_on_insert();


--
-- PostgreSQL database dump complete
--

