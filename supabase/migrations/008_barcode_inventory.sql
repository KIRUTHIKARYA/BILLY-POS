ALTER TABLE items
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_limit NUMERIC(10,3) NOT NULL DEFAULT 10;

-- Ensure barcode is unique per shop (but can be null if no barcode)
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_shop_barcode ON items(shop_id, barcode) WHERE barcode IS NOT NULL AND barcode != '';

-- Inventory Logs Table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('added', 'sold', 'damaged', 'adjusted', 'returned')),
  quantity_change numeric(10,3) NOT NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_shop_item ON inventory_logs(shop_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_shop_created_at ON inventory_logs(shop_id, created_at desc);
