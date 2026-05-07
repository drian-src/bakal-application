-- =====================================================================
-- MIGRATION: Add missing product detail columns to products table
-- Purpose: Support extended product information from scrapers
-- Adds: brand, sku, variation, free_items, is_available, stock, 
--       last_scraped, view_count
-- =====================================================================

-- Add columns to products table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'brand'
  ) THEN
    ALTER TABLE public.products ADD COLUMN brand TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE public.products ADD COLUMN sku TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'variation'
  ) THEN
    ALTER TABLE public.products ADD COLUMN variation TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'free_items'
  ) THEN
    ALTER TABLE public.products ADD COLUMN free_items TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock'
  ) THEN
    ALTER TABLE public.products ADD COLUMN stock INTEGER;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'last_scraped'
  ) THEN
    ALTER TABLE public.products ADD COLUMN last_scraped TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.products ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Verify the columns were created
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN (
  'brand', 'sku', 'variation', 'free_items', 
  'is_available', 'stock', 'last_scraped', 'view_count'
)
ORDER BY column_name;
