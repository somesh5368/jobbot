-- ========================================================
-- JobBot AI v2.0 - Clean Drop & Recreate Migration
-- Run this in Supabase SQL Editor (Removes old v1 tables)
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP OLD TABLES (Cascading removes foreign key constraints)
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS scrape_logs CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS education CASCADE;
DROP TABLE IF EXISTS experience CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS interview_prep CASCADE;
DROP TABLE IF EXISTS resume_versions CASCADE;
DROP TABLE IF EXISTS email_log CASCADE;

-- 2. CREATE NEW TABLES (v2.0 Redesign Schema)

-- Profiles Table (Single-User Profile)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  city TEXT,
  state TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  photo_url TEXT,
  preferred_roles TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  expected_ctc TEXT,
  notice_period TEXT,
  experience_level TEXT CHECK (experience_level IN ('fresher', 'intern', '1-3yr', '3-5yr')),
  auto_apply_enabled BOOLEAN DEFAULT false,
  auto_apply_threshold INTEGER DEFAULT 85 CHECK (auto_apply_threshold BETWEEN 0 AND 100),
  email_alerts_enabled BOOLEAN DEFAULT true,
  alert_threshold INTEGER DEFAULT 60 CHECK (alert_threshold BETWEEN 0 AND 100),
  skills TEXT[] DEFAULT '{}',
  raw_resume_text TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Education Table
CREATE TABLE education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  board_or_university TEXT,
  field_of_study TEXT,
  start_year INTEGER,
  end_year INTEGER,
  cgpa_or_percentage TEXT,
  backlogs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Experience Table
CREATE TABLE experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  employment_type TEXT CHECK (employment_type IN ('internship', 'fulltime', 'freelance', 'project')),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  technologies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document Vault Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN ('aadhar', 'pan', 'marksheet_10', 'marksheet_12', 'degree', 'offer_letter', 'certificate', 'other')),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  issued_by TEXT,
  issue_date DATE,
  expiry_date DATE,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs Table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  job_type TEXT CHECK (job_type IN ('internship', 'fulltime', 'parttime', 'remote')),
  source TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',
  stipend_or_salary TEXT,
  duration TEXT,
  deadline DATE,
  posted_date DATE,
  match_score INTEGER DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  match_reasons TEXT[] DEFAULT '{}',
  fake_risk_score INTEGER DEFAULT 0 CHECK (fake_risk_score BETWEEN 0 AND 100),
  fake_risk_reasons TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'saved', 'applied', 'rejected', 'ignored')),
  ai_summary TEXT,
  is_verified BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Applications Table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
  applied_date DATE DEFAULT CURRENT_DATE,
  applied_method TEXT CHECK (applied_method IN ('auto', 'manual')),
  application_status TEXT DEFAULT 'applied' CHECK (application_status IN ('applied', 'shortlisted', 'interview_scheduled', 'offered', 'rejected', 'withdrawn', 'ghosted')),
  resume_version_url TEXT,
  cover_letter_text TEXT,
  follow_up_date DATE,
  follow_up_sent BOOLEAN DEFAULT false,
  interview_date TIMESTAMPTZ,
  interview_mode TEXT CHECK (interview_mode IN ('online', 'offline', 'telephonic')),
  interview_notes TEXT,
  offer_details TEXT,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Competitions Table
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organizer TEXT NOT NULL,
  competition_type TEXT CHECK (competition_type IN ('hackathon', 'coding_contest', 'case_study', 'quiz', 'research', 'design')),
  domains TEXT[] DEFAULT '{}',
  source_url TEXT NOT NULL UNIQUE,
  description TEXT,
  prizes TEXT,
  eligibility TEXT,
  registration_deadline DATE,
  competition_date DATE,
  team_size TEXT,
  is_online BOOLEAN DEFAULT true,
  relevance_score INTEGER DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registered', 'participated', 'won')),
  registration_status TEXT DEFAULT 'not_registered' CHECK (registration_status IN ('not_registered', 'registered')),
  registered_date DATE,
  notes TEXT,
  email_sent BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Interview Prep Table
CREATE TABLE interview_prep (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE UNIQUE,
  generated_at TIMESTAMPTZ DEFAULT now(),
  company_research TEXT,
  role_overview TEXT,
  technical_questions JSONB DEFAULT '[]',
  hr_questions JSONB DEFAULT '[]',
  domain_questions JSONB DEFAULT '[]',
  coding_topics TEXT[] DEFAULT '{}',
  project_tips TEXT,
  resume_talking_points TEXT[] DEFAULT '{}',
  dress_code_tips TEXT,
  dos_and_donts TEXT[] DEFAULT '{}',
  estimated_rounds INTEGER,
  prep_resources JSONB DEFAULT '[]',
  ats_resume_url TEXT,
  cover_letter_text TEXT
);

-- Resume Versions Table
CREATE TABLE resume_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  version_label TEXT NOT NULL,
  original_text TEXT,
  modified_text TEXT,
  changes_made TEXT[] DEFAULT '{}',
  ats_score_before INTEGER,
  ats_score_after INTEGER,
  file_url TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Email Log Table
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  resend_message_id TEXT,
  status TEXT CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- Scrape Run Logs Table (Telemetry)
CREATE TABLE scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT,
  jobs_found INTEGER DEFAULT 0,
  jobs_new INTEGER DEFAULT 0,
  jobs_applied INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_source_v2 ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type_v2 ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_match_score_v2 ON jobs(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_fake_risk_v2 ON jobs(fake_risk_score);
CREATE INDEX IF NOT EXISTS idx_jobs_status_v2 ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at_v2 ON jobs(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_status_v2 ON applications(application_status);
CREATE INDEX IF NOT EXISTS idx_competitions_relevance_v2 ON competitions(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_competitions_deadline_v2 ON competitions(registration_deadline);

-- Row Level Security (Enable RLS for all tables)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write access (Service role key will bypass policies)
CREATE POLICY "allow_all_profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_education" ON education FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_experience" ON experience FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_jobs" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_applications" ON applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_competitions" ON competitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_interview_prep" ON interview_prep FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_resume_versions" ON resume_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_email_log" ON email_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_scrape_logs" ON scrape_logs FOR ALL USING (true) WITH CHECK (true);
