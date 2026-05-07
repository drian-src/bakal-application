-- ============================================================
-- DATABASE MIGRATION — Deals & Discount Tracking System
-- Supabase PostgreSQL
-- ============================================================

-- Add discount columns to products table (if they don't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE products ADD COLUMN original_price FLOAT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE products ADD COLUMN discount_percent FLOAT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_on_sale'
  ) THEN
    ALTER TABLE products ADD COLUMN is_on_sale BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'promo_label'
  ) THEN
    ALTER TABLE products ADD COLUMN promo_label TEXT;
  END IF;
END $$;

-- Create indices for efficient filtering (if they don't already exist)
CREATE INDEX IF NOT EXISTS idx_products_is_on_sale ON products(is_on_sale) WHERE is_on_sale = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percent DESC) WHERE discount_percent IS NOT NULL;

-- (Optional) Backfill existing products to set discount fields
-- This marks any product missing these fields with null values (already default)
-- New products from scrapers will have values computed
-- No correction needed if values are already null

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check that columns were created:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('original_price', 'discount_percent', 'is_on_sale', 'promo_label');

-- Expected output:
-- original_price      | double precision | YES
-- discount_percent    | double precision | YES
-- is_on_sale          | boolean          | YES
-- promo_label         | text             | YES

-- Check indices created:
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'products'
AND indexname IN ('idx_products_is_on_sale', 'idx_products_discount');

-- Count products on sale:
SELECT COUNT(*) as on_sale_count FROM products WHERE is_on_sale = TRUE;

-- Average discount:
SELECT AVG(discount_percent) as avg_discount FROM products WHERE discount_percent IS NOT NULL;

-- ============================================================
-- DONE
-- The scrapers will automatically populate these fields on next run.
-- ============================================================
