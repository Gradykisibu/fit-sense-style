CREATE POLICY "Users can update their own trend reports"
ON public.trend_reports
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trend reports"
ON public.trend_reports
FOR DELETE
USING (auth.uid() = user_id);