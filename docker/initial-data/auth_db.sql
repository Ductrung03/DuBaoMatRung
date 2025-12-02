--
-- PostgreSQL database dump
--

\restrict T6LIzYIAndZYH6ceCDa4bHiFywGlz9yEgom4pRibs37G96oUne5QPAqukqBJe5K

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg110+1)
-- Dumped by pg_dump version 17.6

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

ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_user_id_fkey";
ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_role_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Role" DROP CONSTRAINT IF EXISTS "Role_created_by_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_role_id_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_permission_id_fkey";
ALTER TABLE IF EXISTS ONLY public."RoleDataScope" DROP CONSTRAINT IF EXISTS "RoleDataScope_role_id_fkey";
ALTER TABLE IF EXISTS ONLY public."RoleDataScope" DROP CONSTRAINT IF EXISTS "RoleDataScope_data_scope_id_fkey";
ALTER TABLE IF EXISTS ONLY public."Permission" DROP CONSTRAINT IF EXISTS "Permission_parent_id_fkey";
ALTER TABLE IF EXISTS ONLY public."DataScope" DROP CONSTRAINT IF EXISTS "DataScope_parent_id_fkey";
DROP INDEX IF EXISTS public."User_username_key";
DROP INDEX IF EXISTS public."User_username_idx";
DROP INDEX IF EXISTS public."User_is_active_idx";
DROP INDEX IF EXISTS public."User_full_name_idx";
DROP INDEX IF EXISTS public."User_email_idx";
DROP INDEX IF EXISTS public."User_district_id_idx";
DROP INDEX IF EXISTS public."UserRole_user_id_role_id_key";
DROP INDEX IF EXISTS public."UserRole_role_id_idx";
DROP INDEX IF EXISTS public."Role_name_key";
DROP INDEX IF EXISTS public."Role_name_idx";
DROP INDEX IF EXISTS public."Role_is_system_idx";
DROP INDEX IF EXISTS public."Role_is_active_idx";
DROP INDEX IF EXISTS public."Role_created_by_idx";
DROP INDEX IF EXISTS public."Role_created_at_idx";
DROP INDEX IF EXISTS public."RolePermission_role_id_permission_id_key";
DROP INDEX IF EXISTS public."RolePermission_permission_id_idx";
DROP INDEX IF EXISTS public."RoleDataScope_role_id_idx";
DROP INDEX IF EXISTS public."RoleDataScope_role_id_data_scope_id_key";
DROP INDEX IF EXISTS public."RoleDataScope_data_scope_id_idx";
DROP INDEX IF EXISTS public."Permission_parent_id_idx";
DROP INDEX IF EXISTS public."Permission_order_idx";
DROP INDEX IF EXISTS public."Permission_name_idx";
DROP INDEX IF EXISTS public."Permission_module_resource_idx";
DROP INDEX IF EXISTS public."Permission_module_resource_action_key";
DROP INDEX IF EXISTS public."Permission_module_idx";
DROP INDEX IF EXISTS public."Permission_is_active_idx";
DROP INDEX IF EXISTS public."Permission_code_key";
DROP INDEX IF EXISTS public."Permission_code_idx";
DROP INDEX IF EXISTS public."DataScope_type_idx";
DROP INDEX IF EXISTS public."DataScope_path_idx";
DROP INDEX IF EXISTS public."DataScope_parent_id_idx";
DROP INDEX IF EXISTS public."DataScope_is_active_idx";
DROP INDEX IF EXISTS public."DataScope_code_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_pkey";
ALTER TABLE IF EXISTS ONLY public."Role" DROP CONSTRAINT IF EXISTS "Role_pkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_pkey";
ALTER TABLE IF EXISTS ONLY public."RoleDataScope" DROP CONSTRAINT IF EXISTS "RoleDataScope_pkey";
ALTER TABLE IF EXISTS ONLY public."Permission" DROP CONSTRAINT IF EXISTS "Permission_pkey";
ALTER TABLE IF EXISTS ONLY public."DataScope" DROP CONSTRAINT IF EXISTS "DataScope_pkey";
ALTER TABLE IF EXISTS public."UserRole" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."User" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."RolePermission" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."RoleDataScope" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Role" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Permission" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."DataScope" ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP SEQUENCE IF EXISTS public."User_id_seq";
DROP SEQUENCE IF EXISTS public."UserRole_id_seq";
DROP TABLE IF EXISTS public."UserRole";
DROP TABLE IF EXISTS public."User";
DROP SEQUENCE IF EXISTS public."Role_id_seq";
DROP SEQUENCE IF EXISTS public."RolePermission_id_seq";
DROP TABLE IF EXISTS public."RolePermission";
DROP SEQUENCE IF EXISTS public."RoleDataScope_id_seq";
DROP TABLE IF EXISTS public."RoleDataScope";
DROP TABLE IF EXISTS public."Role";
DROP SEQUENCE IF EXISTS public."Permission_id_seq";
DROP TABLE IF EXISTS public."Permission";
DROP SEQUENCE IF EXISTS public."DataScope_id_seq";
DROP TABLE IF EXISTS public."DataScope";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: DataScope; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DataScope" (
    id integer NOT NULL,
    type text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_en text,
    parent_id integer,
    path text NOT NULL,
    level integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public."DataScope" OWNER TO postgres;

