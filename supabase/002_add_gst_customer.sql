-- Wave 2: Add GST and customer name support to bills table
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount    NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill existing bills (no GST, no customer)
UPDATE bills SET gst_rate = 0, gst_amount = 0 WHERE gst_rate IS NULL;
