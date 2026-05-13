-- Run this after schema.sql.
-- Password used for both users here: Pass@123
-- bcrypt hash verified for Pass@123 (bcryptjs compare)
-- You can change later from admin tools.

insert into shops (id, name, owner_name, phone, shop_type, is_blocked)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Demo Tea Shop',
    'Owner Demo',
    '9000000001',
    'tea_shop',
    false
  )
on conflict (id) do nothing;

insert into subscriptions (
  id,
  shop_id,
  plan_name,
  expires_at,
  billing_enabled,
  inventory_enabled,
  reports_enabled
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'pro',
    now() + interval '30 days',
    true,
    true,
    true
  )
on conflict (shop_id) do nothing;

insert into users (id, shop_id, username, password_hash, role, is_active)
values
  (
    '33333333-3333-3333-3333-333333333333',
    null,
    'admin',
    '$2b$10$w2lEUCPYGIxud6nXgNLhjuielMtEViYZFinHRWPwURPWfphVCFXXS',
    'admin',
    true
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'shopdemo',
    '$2b$10$w2lEUCPYGIxud6nXgNLhjuielMtEViYZFinHRWPwURPWfphVCFXXS',
    'shop',
    true
  )
on conflict (username) do update set
  password_hash = excluded.password_hash,
  shop_id = excluded.shop_id,
  role = excluded.role,
  is_active = excluded.is_active;
