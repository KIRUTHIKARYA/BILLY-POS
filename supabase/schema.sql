create extension if not exists "pgcrypto";

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null,
  phone text,
  shop_type text not null,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  plan_name text not null check (plan_name in ('starter', 'pro')),
  expires_at timestamptz not null,
  billing_enabled boolean not null default true,
  inventory_enabled boolean not null default false,
  reports_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (shop_id)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'shop')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  bill_number text not null,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  extra_charges numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'cash',
  status text not null default 'paid' check (status in ('draft', 'held', 'paid', 'cancelled')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (shop_id, bill_number)
);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  item_id uuid not null references items(id),
  item_name text not null,
  unit_price numeric(10,2) not null,
  quantity numeric(10,3) not null default 1,
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_shop_role on users(shop_id, role);
create index if not exists idx_items_shop on items(shop_id);
create index if not exists idx_bills_shop_created_at on bills(shop_id, created_at desc);