--
-- Name: DataScope_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."DataScope_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DataScope_id_seq" OWNER TO postgres;

--
-- Name: DataScope_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."DataScope_id_seq" OWNED BY public."DataScope".id;


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Permission" (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    module text NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    parent_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    icon text,
    "order" integer DEFAULT 0 NOT NULL,
    ui_path text,
    ui_category text,
    ui_element text
);


ALTER TABLE public."Permission" OWNER TO postgres;

--
-- Name: COLUMN "Permission".icon; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Permission".icon IS 'Icon name for UI display (e.g., "FaEye", "FaEdit")';


--
-- Name: COLUMN "Permission".ui_path; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Permission".ui_path IS 'UI path where this permission is used (e.g., "/dashboard", "/dashboard/baocao")';


--
-- Name: COLUMN "Permission".ui_category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Permission".ui_category IS 'UI category for grouping permissions (e.g., "Trang chính", "Báo cáo", "Người dùng")';


--
-- Name: Permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Permission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Permission_id_seq" OWNER TO postgres;

--
-- Name: Permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Permission_id_seq" OWNED BY public."Permission".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by integer
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: RoleDataScope; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoleDataScope" (
    id integer NOT NULL,
    role_id integer NOT NULL,
    data_scope_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RoleDataScope" OWNER TO postgres;

--
-- Name: RoleDataScope_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."RoleDataScope_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RoleDataScope_id_seq" OWNER TO postgres;

--
-- Name: RoleDataScope_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."RoleDataScope_id_seq" OWNED BY public."RoleDataScope".id;


--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RolePermission" (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RolePermission" OWNER TO postgres;

--
-- Name: RolePermission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."RolePermission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RolePermission_id_seq" OWNER TO postgres;

--
-- Name: RolePermission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."RolePermission_id_seq" OWNED BY public."RolePermission".id;


--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Role_id_seq" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    "position" text,
    organization text,
    district_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    last_login timestamp(3) without time zone,
    email text,
    phone text,
    avatar_url text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserRole" (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by integer
);


ALTER TABLE public."UserRole" OWNER TO postgres;

--
-- Name: UserRole_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."UserRole_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."UserRole_id_seq" OWNER TO postgres;

--
-- Name: UserRole_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."UserRole_id_seq" OWNED BY public."UserRole".id;


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: DataScope id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DataScope" ALTER COLUMN id SET DEFAULT nextval('public."DataScope_id_seq"'::regclass);


--
-- Name: Permission id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Permission" ALTER COLUMN id SET DEFAULT nextval('public."Permission_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: RoleDataScope id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleDataScope" ALTER COLUMN id SET DEFAULT nextval('public."RoleDataScope_id_seq"'::regclass);


--
-- Name: RolePermission id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission" ALTER COLUMN id SET DEFAULT nextval('public."RolePermission_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserRole id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole" ALTER COLUMN id SET DEFAULT nextval('public."UserRole_id_seq"'::regclass);


