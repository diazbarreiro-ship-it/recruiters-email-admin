-- ============================================
-- Add Recovery Email and Notification Settings
-- ============================================

-- Add recovery_email to tracked_emails
ALTER TABLE tracked_emails ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    welcome_subject TEXT DEFAULT 'Bienvenido a tu nueva cuenta de correo',
    welcome_body TEXT DEFAULT 'Hola,\n\nTu cuenta de correo ha sido creada:\n\nEmail: {email}\nContraseña: {password}\n\nPuedes acceder via Webmail en: https://webmail.{domain}\n\nSaludos,\nEquipo de IT',
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255),
    smtp_pass VARCHAR(255),
    from_name VARCHAR(255) DEFAULT 'Mail Admin',
    from_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for notification_settings
DROP POLICY IF EXISTS "Allow read for authenticated" ON notification_settings;
CREATE POLICY "Allow read for authenticated" ON notification_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON notification_settings;
CREATE POLICY "Allow all for authenticated" ON notification_settings
    FOR ALL USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
