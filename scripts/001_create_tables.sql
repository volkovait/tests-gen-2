-- Lingua Bloom Database Schema
-- Creates tables for user profiles, tests, and test attempts

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles 
  FOR DELETE USING (auth.uid() = id);

-- Tests table
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_filename TEXT,
  question_count INTEGER NOT NULL DEFAULT 0,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tests
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Tests policies
CREATE POLICY "tests_select_own" ON public.tests 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tests_insert_own" ON public.tests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tests_update_own" ON public.tests 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tests_delete_own" ON public.tests 
  FOR DELETE USING (auth.uid() = user_id);

-- Test attempts table
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER,
  total_questions INTEGER,
  percentage DECIMAL(5,2),
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on test_attempts
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Test attempts policies
CREATE POLICY "attempts_select_own" ON public.test_attempts 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "attempts_insert_own" ON public.test_attempts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attempts_update_own" ON public.test_attempts 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "attempts_delete_own" ON public.test_attempts 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON public.tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON public.tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_completed_at ON public.test_attempts(completed_at DESC);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tests_updated_at ON public.tests;
CREATE TRIGGER set_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