--
-- Data for Name: DataScope; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DataScope" (id, type, code, name, name_en, parent_id, path, level, is_active) FROM stdin;
1	COUNTRY	VN	Việt Nam	Vietnam	\N	/VN	1	t
2	PROVINCE	VN.LC	Lào Cai	Lao Cai	1	/VN/LC	2	t
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Permission" (id, code, name, description, module, resource, action, parent_id, is_active, created_at, updated_at, icon, "order", ui_path, ui_category, ui_element) FROM stdin;
76	forecast.auto	Dự báo mất rừng tự động	Sử dụng AI/ML để dự báo tự động các khu vực có nguy cơ mất rừng	forecast	auto	execute	\N	t	2025-10-31 16:46:51.88	2025-10-31 16:46:51.88	FaChartLine	1	/dashboard/dubaomatrung	Dự báo mất rừng	Tab "Dự báo tự động", Form nhập tham số, Nút "Chạy dự báo", Kết quả dự báo
77	forecast.custom	Dự báo mất rừng tùy biến	Tùy chỉnh các tham số để dự báo theo nhu cầu cụ thể	forecast	custom	execute	\N	t	2025-10-31 16:46:51.884	2025-10-31 16:46:51.884	FaChartLine	2	/dashboard/dubaomatrung	Dự báo mất rừng	Tab "Dự báo tùy biến", Form cấu hình nâng cao, Nút "Tạo dự báo", Xuất báo cáo
34	data_management.forecast_search	Tra cứu dữ liệu dự báo mất rừng	Tra cứu, xem và tải xuống dữ liệu dự báo mất rừng	data_management	forecast	search	\N	t	2025-10-30 15:24:57.42	2025-10-31 16:46:51.886	FaDatabase	3	/dashboard/quanlydulieu	Quản lý dữ liệu	Tab "Tra cứu dữ liệu dự báo mất rừng", Form tìm kiếm, Bảng kết quả, Nút xuất Excel/PDF
35	data_management.satellite_search	Tra cứu dữ liệu ảnh vệ tinh	Tra cứu và xem ảnh vệ tinh theo khu vực và thời gian	data_management	satellite	search	\N	t	2025-10-30 15:24:57.422	2025-10-31 16:46:51.887	FaDatabase	4	/dashboard/quanlydulieu	Quản lý dữ liệu	Tab "Tra cứu dữ liệu ảnh vệ tinh", Form tìm kiếm, Gallery ảnh, Nút tải xuống
36	data_management.verification	Xác minh dự báo mất rừng	Xác minh độ chính xác của các dự báo mất rừng	data_management	verification	verify	\N	t	2025-10-30 15:24:57.423	2025-10-31 16:46:51.889	FaDatabase	5	/dashboard/quanlydulieu	Quản lý dữ liệu	Tab "Xác minh dự báo mất rừng", Danh sách dự báo cần xác minh, Nút phê duyệt/từ chối, Form ghi chú
37	data_management.data_update	Cập nhật dữ liệu	Cập nhật và đồng bộ dữ liệu mới nhất cho hệ thống	data_management	data	update	\N	t	2025-10-30 15:24:57.425	2025-10-31 16:46:51.891	FaDatabase	6	/dashboard/quanlydulieu	Quản lý dữ liệu	Tab "Cập nhật dữ liệu", Nút "Đồng bộ dữ liệu", Progress bar, Log cập nhật
82	reports.view	Xem báo cáo	Xem các báo cáo thống kê mất rừng đã có	reports	reports	view	\N	t	2025-10-31 16:46:51.893	2025-10-31 16:46:51.893	FaFileAlt	7	/dashboard/baocao	Báo cáo	Danh sách báo cáo, Xem chi tiết báo cáo, Biểu đồ thống kê
83	detection.view	Xem phát hiện mất rừng	Xem các khu vực được phát hiện mất rừng	detection	detection	view	\N	t	2025-10-31 16:46:51.895	2025-10-31 16:46:51.895	FaExclamationTriangle	8	/dashboard/phathienmatrung	Phát hiện mất rừng	Bản đồ phát hiện, Danh sách khu vực mất rừng, Import shapefile
84	user_management.view	Xem danh sách người dùng	Xem danh sách tất cả người dùng trong hệ thống	user_management	user	view	\N	t	2025-10-31 16:46:51.896	2025-10-31 16:46:51.896	FaUsers	9	/dashboard/quanlynguoidung	Quản lý người dùng	Bảng danh sách người dùng, Form tìm kiếm, Thông tin chi tiết user
85	role_management.view	Xem danh sách vai trò	Xem danh sách các vai trò và phân quyền trong hệ thống	role_management	role	view	\N	t	2025-10-31 16:46:51.898	2025-10-31 16:46:51.898	FaUserShield	10	/dashboard/quanlyrole	Quản lý vai trò	Bảng danh sách role, Form phân quyền, Checkbox permissions theo trang và chức năng
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name, description, is_system, is_active, created_at, updated_at, created_by) FROM stdin;
3	gis_manager	Quản lý GIS - Toàn quyền về bản đồ	f	t	2025-10-28 11:23:22.744	2025-10-28 11:23:22.744	\N
4	gis_specialist	Chuyên viên GIS - Thao tác bản đồ	f	t	2025-10-28 11:23:22.748	2025-10-28 11:23:22.748	\N
8	Test		f	t	2025-10-28 14:01:13.575	2025-10-28 14:01:13.575	\N
9	Admin	Quản trị viên hệ thống	t	t	2025-10-29 05:43:56.994	2025-10-29 05:43:56.994	\N
10	User	Người dùng cơ bản	t	t	2025-10-29 05:43:57	2025-10-29 05:43:57	\N
5	verifier	Người xác minh - Xác minh phát hiện và dự báo	f	t	2025-10-28 11:23:22.753	2025-10-30 15:24:57.475	\N
1	super_admin	Quản trị viên tối cao - Toàn quyền hệ thống	t	t	2025-10-28 11:23:22.727	2025-10-31 16:46:51.899	\N
2	admin	Quản trị viên - Quản lý toàn bộ	t	t	2025-10-28 11:23:22.736	2025-10-31 16:46:51.905	\N
13	forecast_specialist	Chuyên viên dự báo - Chỉ dự báo mất rừng	f	t	2025-10-30 15:24:57.467	2025-10-31 16:46:51.91	\N
14	data_manager	Quản lý dữ liệu - Quản lý và xác minh dữ liệu	f	t	2025-10-30 15:24:57.471	2025-10-31 16:46:51.913	\N
6	reporter	Người báo cáo - Quản lý báo cáo	f	t	2025-10-28 11:23:22.758	2025-10-31 16:46:51.917	\N
24	detector	Người phát hiện - Phát hiện mất rừng	f	t	2025-10-31 02:03:44.931	2025-10-31 16:46:51.921	\N
18	user_admin	Quản trị người dùng - Quản lý người dùng	f	t	2025-10-30 15:24:57.485	2025-10-31 16:46:51.923	\N
26	role_admin	Quản trị vai trò - Quản lý vai trò và phân quyền	f	t	2025-10-31 02:03:44.938	2025-10-31 16:46:51.925	\N
7	viewer	Người xem - Chỉ xem một số trang	f	t	2025-10-28 11:23:22.763	2025-10-31 16:46:51.929	\N
\.


