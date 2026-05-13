-- Wave 6: Staff Hierarchy
-- Run in Supabase SQL Editor

-- 1. Add name to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;

-- 2. Drop the old constraint and add a new one that allows 'staff'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'shop', 'staff'));
