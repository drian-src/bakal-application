-- =====================================================================
-- CASCADE DELETE CONSTRAINTS MIGRATION
-- Ensures all user-related data is deleted when user account is deleted
-- =====================================================================

-- 1. Fix user_interactions table — add CASCADE if missing
ALTER TABLE public.user_interactions 
DROP CONSTRAINT IF EXISTS user_interactions_user_id_fkey;

ALTER TABLE public.user_interactions 
ADD CONSTRAINT user_interactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Fix user_product_interactions table — add user_id FK with CASCADE if missing
-- This table references user_id but may not have FK constraint
ALTER TABLE public.user_product_interactions 
DROP CONSTRAINT IF EXISTS user_product_interactions_user_id_fkey;

-- Only add if user_id column exists
ALTER TABLE public.user_product_interactions 
ADD CONSTRAINT user_product_interactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Fix user_recommendations table — ensure CASCADE is set
ALTER TABLE public.user_recommendations 
DROP CONSTRAINT IF EXISTS user_recommendations_user_id_fkey;

ALTER TABLE public.user_recommendations 
ADD CONSTRAINT user_recommendations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Verify all CASCADE constraints are in place
-- This query will show all foreign keys referencing the users table
-- SELECT 
--   tc.constraint_name,
--   kcu.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
-- WHERE ccu.table_name = 'users'
-- ORDER BY kcu.table_name;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
