-- Add country and phone fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN country TEXT,
ADD COLUMN phone TEXT;