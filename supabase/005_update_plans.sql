-- Wave 4: Update subscription plans
-- Run in Supabase SQL Editor

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_name_check CHECK (plan_name in ('starter', 'standard', 'pro', 'elite'));
