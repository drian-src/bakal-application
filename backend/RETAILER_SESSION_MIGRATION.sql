-- =====================================================================
-- LINKED_RETAILER_SESSIONS TABLE MIGRATION
-- Stores persistent browser session data for authenticated retailer access
-- =====================================================================

-- Create linked_retailer_sessions table
CREATE TABLE IF NOT EXISTS public.linked_retailer_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  platform_id uuid NOT NULL,
  session_partition text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  login_time timestamp with time zone,
  last_accessed timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT linked_retailer_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT linked_retailer_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT linked_retailer_sessions_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE,
  CONSTRAINT linked_retailer_sessions_unique UNIQUE(user_id, platform_id)
);

-- Create indexes on linked_retailer_sessions
CREATE INDEX IF NOT EXISTS idx_linked_retailer_sessions_user_id 
  ON public.linked_retailer_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_linked_retailer_sessions_platform_id 
  ON public.linked_retailer_sessions(platform_id);

CREATE INDEX IF NOT EXISTS idx_linked_retailer_sessions_is_active 
  ON public.linked_retailer_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_linked_retailer_sessions_created_at 
  ON public.linked_retailer_sessions(created_at DESC);

-- Add comments to table
COMMENT ON TABLE public.linked_retailer_sessions IS 'Stores persistent browser session data for authenticated retailer platform access via Electron desktop app';

COMMENT ON COLUMN public.linked_retailer_sessions.session_partition IS 'Electron session partition key format: persist:platform_userId';

COMMENT ON COLUMN public.linked_retailer_sessions.is_active IS 'Whether session is currently active (logged in)';

COMMENT ON COLUMN public.linked_retailer_sessions.login_time IS 'Timestamp when user logged into the retailer platform';

COMMENT ON COLUMN public.linked_retailer_sessions.last_accessed IS 'Last time this session was accessed/used';
