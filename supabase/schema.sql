-- Rental Management schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type app_role as enum ('customer', 'end_user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'quotation', 'quotation_sent', 'confirmed', 'picked_up', 'returned', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type duration_unit as enum ('hour', 'day', 'week', 'month', 'year');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_kind as enum ('pickup', 'return');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum ('scheduled', 'ready', 'done', 'late', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_kind as enum ('deposit', 'full', 'balance', 'late_fee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum ('held', 'reserved', 'out', 'returned', 'released');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique,
  full_name   text not null,
  email       text not null unique,
  phone       text,
  role        app_role not null default 'customer',
  segment     text not null default 'retail',   -- retail | corporate | vip
  city        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  slug   text not null unique,
  blurb  text
);

create table if not exists products (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid references categories(id) on delete set null,
  name               text not null,
  slug               text not null unique,
  description        text,
  image_url          text,
  is_rentable        boolean not null default true,
  total_units        integer not null default 1 check (total_units >= 0),
  replacement_value  numeric(12,2) not null default 0,
  deposit_amount     numeric(12,2) not null default 0,
  min_duration_unit  duration_unit not null default 'day',
  min_duration_qty   integer not null default 1,
  specs              jsonb not null default '{}'::jsonb,
  tags               text[] not null default '{}',
  created_at         timestamptz not null default now()
);

create index if not exists products_category_idx on products(category_id);

-- ---------------------------------------------------------------------------
-- Pricing
-- ---------------------------------------------------------------------------
create table if not exists pricelists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  segment     text,                 -- null = applies to every segment
  priority    integer not null default 0,   -- higher wins on a tie
  valid_from  date,
  valid_to    date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- One row per (pricelist, scope, duration unit). `scope` narrows from all -> category -> product.
create table if not exists pricelist_rules (
  id               uuid primary key default gen_random_uuid(),
  pricelist_id     uuid not null references pricelists(id) on delete cascade,
  product_id       uuid references products(id) on delete cascade,
  category_id      uuid references categories(id) on delete cascade,
  unit             duration_unit not null,
  min_qty          integer not null default 1,
  price            numeric(12,2) not null,
  discount_percent numeric(5,2) not null default 0,
  discount_fixed   numeric(12,2) not null default 0
);

create index if not exists pricelist_rules_lookup_idx
  on pricelist_rules(pricelist_id, product_id, category_id, unit);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists rental_orders (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique,
  customer_id    uuid not null references profiles(id) on delete restrict,
  status         order_status not null default 'quotation',
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  pricelist_id   uuid references pricelists(id) on delete set null,
  subtotal       numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total      numeric(12,2) not null default 0,
  deposit_total  numeric(12,2) not null default 0,
  late_fee_total numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  confirmed_at   timestamptz,
  check (ends_at > starts_at)
);

create index if not exists rental_orders_customer_idx on rental_orders(customer_id);
create index if not exists rental_orders_window_idx on rental_orders(starts_at, ends_at);

create table if not exists rental_order_lines (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references rental_orders(id) on delete cascade,
  product_id   uuid not null references products(id) on delete restrict,
  quantity     integer not null check (quantity > 0),
  unit         duration_unit not null,
  duration_qty integer not null check (duration_qty > 0),
  unit_price   numeric(12,2) not null,
  discount     numeric(12,2) not null default 0,
  line_total   numeric(12,2) not null,
  breakdown    jsonb not null default '[]'::jsonb  -- how the duration was priced
);

create index if not exists rental_order_lines_order_idx on rental_order_lines(order_id);

-- Availability ledger. Every confirmed line writes one reservation row.
create table if not exists reservations (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references rental_orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  status     reservation_status not null default 'reserved'
);

create index if not exists reservations_product_window_idx
  on reservations(product_id, starts_at, ends_at) where status in ('held', 'reserved', 'out');

-- ---------------------------------------------------------------------------
-- Delivery: reservation -> pickup -> return
-- ---------------------------------------------------------------------------
create table if not exists deliveries (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references rental_orders(id) on delete cascade,
  kind         delivery_kind not null,
  document_no  text not null unique,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  status       delivery_status not null default 'scheduled',
  address      text,
  handler      text,
  notes        text
);

create index if not exists deliveries_order_idx on deliveries(order_id);
create index if not exists deliveries_schedule_idx on deliveries(scheduled_at, status);

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references rental_orders(id) on delete cascade,
  number      text not null unique,
  kind        invoice_kind not null,
  amount      numeric(12,2) not null,
  status      invoice_status not null default 'draft',
  due_date    date,
  issued_at   timestamptz not null default now(),
  paid_at     timestamptz
);

create index if not exists invoices_order_idx on invoices(order_id);

create table if not exists payments (
  id                 uuid primary key default gen_random_uuid(),
  invoice_id         uuid not null references invoices(id) on delete cascade,
  amount             numeric(12,2) not null,
  gateway            text not null default 'stripe',
  gateway_payment_id text,
  status             text not null default 'succeeded',
  paid_at            timestamptz not null default now()
);

create table if not exists late_fee_rules (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category_id uuid references categories(id) on delete cascade,
  grace_hours integer not null default 0,
  fee_type    text not null default 'per_day',  -- flat | per_day | percent_of_rental
  amount      numeric(12,2) not null,
  cap_amount  numeric(12,2),
  is_active   boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists notification_rules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  audience      text not null,          -- customer | end_user
  event         text not null,          -- before_return | before_pickup | overdue
  lead_days     integer not null default 3,
  channel       text not null default 'email',   -- email | portal
  is_active     boolean not null default true
);

create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid references notification_rules(id) on delete set null,
  order_id      uuid not null references rental_orders(id) on delete cascade,
  audience      text not null,
  channel       text not null,
  subject       text not null,
  body          text not null,
  scheduled_for timestamptz not null,
  sent_at       timestamptz,
  status        text not null default 'scheduled'  -- scheduled | sent | failed | read
);

create index if not exists notifications_due_idx on notifications(scheduled_for, status);

-- ---------------------------------------------------------------------------
-- Settings (notification lead time, currency, tax rate, gateway choice)
-- ---------------------------------------------------------------------------
create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Availability helper: units free for a product across a window
-- ---------------------------------------------------------------------------
create or replace function available_units(
  p_product_id uuid,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz
) returns integer
language sql stable as $$
  select greatest(
    0,
    (select total_units from products where id = p_product_id)
    - coalesce((
        select sum(quantity)
        from reservations r
        where r.product_id = p_product_id
          and r.status in ('held', 'reserved', 'out')
          and r.starts_at < p_ends_at
          and r.ends_at   > p_starts_at
      ), 0)
  )::integer;
$$;
