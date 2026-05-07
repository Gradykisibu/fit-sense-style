-- Add subscription tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free',
ADD COLUMN subscription_start_date timestamp with time zone DEFAULT now(),
ADD COLUMN monthly_analyses_used integer NOT NULL DEFAULT 0,
ADD COLUMN monthly_chats_used integer NOT NULL DEFAULT 0,
ADD COLUMN usage_reset_date timestamp with time zone DEFAULT now();

-- Create style_analytics table to track user outfit patterns
CREATE TABLE public.style_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  analysis_date timestamp with time zone NOT NULL DEFAULT now(),
  color_distribution jsonb NOT NULL DEFAULT '{}',
  category_distribution jsonb NOT NULL DEFAULT '{}',
  brand_preferences jsonb NOT NULL DEFAULT '{}',
  average_score numeric,
  total_outfits_analyzed integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create trend_reports table for seasonal fashion insights
CREATE TABLE public.trend_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_period text NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  insights jsonb NOT NULL DEFAULT '{}',
  recommendations jsonb NOT NULL DEFAULT '{}',
  wardrobe_analysis jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.style_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for style_analytics
CREATE POLICY "Users can view their own analytics"
ON public.style_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
ON public.style_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
ON public.style_analytics FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for trend_reports
CREATE POLICY "Users can view their own trend reports"
ON public.trend_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trend reports"
ON public.trend_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_style_analytics_user_id ON public.style_analytics(user_id);
CREATE INDEX idx_trend_reports_user_id ON public.trend_reports(user_id);
CREATE INDEX idx_profiles_subscription_plan ON public.profiles(subscription_plan);

-- Create trigger for style_analytics updated_at
CREATE TRIGGER update_style_analytics_updated_at
BEFORE UPDATE ON public.style_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();