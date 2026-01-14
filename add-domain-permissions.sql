-- ============================================
-- Add allowed_domains column to platform_users
-- ============================================
-- Run this SQL to add domain permissions for gerentes

-- Add allowed_domains column (array of domain strings)
ALTER TABLE platform_users 
ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN platform_users.allowed_domains IS 'Array of domain names the user (gerente) is allowed to manage. Empty array or NULL means no restrictions (admin) or no access (gerente without domains).';

-- Update Svetlana to only have access to reclutamientodelvalle.space
UPDATE platform_users 
SET allowed_domains = ARRAY['reclutamientodelvalle.space']
WHERE email = '4806222@gmail.com';

-- Verify the update
SELECT id, email, name, role, allowed_domains 
FROM platform_users;
