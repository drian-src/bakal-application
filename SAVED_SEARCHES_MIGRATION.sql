-- =====================================================================
-- SAVED SEARCHES TABLE MIGRATION
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  saved_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  new_count   INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT saved_searches_unique_query UNIQUE(user_id, query)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_saved_at ON public.saved_searches(saved_at);

-- Add comments
COMMENT ON TABLE public.saved_searches IS 'User-pinned search queries for quick re-running';
COMMENT ON COLUMN public.saved_searches.id IS 'Unique identifier for saved search';
COMMENT ON COLUMN public.saved_searches.user_id IS 'Reference to users table';
COMMENT ON COLUMN public.saved_searches.query IS 'The search query text';
COMMENT ON COLUMN public.saved_searches.saved_at IS 'Timestamp when search was saved';
COMMENT ON COLUMN public.saved_searches.new_count IS 'Number of new products found since last run';
COMMENT ON COLUMN public.saved_searches.last_run_at IS 'Timestamp of last search execution';