--
-- Data for Name: RoleDataScope; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoleDataScope" (id, role_id, data_scope_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RolePermission" (id, role_id, permission_id, created_at) FROM stdin;
710	1	76	2025-10-31 16:46:51.902
711	1	77	2025-10-31 16:46:51.902
712	1	34	2025-10-31 16:46:51.902
713	1	35	2025-10-31 16:46:51.902
714	1	36	2025-10-31 16:46:51.902
715	1	37	2025-10-31 16:46:51.902
716	1	82	2025-10-31 16:46:51.902
717	1	83	2025-10-31 16:46:51.902
718	1	84	2025-10-31 16:46:51.902
719	1	85	2025-10-31 16:46:51.902
720	2	76	2025-10-31 16:46:51.908
721	2	77	2025-10-31 16:46:51.908
722	2	34	2025-10-31 16:46:51.908
723	2	35	2025-10-31 16:46:51.908
724	2	36	2025-10-31 16:46:51.908
725	2	37	2025-10-31 16:46:51.908
726	2	82	2025-10-31 16:46:51.908
727	2	83	2025-10-31 16:46:51.908
728	2	84	2025-10-31 16:46:51.908
729	2	85	2025-10-31 16:46:51.908
730	13	76	2025-10-31 16:46:51.912
731	13	77	2025-10-31 16:46:51.912
732	14	34	2025-10-31 16:46:51.916
733	14	35	2025-10-31 16:46:51.916
734	14	36	2025-10-31 16:46:51.916
735	14	37	2025-10-31 16:46:51.916
736	6	82	2025-10-31 16:46:51.919
737	24	83	2025-10-31 16:46:51.922
738	18	84	2025-10-31 16:46:51.924
739	26	85	2025-10-31 16:46:51.927
740	7	76	2025-10-31 16:46:51.931
741	7	34	2025-10-31 16:46:51.931
742	7	82	2025-10-31 16:46:51.931
743	8	76	2025-10-31 16:47:36.017
620	5	36	2025-10-30 15:24:57.477
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, username, password_hash, full_name, "position", organization, district_id, is_active, created_at, updated_at, last_login, email, phone, avatar_url) FROM stdin;
1	admin	$2b$10$.vI.v8wD3JKSf1T8au2sduLnG03W6qaTNgsuC/26v465LxGLaBJXC	Super Administrator	\N	\N	\N	t	2025-10-28 11:23:22.836	2025-12-01 14:13:35.292	2025-12-01 14:13:35.29	admin@example.com	\N	\N
5	testuser	$2b$10$i9H9mNEOWt3T6vhQv65BOOMZnuVhgSN6772fKXhkhndBdhM1tiSWC	Test User	\N	\N	\N	t	2025-10-30 15:24:57.621	2025-10-31 16:46:52.061	2025-10-31 02:07:33.394	testuser@example.com	\N	\N
3	Test	$2b$10$gsc4m5oagOPCdbSRak7/kuP1gkQAhBeV82n/ts0mF8lRTYWhyy1dW	a	a	a		t	2025-10-29 05:32:08.045	2025-11-02 13:06:39.43	2025-11-02 13:06:39.429	\N	\N	\N
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserRole" (id, user_id, role_id, assigned_at, assigned_by) FROM stdin;
1	1	1	2025-10-28 11:23:22.839	\N
2	3	8	2025-10-29 05:32:08.07	\N
3	5	13	2025-10-30 15:24:57.624	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
47e01d2c-0393-4d47-961c-355acdb2f31e	324ba2444ba9871ea7b302a2a03ab5c57000b89f0722b5972fe6620a614d4930	2025-10-28 11:23:16.947668+00	20251028112309_init_dynamic_rbac	\N	\N	2025-10-28 11:23:16.92488+00	1
484b8e05-77d3-4fcd-8258-6c871d044456	828d8869cbe4d558cc9dda9291d12b1ea5042f6cb7903916d49f39fc2bdceb51	2025-10-28 15:36:20.285268+00	20251028153526_add_ui_fields_to_permissions	\N	\N	2025-10-28 15:36:20.279361+00	1
5255ccf6-7a2e-42e6-af4b-4c13e2ec1c6b	57c1cec9fa0d949aab8bef2587a136cf7ba18ad9cb31a5164dc0a3c7b798b099	2025-10-29 00:32:03.150597+00	20251029003203_add_ui_element_field	\N	\N	2025-10-29 00:32:03.146431+00	1
\.


