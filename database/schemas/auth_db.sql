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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: DataScope; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: DataScope_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DataScope_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DataScope_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DataScope_id_seq" OWNED BY public."DataScope".id;


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN "Permission".icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Permission".icon IS 'Icon name for UI display (e.g., "FaEye", "FaEdit")';


--
-- Name: COLUMN "Permission".ui_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Permission".ui_path IS 'UI path where this permission is used (e.g., "/dashboard", "/dashboard/baocao")';


--
-- Name: COLUMN "Permission".ui_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Permission".ui_category IS 'UI category for grouping permissions (e.g., "Trang chính", "Báo cáo", "Người dùng")';


--
-- Name: Permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Permission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Permission_id_seq" OWNED BY public."Permission".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: RoleDataScope; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RoleDataScope" (
    id integer NOT NULL,
    role_id integer NOT NULL,
    data_scope_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: RoleDataScope_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RoleDataScope_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RoleDataScope_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RoleDataScope_id_seq" OWNED BY public."RoleDataScope".id;


--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RolePermission" (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RolePermission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RolePermission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RolePermission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RolePermission_id_seq" OWNED BY public."RolePermission".id;


--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
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
    avatar_url text,
    khoanh text,
    tieukhu text,
    xa text
);


--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRole" (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by integer
);


--
-- Name: UserRole_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."UserRole_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: UserRole_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UserRole_id_seq" OWNED BY public."UserRole".id;


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: DataScope id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DataScope" ALTER COLUMN id SET DEFAULT nextval('public."DataScope_id_seq"'::regclass);


--
-- Name: Permission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission" ALTER COLUMN id SET DEFAULT nextval('public."Permission_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: RoleDataScope id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoleDataScope" ALTER COLUMN id SET DEFAULT nextval('public."RoleDataScope_id_seq"'::regclass);


--
-- Name: RolePermission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission" ALTER COLUMN id SET DEFAULT nextval('public."RolePermission_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserRole id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole" ALTER COLUMN id SET DEFAULT nextval('public."UserRole_id_seq"'::regclass);


--
-- Name: DataScope DataScope_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DataScope"
    ADD CONSTRAINT "DataScope_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: RoleDataScope RoleDataScope_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoleDataScope"
    ADD CONSTRAINT "RoleDataScope_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: DataScope_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DataScope_code_key" ON public."DataScope" USING btree (code);


--
-- Name: DataScope_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DataScope_is_active_idx" ON public."DataScope" USING btree (is_active);


--
-- Name: DataScope_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DataScope_parent_id_idx" ON public."DataScope" USING btree (parent_id);


--
-- Name: DataScope_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DataScope_path_idx" ON public."DataScope" USING btree (path);


--
-- Name: DataScope_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DataScope_type_idx" ON public."DataScope" USING btree (type);


--
-- Name: Permission_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_code_idx" ON public."Permission" USING btree (code);


--
-- Name: Permission_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_code_key" ON public."Permission" USING btree (code);


--
-- Name: Permission_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_is_active_idx" ON public."Permission" USING btree (is_active);


--
-- Name: Permission_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_module_idx" ON public."Permission" USING btree (module);


--
-- Name: Permission_module_resource_action_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_module_resource_action_key" ON public."Permission" USING btree (module, resource, action);


--
-- Name: Permission_module_resource_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_module_resource_idx" ON public."Permission" USING btree (module, resource);


--
-- Name: Permission_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_name_idx" ON public."Permission" USING btree (name);


--
-- Name: Permission_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_order_idx" ON public."Permission" USING btree ("order");


--
-- Name: Permission_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_parent_id_idx" ON public."Permission" USING btree (parent_id);


--
-- Name: RoleDataScope_data_scope_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RoleDataScope_data_scope_id_idx" ON public."RoleDataScope" USING btree (data_scope_id);


--
-- Name: RoleDataScope_role_id_data_scope_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RoleDataScope_role_id_data_scope_id_key" ON public."RoleDataScope" USING btree (role_id, data_scope_id);


--
-- Name: RoleDataScope_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RoleDataScope_role_id_idx" ON public."RoleDataScope" USING btree (role_id);


--
-- Name: RolePermission_permission_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RolePermission_permission_id_idx" ON public."RolePermission" USING btree (permission_id);


--
-- Name: RolePermission_role_id_permission_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RolePermission_role_id_permission_id_key" ON public."RolePermission" USING btree (role_id, permission_id);


--
-- Name: Role_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_created_at_idx" ON public."Role" USING btree (created_at);


--
-- Name: Role_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_created_by_idx" ON public."Role" USING btree (created_by);


--
-- Name: Role_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_is_active_idx" ON public."Role" USING btree (is_active);


--
-- Name: Role_is_system_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_is_system_idx" ON public."Role" USING btree (is_system);


--
-- Name: Role_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_name_idx" ON public."Role" USING btree (name);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: UserRole_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserRole_role_id_idx" ON public."UserRole" USING btree (role_id);


--
-- Name: UserRole_user_id_role_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserRole_user_id_role_id_key" ON public."UserRole" USING btree (user_id, role_id);


--
-- Name: User_district_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_district_id_idx" ON public."User" USING btree (district_id);


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_full_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_full_name_idx" ON public."User" USING btree (full_name);


--
-- Name: User_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_is_active_idx" ON public."User" USING btree (is_active);


--
-- Name: User_username_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_username_idx" ON public."User" USING btree (username);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: DataScope DataScope_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DataScope"
    ADD CONSTRAINT "DataScope_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public."DataScope"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Permission Permission_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleDataScope RoleDataScope_data_scope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoleDataScope"
    ADD CONSTRAINT "RoleDataScope_data_scope_id_fkey" FOREIGN KEY (data_scope_id) REFERENCES public."DataScope"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleDataScope RoleDataScope_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoleDataScope"
    ADD CONSTRAINT "RoleDataScope_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Role Role_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserRole UserRole_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

