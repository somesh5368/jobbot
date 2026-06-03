-- =============================================
-- JobBot AI - Supabase Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users / Profile table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  resume_text TEXT,
  skills TEXT[],
  preferred_roles TEXT[],
  preferred_locations TEXT[],
  work_mode TEXT DEFAULT 'any', -- remote, hybrid, onsite, any
  min_stipend INTEGER DEFAULT 0,
  auto_apply BOOLEAN DEFAULT false,
  auto_apply_threshold INTEGER DEFAULT 85,
  email_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job listings table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  work_mode TEXT,
  type TEXT, -- job, internship
  stipend TEXT,
  description TEXT,
  requirements TEXT[],
  apply_url TEXT,
  source TEXT, -- internshala, naukri, linkedin, ncs, etc.
  posted_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  match_score INTEGER DEFAULT 0,
  fake_risk_score INTEGER DEFAULT 0,
  fake_risk_reasons TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_govt BOOLEAN DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  job_id UUID REFERENCES jobs(id),
  status TEXT DEFAULT 'applied', -- applied, viewed, interview, rejected, selected
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  is_auto_applied BOOLEAN DEFAULT false,
  cover_letter TEXT,
  notes TEXT,
  follow_up_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email alerts log
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  subject TEXT,
  job_ids UUID[],
  alert_type TEXT, -- new_job, fake_detected, auto_applied, digest
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT true
);

-- Scrape run logs
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT,
  jobs_found INTEGER DEFAULT 0,
  jobs_new INTEGER DEFAULT 0,
  jobs_applied INTEGER DEFAULT 0,
  errors TEXT[],
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_fake_risk ON jobs(fake_risk_score);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_profile ON applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses these)
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (true);
CREATE POLICY "applications_own" ON applications FOR ALL USING (true);
CREATE POLICY "email_logs_own" ON email_logs FOR ALL USING (true);
CREATE POLICY "jobs_public" ON jobs FOR SELECT USING (true);
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (true);