--
-- Name: DataScope_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DataScope_id_seq"', 2, true);


--
-- Name: Permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Permission_id_seq"', 85, true);


--
-- Name: RoleDataScope_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."RoleDataScope_id_seq"', 1, false);


--
-- Name: RolePermission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."RolePermission_id_seq"', 744, true);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 45, true);


--
-- Name: UserRole_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."UserRole_id_seq"', 3, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 11, true);


--
-- Name: DataScope DataScope_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DataScope"
    ADD CONSTRAINT "DataScope_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: RoleDataScope RoleDataScope_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleDataScope"
    ADD CONSTRAINT "RoleDataScope_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: DataScope_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DataScope_code_key" ON public."DataScope" USING btree (code);


--
-- Name: DataScope_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DataScope_is_active_idx" ON public."DataScope" USING btree (is_active);


--
-- Name: DataScope_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DataScope_parent_id_idx" ON public."DataScope" USING btree (parent_id);


--
-- Name: DataScope_path_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DataScope_path_idx" ON public."DataScope" USING btree (path);


--
-- Name: DataScope_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DataScope_type_idx" ON public."DataScope" USING btree (type);


--
-- Name: Permission_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Permission_code_idx" ON public."Permission" USING btree (code);


--
-- Name: Permission_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Permission_code_key" ON public."Permission" USING btree (code);


