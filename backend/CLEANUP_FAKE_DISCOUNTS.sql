-- ============================================================================
-- CLEANUP_FAKE_DISCOUNTS.sql
-- ============================================================================
-- This script removes fake/corrupted discount data from the products table.
-- Fake discounts occur when:
--   1. discount_percent > 0 but original_price IS NULL
--   2. discount_percent > 0 but original_price <= price (invalid comparison)
-- 
-- These records cause the "Save ₱X" and discount badges to display false
-- savings calculations on the carousel and comparison modal.
-- ============================================================================

BEGIN;

-- Count fake discounts BEFORE cleanup
SELECT COUNT(*) AS fake_discounts_found 
FROM products 
WHERE discount_percent > 0 
  AND (original_price IS NULL OR original_price <= price);

-- Fix all fake discounts by setting discount_percent to 0 and is_on_sale to false
UPDATE products
SET 
  discount_percent = 0,
  is_on_sale = false,
  updated_at = NOW()
WHERE discount_percent > 0 
  AND (original_price IS NULL OR original_price <= price);

-- Verify the fix
SELECT COUNT(*) AS remaining_fake_discounts
FROM products 
WHERE discount_percent > 0 
  AND (original_price IS NULL OR original_price <= price);

-- Optional: Review some examples of what was fixed
SELECT 
  id,
  title,
  price,
  original_price,
  discount_percent,
  is_on_sale,
  platform
FROM products
WHERE discount_percent = 0 
  AND original_price IS NULL
LIMIT 10;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after cleanup)
-- ============================================================================
-- All products with discounts should now have original_price > price:
-- SELECT id, title, price, original_price, discount_percent
-- FROM products
-- WHERE discount_percent > 0
-- ORDER BY discount_percent DESC;
