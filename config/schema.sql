-- ══════════════════════════════════════════════════════════════════
--  KC Pride — Supabase Database Schema
--  Run this entire file in:
--  Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ══════════════════════════════════════════════════════════════════


-- ── ORDERS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             TEXT UNIQUE NOT NULL,

  -- Customer
  first_name           TEXT NOT NULL,
  last_name            TEXT,
  email                TEXT NOT NULL,
  phone                TEXT NOT NULL,

  -- Delivery
  address              TEXT NOT NULL,
  city                 TEXT NOT NULL,
  pincode              TEXT NOT NULL,
  state                TEXT NOT NULL,

  -- Pricing
  subtotal             INTEGER NOT NULL,
  discount             INTEGER DEFAULT 0,
  coupon               TEXT,
  delivery_charge      INTEGER DEFAULT 0,
  total                INTEGER NOT NULL,

  -- Payment
  payment_method       TEXT NOT NULL CHECK (payment_method IN ('card','upi','cod')),
  payment_status       TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  razorpay_signature   TEXT,

  -- Order status
  status               TEXT DEFAULT 'placed' CHECK (status IN ('placed','confirmed','processing','shipped','delivered','cancelled')),
  tracking_id          TEXT,

  -- Notifications sent?
  email_sent           BOOLEAN DEFAULT FALSE,
  whatsapp_sent        BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ── ORDER ITEMS TABLE ─────────────────────────────────────────────
-- Each row = one shirt in an order
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL,
  name         TEXT NOT NULL,
  price        INTEGER NOT NULL,
  qty          INTEGER NOT NULL CHECK (qty >= 1),
  size         TEXT NOT NULL CHECK (size IN ('S','M','L','XL','XXL'))
);


-- ── ORDER STATUS HISTORY TABLE ────────────────────────────────────
-- Tracks every status change with a note
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── INDEXES for fast lookups ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_order_id    ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email       ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_phone       ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_order_id     ON order_items(order_id);


-- ── AUTO-UPDATE updated_at TRIGGER ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON orders;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── ROW LEVEL SECURITY ────────────────────────────────────────────
-- Block all public access — your backend uses the service key which bypasses RLS
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════
--  Done! You should now see 3 tables in your Supabase Table Editor:
--  orders / order_items / order_status_history
-- ══════════════════════════════════════════════════════════════════
