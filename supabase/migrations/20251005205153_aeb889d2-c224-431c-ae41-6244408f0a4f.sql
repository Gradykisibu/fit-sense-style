-- Create user_preferences table to store learned style preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL, -- 'style', 'color', 'occasion', 'fit', 'brand'
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  confidence_score DECIMAL DEFAULT 0.5, -- 0-1 score of how confident we are
  times_observed INTEGER DEFAULT 1,
  last_observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_type, preference_key)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add image_url column to messages table for image analysis
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for faster preference lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON public.user_preferences(user_id, preference_type);