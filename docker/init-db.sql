-- =====================================
-- Database Initialization Script
-- Create all required databases
-- =====================================

-- Create auth_db (for Auth & User service)
CREATE DATABASE auth_db;
\c auth_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create gis_db (for GIS, Report & Search service)
CREATE DATABASE gis_db;
\c gis_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create admin_db (for Admin service)
CREATE DATABASE admin_db;
\c admin_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE gis_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE admin_db TO postgres;
