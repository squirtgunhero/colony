-- ============================================================================
-- MULTI-TENANT ROW LEVEL SECURITY MIGRATION
-- Colony CRM - User Data Isolation
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ============================================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. ADD user_id TO EXISTING TABLES
-- ============================================================================

-- Add user_id column to Contact table
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contact_user_id ON "Contact"(user_id);

-- Add user_id column to Property table
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_property_user_id ON "Property"(user_id);

-- Add user_id column to Deal table
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_deal_user_id ON "Deal"(user_id);

-- Add user_id column to Task table
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_task_user_id ON "Task"(user_id);

-- Add user_id column to Activity table
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON "Activity"(user_id);

-- Add user_id column to Document table
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_document_user_id ON "Document"(user_id);

-- Add user_id column to EmailAccount table
ALTER TABLE "EmailAccount" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_emailaccount_user_id ON "EmailAccount"(user_id);

-- ============================================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailAccount" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES - CONTACT TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own contacts" ON "Contact";
CREATE POLICY "Users can view own contacts"
  ON "Contact" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contacts" ON "Contact";
CREATE POLICY "Users can insert own contacts"
  ON "Contact" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contacts" ON "Contact";
CREATE POLICY "Users can update own contacts"
  ON "Contact" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contacts" ON "Contact";
CREATE POLICY "Users can delete own contacts"
  ON "Contact" FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. RLS POLICIES - PROPERTY TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own properties" ON "Property";
CREATE POLICY "Users can view own properties"
  ON "Property" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own properties" ON "Property";
CREATE POLICY "Users can insert own properties"
  ON "Property" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own properties" ON "Property";
CREATE POLICY "Users can update own properties"
  ON "Property" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own properties" ON "Property";
CREATE POLICY "Users can delete own properties"
  ON "Property" FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. RLS POLICIES - DEAL TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own deals" ON "Deal";
CREATE POLICY "Users can view own deals"
  ON "Deal" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own deals" ON "Deal";
CREATE POLICY "Users can insert own deals"
  ON "Deal" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own deals" ON "Deal";
CREATE POLICY "Users can update own deals"
  ON "Deal" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own deals" ON "Deal";
CREATE POLICY "Users can delete own deals"
  ON "Deal" FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. RLS POLICIES - TASK TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tasks" ON "Task";
CREATE POLICY "Users can view own tasks"
  ON "Task" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON "Task";
CREATE POLICY "Users can insert own tasks"
  ON "Task" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON "Task";
CREATE POLICY "Users can update own tasks"
  ON "Task" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON "Task";
CREATE POLICY "Users can delete own tasks"
  ON "Task" FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. RLS POLICIES - ACTIVITY TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own activities" ON "Activity";
CREATE POLICY "Users can view own activities"
  ON "Activity" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activities" ON "Activity";
CREATE POLICY "Users can insert own activities"
  ON "Activity" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activities" ON "Activity";
CREATE POLICY "Users can update own activities"
  ON "Activity" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activities" ON "Activity";
CREATE POLICY "Users can delete own activities"
  ON "Activity" FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. RLS POLICIES - DOCUMENT TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own documents" ON "Document";
CREATE POLICY "Users can view own documents"
  ON "Document" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON "Document";
CREATE POLICY "Users can insert own documents"
  ON "Document" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON "Document";
CREATE POLICY "Users can update own documents"
  ON "Document" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON "Document";
CREATE POLICY "Users can delete own documents"
  ON "Document" FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 11. RLS POLICIES - EMAIL ACCOUNT TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own email accounts" ON "EmailAccount";
CREATE POLICY "Users can view own email accounts"
  ON "EmailAccount" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own email accounts" ON "EmailAccount";
CREATE POLICY "Users can insert own email accounts"
  ON "EmailAccount" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own email accounts" ON "EmailAccount";
CREATE POLICY "Users can update own email accounts"
  ON "EmailAccount" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own email accounts" ON "EmailAccount";
CREATE POLICY "Users can delete own email accounts"
  ON "EmailAccount" FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 12. HELPER FUNCTION - Get current user ID (for use in defaults)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid()
$$;

-- ============================================================================
-- 13. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

