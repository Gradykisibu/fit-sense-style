-- Allow users to delete their own try-on jobs
CREATE POLICY "Users can delete their own try-on jobs"
ON public.try_on_jobs
FOR DELETE
USING (auth.uid() = user_id);