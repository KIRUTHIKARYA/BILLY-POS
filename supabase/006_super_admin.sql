-- Wave 5: Super Admin & Expanded Shop Metadata
-- Run in Supabase SQL Editor

-- 1. Expanded Shop Info
ALTER TABLE shops ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS shop_registration_number text;

-- 2. Expanded Subscription Features
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_price numeric DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_staff integer DEFAULT 1;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS csv_export_enabled boolean DEFAULT false;

-- Backfill existing subscriptions based on plan name
UPDATE subscriptions SET 
  max_staff = CASE WHEN plan_name = 'starter' THEN 1 WHEN plan_name = 'standard' THEN 3 ELSE 999 END,
  whatsapp_enabled = CASE WHEN plan_name IN ('standard', 'pro', 'elite') THEN true ELSE false END,
  csv_export_enabled = CASE WHEN plan_name IN ('pro', 'elite') THEN true ELSE false END;
