-- =====================================================================
-- MIGRATION: Add SPECS column to products table
-- Purpose: Store product specifications extracted from scrapers
-- Data Type: JSONB - allows flexible key-value pairs for different platforms
-- =====================================================================

-- Add specs column if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb;

-- Create index for specs column (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_products_specs ON public.products USING gin(specs);

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name = 'specs';
