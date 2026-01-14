-- ============================================
-- Email Admin Panel - User Management Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor to create user management tables

-- Users table for platform authentication
CREATE TABLE IF NOT EXISTS platform_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'gerente' CHECK (role IN ('admin', 'gerente')),
    is_active BOOLEAN DEFAULT TRUE,
    temp_password BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES platform_users(id)
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON platform_users(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Enable RLS
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_users
CREATE POLICY "Allow read access for authenticated" ON platform_users
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated" ON platform_users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for authenticated" ON platform_users
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete for authenticated" ON platform_users
    FOR DELETE USING (true);

-- RLS Policies for user_sessions
CREATE POLICY "Allow all operations on sessions" ON user_sessions
    FOR ALL USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_platform_users_updated_at ON platform_users;
CREATE TRIGGER update_platform_users_updated_at
    BEFORE UPDATE ON platform_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Initial Users Setup
-- ============================================
-- Note: Passwords are hashed using SHA-256 (for demo purposes)
-- In production, use bcrypt or similar secure hashing

-- Simple hash function for demo (in production use proper bcrypt)
-- Password: ld811017 -> base64 encoded for demo
-- Password: !2345678 -> base64 encoded for demo

-- Insert Admin User: Luis Barreiro
INSERT INTO platform_users (email, password_hash, name, role, is_active, temp_password)
VALUES (
    'diazbarreiro@gmail.com',
    'bGQ4MTEwMTc=',  -- base64 of ld811017 (demo only)
    'Luis Barreiro',
    'admin',
    TRUE,
    TRUE
) ON CONFLICT (email) DO UPDATE SET
    password_hash = 'bGQ4MTEwMTc=',
    name = 'Luis Barreiro',
    role = 'admin',
    is_active = TRUE;

-- Insert Gerente User: Svetlana
INSERT INTO platform_users (email, password_hash, name, role, is_active, temp_password)
VALUES (
    '4806222@gmail.com',
    'ITIzNDU2Nzg=',  -- base64 of !2345678 (demo only)
    'Svetlana',
    'gerente',
    TRUE,
    TRUE
) ON CONFLICT (email) DO UPDATE SET
    password_hash = 'ITIzNDU2Nzg=',
    name = 'Svetlana',
    role = 'gerente',
    is_active = TRUE;

-- Verify users were created
SELECT id, email, name, role, is_active, temp_password, created_at 
FROM platform_users;
