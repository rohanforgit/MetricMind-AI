-- ==========================================
-- METRICMIND AI DATABASE SETUP SCRIPT
-- Run this inside the Supabase SQL Editor
-- ==========================================

-- 1. Create Profile Table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Setup Profile Sync Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'MetricMind User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create Datasets Table
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    row_count INTEGER NOT NULL,
    column_count INTEGER NOT NULL,
    headers TEXT[] NOT NULL,
    summary_statistics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create Dataset Rows Table
CREATE TABLE IF NOT EXISTS public.dataset_rows (
    id BIGSERIAL PRIMARY KEY,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
    row_index INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create Generated Insights Table
CREATE TABLE IF NOT EXISTS public.generated_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    insights_content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create Analytics Table
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Add Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_datasets_user ON public.datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset ON public.dataset_rows(dataset_id);
CREATE INDEX IF NOT EXISTS idx_insights_dataset ON public.generated_insights(dataset_id);
CREATE INDEX IF NOT EXISTS idx_insights_user ON public.generated_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.analytics(user_id);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- 9. Add RLS Security Policies
-- Users Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can edit their own profile" ON public.users;
CREATE POLICY "Users can edit their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Datasets Policies
DROP POLICY IF EXISTS "Select datasets" ON public.datasets;
CREATE POLICY "Select datasets" ON public.datasets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert datasets" ON public.datasets;
CREATE POLICY "Insert datasets" ON public.datasets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update datasets" ON public.datasets;
CREATE POLICY "Update datasets" ON public.datasets FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete datasets" ON public.datasets;
CREATE POLICY "Delete datasets" ON public.datasets FOR DELETE USING (auth.uid() = user_id);

-- Dataset Rows Policies
DROP POLICY IF EXISTS "Select rows" ON public.dataset_rows;
CREATE POLICY "Select rows" ON public.dataset_rows FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.datasets 
        WHERE public.datasets.id = public.dataset_rows.dataset_id 
        AND public.datasets.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Insert rows" ON public.dataset_rows;
CREATE POLICY "Insert rows" ON public.dataset_rows FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.datasets 
        WHERE public.datasets.id = public.dataset_rows.dataset_id 
        AND public.datasets.user_id = auth.uid()
    )
);

-- Generated Insights Policies
DROP POLICY IF EXISTS "Select insights" ON public.generated_insights;
CREATE POLICY "Select insights" ON public.generated_insights FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert insights" ON public.generated_insights;
CREATE POLICY "Insert insights" ON public.generated_insights FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete insights" ON public.generated_insights;
CREATE POLICY "Delete insights" ON public.generated_insights FOR DELETE USING (auth.uid() = user_id);

-- Analytics Policies
DROP POLICY IF EXISTS "Select analytics" ON public.analytics;
CREATE POLICY "Select analytics" ON public.analytics FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert analytics" ON public.analytics;
CREATE POLICY "Insert analytics" ON public.analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
