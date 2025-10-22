-- Fix the status check constraint to include 'success' as a valid status
ALTER TABLE public.try_on_jobs DROP CONSTRAINT IF EXISTS try_on_jobs_status_check;
ALTER TABLE public.try_on_jobs ADD CONSTRAINT try_on_jobs_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'success'::text, 'done'::text, 'failed'::text]));