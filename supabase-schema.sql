-- ============================================
-- Email Admin Panel - Supabase Database Setup
-- ============================================
-- Run this SQL in your Supabase SQL Editor to create the tracking tables

-- Table for tracking email activities (create, delete, modify, etc.)
CREATE TABLE IF NOT EXISTS email_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_type VARCHAR(50) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Table for storing synced email accounts
CREATE TABLE IF NOT EXISTS tracked_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255) NOT NULL,
    disk_used BIGINT DEFAULT 0,
    disk_quota BIGINT DEFAULT 0,
    is_suspended BOOLEAN DEFAULT FALSE,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing email account metadata and custom tracking
CREATE TABLE IF NOT EXISTS email_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    purpose VARCHAR(255),
    assigned_to VARCHAR(255),
    department VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email, domain)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_activities_created_at ON email_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_activities_domain ON email_activities(domain);
CREATE INDEX IF NOT EXISTS idx_email_activities_type ON email_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_tracked_emails_domain ON tracked_emails(domain);
CREATE INDEX IF NOT EXISTS idx_email_metadata_domain ON email_metadata(domain);

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE email_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_metadata ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads for all tables (adjust based on your security needs)
CREATE POLICY "Allow anonymous read access" ON email_activities
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON email_activities
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access" ON tracked_emails
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON tracked_emails
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON tracked_emails
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access" ON email_metadata
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous all access" ON email_metadata
    FOR ALL USING (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_tracked_emails_updated_at ON tracked_emails;
CREATE TRIGGER update_tracked_emails_updated_at
    BEFORE UPDATE ON tracked_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_metadata_updated_at ON email_metadata;
CREATE TRIGGER update_email_metadata_updated_at
    BEFORE UPDATE ON email_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO email_activities (activity_type, email_address, domain, details)
-- VALUES ('created', 'test@example.com', 'example.com', '{"quota": 1024}');