--
-- Name: Permission_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Permission_is_active_idx" ON public."Permission" USING btree (is_active);


--
-- Name: Permission_module_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Permission_module_idx" ON public."Permission" USING btree (module);


--
-- Name: Permission_module_resource_action_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Permission_module_resource_action_key" ON public."Permission" USING btree (module, resource, action);


--
-- Name: Permission_module_resource_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Permission_module_resource_idx" ON public."Permission" USING btree (module, resource);


--
-- Name: Permission_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Permission_name_idx" ON public."Permission" USING btree (name);


--
-- Name: Permission_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Permission_order_idx" ON public."Permission" USING btree ("order");


--
-- Name: Permission_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Permission_parent_id_idx" ON public."Permission" USING btree (parent_id);


--
-- Name: RoleDataScope_data_scope_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RoleDataScope_data_scope_id_idx" ON public."RoleDataScope" USING btree (data_scope_id);


--
-- Name: RoleDataScope_role_id_data_scope_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RoleDataScope_role_id_data_scope_id_key" ON public."RoleDataScope" USING btree (role_id, data_scope_id);


--
-- Name: RoleDataScope_role_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RoleDataScope_role_id_idx" ON public."RoleDataScope" USING btree (role_id);


--
-- Name: RolePermission_permission_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RolePermission_permission_id_idx" ON public."RolePermission" USING btree (permission_id);


--
-- Name: RolePermission_role_id_permission_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RolePermission_role_id_permission_id_key" ON public."RolePermission" USING btree (role_id, permission_id);


--
-- Name: Role_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Role_created_at_idx" ON public."Role" USING btree (created_at);


--
-- Name: Role_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Role_created_by_idx" ON public."Role" USING btree (created_by);


--
-- Name: Role_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Role_is_active_idx" ON public."Role" USING btree (is_active);


--
-- Name: Role_is_system_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Role_is_system_idx" ON public."Role" USING btree (is_system);


--
-- Name: Role_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Role_name_idx" ON public."Role" USING btree (name);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: UserRole_role_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserRole_role_id_idx" ON public."UserRole" USING btree (role_id);


--
-- Name: UserRole_user_id_role_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserRole_user_id_role_id_key" ON public."UserRole" USING btree (user_id, role_id);


--
-- Name: User_district_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_district_id_idx" ON public."User" USING btree (district_id);


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_full_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_full_name_idx" ON public."User" USING btree (full_name);


--
-- Name: User_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_is_active_idx" ON public."User" USING btree (is_active);


--
-- Name: User_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_username_idx" ON public."User" USING btree (username);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: DataScope DataScope_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DataScope"
    ADD CONSTRAINT "DataScope_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public."DataScope"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Permission Permission_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleDataScope RoleDataScope_data_scope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleDataScope"
    ADD CONSTRAINT "RoleDataScope_data_scope_id_fkey" FOREIGN KEY (data_scope_id) REFERENCES public."DataScope"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleDataScope RoleDataScope_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleDataScope"
    ADD CONSTRAINT "RoleDataScope_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Role Role_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserRole UserRole_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict T6LIzYIAndZYH6ceCDa4bHiFywGlz9yEgom4pRibs37G96oUne5QPAqukqBJe5K

