-- Wave 4: Split payment support
-- Run in Supabase SQL Editor

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS payment_breakdown JSONB;

-- Example stored value: {"cash": 150.00, "upi": 50.00}
