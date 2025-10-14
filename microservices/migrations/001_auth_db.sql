-- ========================================
-- Migration: Auth Database Schema
-- Database: auth_db
-- Version: 1.0
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Table: users
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    district_id VARCHAR(50) DEFAULT NULL,
    position VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    permission_level VARCHAR(50) NOT NULL DEFAULT 'district',

    -- Indexes
    CONSTRAINT chk_role CHECK (role IN ('admin', 'user', 'viewer', 'manager')),
    CONSTRAINT chk_permission CHECK (permission_level IN ('district', 'province', 'national'))
);

-- ========================================
-- Table: user_sessions (mới - để quản lý sessions)
-- ========================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================================
-- Table: user_activity_log (mới - audit trail)
-- ========================================
CREATE TABLE IF NOT EXISTS user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_activity FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_district_id ON users(district_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at DESC);
CREATE INDEX idx_activity_action ON user_activity_log(action);

-- ========================================
-- Functions
-- ========================================

-- Function: Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Update last activity
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Triggers
-- ========================================
CREATE TRIGGER trigger_update_last_activity
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity();

-- ========================================
-- Views
-- ========================================

-- Active users view
CREATE OR REPLACE VIEW v_active_users AS
SELECT
    u.id,
    u.username,
    u.full_name,
    u.role,
    u.organization,
    u.permission_level,
    u.last_login,
    COUNT(s.id) as active_sessions
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.expires_at > NOW()
WHERE u.is_active = true
GROUP BY u.id;

-- ========================================
-- Default Data
-- ========================================

-- Insert default admin user (password: Admin@123#)
-- Note: This is bcrypt hash - update with actual hash from your system
INSERT INTO users (
    username,
    password_hash,
    full_name,
    role,
    position,
    organization,
    permission_level
) VALUES (
    'admin',
    '$2b$10$YOUR_BCRYPT_HASH_HERE', -- Replace with actual hash
    'System Administrator',
    'admin',
    'System Administrator',
    'IT Department',
    'national'
) ON CONFLICT (username) DO NOTHING;

-- ========================================
-- Scheduled Jobs (using pg_cron if available)
-- ========================================

-- Clean expired sessions every hour
-- SELECT cron.schedule('clean-sessions', '0 * * * *', 'SELECT clean_expired_sessions()');

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE user_sessions IS 'Active user sessions for JWT token management';
COMMENT ON TABLE user_activity_log IS 'Audit trail of user activities';
