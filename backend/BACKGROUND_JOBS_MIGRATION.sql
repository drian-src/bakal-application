-- Background Jobs Table Migration
-- Adds retry scheduling and result storage columns
-- Run this in Supabase SQL Editor

-- Add next_run_at for retry delay scheduling
ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

-- Add result_data for storing job output (renamed from conflicting `data` field)
ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS result_data jsonb;

-- Index for efficient polling (status + attempts + next_run_at)
-- This index is critical for the getPendingJobs query performance
CREATE INDEX IF NOT EXISTS idx_background_jobs_poll
  ON public.background_jobs(status, attempts, next_run_at)
  WHERE status IN ('pending', 'retry');

-- Verify the columns exist
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'background_jobs' 
-- ORDER BY ordinal_position;
