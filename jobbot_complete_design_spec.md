# JobBot AI — Complete Redesign Specification
**Author:** Somesh Pandey | CSE-AI | B.Tech  
**Version:** 2.0 — Full Feature Design  
**Date:** June 2026  
**Stack:** FastAPI (Python) + Next.js + Supabase + Anthropic Claude API + Resend

---

## Table of Contents
1. Overview & Philosophy
2. Full Architecture
3. Database Schema (complete)
4. Backend API Endpoints (complete)
5. Feature Modules (detailed)
6. Frontend Pages & UI Sections
7. Data Flows (step-by-step)
8. Third-Party Integrations
9. Environment Variables
10. File/Storage Structure

---

## 1. Overview & Philosophy

JobBot 2.0 is a personal AI job-hunting assistant. It is not a job board — it is an autonomous agent that works on behalf of one user (you). It knows your resume, your documents, your skills, your goals, and your application history. It acts like a smart career assistant running 24/7.

### Core Principles
- **Single-user system** — all data belongs to one person. No multi-user login.
- **AI-first** — every job match, email, question set, and resume edit goes through the Anthropic Claude API.
- **Full document vault** — stores all personal documents needed for any application.
- **Closed-loop tracking** — from "job found" to "interview passed", every step is logged.
- **Zero manual work** — the system finds, scores, alerts, prepares, and follows up on its own.

---

## 2. Full Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js / Vercel)              │
│  Pages: Dashboard | Job Feed | Applications | Vault | Profile   │
│         Competitions | Interview Prep | Resume Builder          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / Supabase Realtime
┌───────────────────────────▼─────────────────────────────────────┐
│                     BACKEND (FastAPI / Render)                   │
│                                                                  │
│  Routers:                                                        │
│    /profile     → profile CRUD, document upload                  │
│    /resume      → PDF/DOCX parse, skill extract, ATS rewrite     │
│    /scan        → manual trigger for job scrape + AI score       │
│    /jobs        → job CRUD, match scoring                        │
│    /apply       → track application, trigger interview prep      │
│    /interview   → AI question gen, answer hints, feedback        │
│    /vault       → encrypted document storage (Supabase Storage)  │
│    /competitions→ scrape + track hackathons/competitions         │
│    /email       → Resend email dispatch                          │
│    /health      → keep-alive ping endpoint                       │
│                                                                  │
│  Services:                                                       │
│    ScraperService  → multi-source web scrape                     │
│    AIService       → Anthropic Claude API calls                  │
│    EmailService    → Resend API                                  │
│    StorageService  → Supabase Storage (files)                    │
│    SchedulerService→ APScheduler (30-min cron)                   │
└────┬──────────────┬───────────────┬───────────────┬─────────────┘
     │              │               │               │
┌────▼────┐  ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│Supabase │  │Anthropic    │ │ Resend    │ │ Scraper     │
│Postgres │  │Claude API   │ │ Email API │ │ Targets     │
│+ Storage│  │(claude-3-5) │ │           │ │ (web)       │
└─────────┘  └─────────────┘ └───────────┘ └─────────────┘
```

---

## 3. Database Schema (Complete)

### Table: `profile`
Single row. Your entire personal profile.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
full_name             TEXT
email                 TEXT                        ← where alerts go
phone                 TEXT
date_of_birth         DATE
gender                TEXT
city                  TEXT
state                 TEXT
linkedin_url          TEXT
github_url            TEXT
portfolio_url         TEXT
photo_url             TEXT                        ← Supabase Storage path
preferred_roles       TEXT[]                      ← ['ML Engineer', 'Data Scientist']
preferred_locations   TEXT[]                      ← ['Remote', 'Bangalore']
expected_ctc          TEXT
notice_period         TEXT
experience_level      TEXT                        ← 'fresher' | 'intern' | '1-3yr'
auto_apply_enabled    BOOLEAN DEFAULT false
auto_apply_threshold  INTEGER DEFAULT 85          ← minimum match % to auto-apply
email_alerts_enabled  BOOLEAN DEFAULT true
alert_threshold       INTEGER DEFAULT 60          ← minimum match % to send email
skills                TEXT[]                      ← extracted from resume
raw_resume_text       TEXT                        ← plain text of latest resume
resume_url            TEXT                        ← Supabase Storage path (PDF)
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```

### Table: `documents`
All personal documents stored securely.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
document_type         TEXT     ← 'aadhar' | 'pan' | 'marksheet_10' | 'marksheet_12'
                                 | 'degree' | 'offer_letter' | 'certificate' | 'other'
document_name         TEXT     ← user-given label e.g. "10th Marksheet CBSE 2020"
file_url              TEXT     ← Supabase Storage path
file_name             TEXT     ← original filename
file_size_bytes       INTEGER
mime_type             TEXT
issued_by             TEXT     ← e.g. "CBSE", "Lucknow University"
issue_date            DATE
expiry_date           DATE     ← for Aadhar/PAN/ID cards if applicable
notes                 TEXT
uploaded_at           TIMESTAMPTZ DEFAULT now()
```

### Table: `education`
```
id                    UUID PRIMARY KEY
degree                TEXT     ← 'B.Tech', 'XII', 'X'
institution           TEXT
board_or_university   TEXT
field_of_study        TEXT     ← 'CSE-AI'
start_year            INTEGER
end_year              INTEGER
cgpa_or_percentage    TEXT
backlogs              INTEGER DEFAULT 0
created_at            TIMESTAMPTZ DEFAULT now()
```

### Table: `experience`
```
id                    UUID PRIMARY KEY
company               TEXT
role                  TEXT
employment_type       TEXT     ← 'internship' | 'fulltime' | 'freelance' | 'project'
start_date            DATE
end_date              DATE     ← null if current
is_current            BOOLEAN DEFAULT false
description           TEXT     ← bullet points of work done
technologies          TEXT[]
created_at            TIMESTAMPTZ DEFAULT now()
```

### Table: `jobs`
All scraped jobs.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
title                 TEXT
company               TEXT
location              TEXT
job_type              TEXT     ← 'internship' | 'fulltime' | 'parttime' | 'remote'
source                TEXT     ← 'internshala' | 'naukri' | 'linkedin' | 'unstop'
                                 | 'foundit' | 'wellfound' | 'web_search' | 'ncs'
source_url            TEXT     ← direct link to the job posting
description           TEXT     ← full job description text
requirements          TEXT[]   ← extracted requirement bullets
skills_required       TEXT[]   ← extracted skill keywords
stipend_or_salary     TEXT
duration              TEXT     ← for internships
deadline              DATE
posted_date           DATE
match_score           INTEGER  ← 0–100, AI-generated
match_reasons         TEXT[]   ← why this job matches your profile
fake_risk_score       INTEGER  ← 0–100, higher = more suspicious
fake_risk_reasons     TEXT[]   ← why flagged as suspicious
status                TEXT     ← 'new' | 'saved' | 'applied' | 'rejected' | 'ignored'
ai_summary            TEXT     ← 2-3 line AI summary of the job
is_verified           BOOLEAN DEFAULT false
email_sent            BOOLEAN DEFAULT false
scraped_at            TIMESTAMPTZ DEFAULT now()
```

### Table: `applications`
Tracks every job you've applied to.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
job_id                UUID REFERENCES jobs(id)
applied_date          DATE DEFAULT CURRENT_DATE
applied_method        TEXT     ← 'auto' | 'manual'
application_status    TEXT     ← 'applied' | 'shortlisted' | 'interview_scheduled'
                                 | 'offered' | 'rejected' | 'withdrawn' | 'ghosted'
resume_version_url    TEXT     ← which resume version was used (ATS-optimized copy)
cover_letter_text     TEXT     ← AI-generated cover letter used
follow_up_date        DATE     ← when to follow up if no response
follow_up_sent        BOOLEAN DEFAULT false
interview_date        TIMESTAMPTZ
interview_mode        TEXT     ← 'online' | 'offline' | 'telephonic'
interview_notes       TEXT
offer_details         TEXT
rejection_reason      TEXT
notes                 TEXT
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```

### Table: `competitions`
Hackathons, coding contests, domain competitions.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
title                 TEXT
organizer             TEXT     ← 'Unstop', 'Devfolio', 'HackerEarth', 'NASSCOM'
competition_type      TEXT     ← 'hackathon' | 'coding_contest' | 'case_study'
                                 | 'quiz' | 'research' | 'design'
domains               TEXT[]   ← ['AI', 'ML', 'Web Dev']
source_url            TEXT
description           TEXT
prizes                TEXT
eligibility           TEXT
registration_deadline DATE
competition_date      DATE
team_size             TEXT     ← 'solo' | '2-4' | 'open'
is_online             BOOLEAN
relevance_score       INTEGER  ← 0–100, AI-scored vs your profile/skills
status                TEXT     ← 'upcoming' | 'registered' | 'participated' | 'won'
registration_status   TEXT     ← 'not_registered' | 'registered'
registered_date       DATE
notes                 TEXT
email_sent            BOOLEAN DEFAULT false
scraped_at            TIMESTAMPTZ DEFAULT now()
```

### Table: `interview_prep`
AI-generated interview prep packages per job.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
job_id                UUID REFERENCES jobs(id)
application_id        UUID REFERENCES applications(id)
generated_at          TIMESTAMPTZ DEFAULT now()

company_research      TEXT     ← AI summary of the company, recent news
role_overview         TEXT     ← what the role actually involves day-to-day
technical_questions   JSONB    ← [{question, hint, sample_answer, difficulty}]
hr_questions          JSONB    ← [{question, hint, what_they_look_for}]
domain_questions      JSONB    ← [{question, hint, sample_answer}]
coding_topics         TEXT[]   ← e.g. ['Arrays', 'Dynamic Programming', 'SQL']
project_tips          TEXT     ← how to present your projects for this role
resume_talking_points TEXT[]   ← specific lines from your resume to highlight
dress_code_tips       TEXT
dos_and_donts         TEXT[]
estimated_rounds      INTEGER
prep_resources        JSONB    ← [{title, url, type}] — free learning links
ats_resume_url        TEXT     ← path to the ATS-optimized resume for this job
cover_letter_text     TEXT
```

### Table: `resume_versions`
Every AI-modified resume is saved.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
job_id                UUID REFERENCES jobs(id)   ← null = master resume
version_label         TEXT     ← 'Master v3' | 'ATS for Google SWE'
original_text         TEXT
modified_text         TEXT
changes_made          TEXT[]   ← what AI changed and why
ats_score_before      INTEGER
ats_score_after       INTEGER
file_url              TEXT     ← Supabase Storage path of PDF
generated_at          TIMESTAMPTZ DEFAULT now()
```

### Table: `email_log`
Every email sent by the system.

```
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
email_type            TEXT     ← 'job_alert' | 'fraud_alert' | 'competition_alert'
                                 | 'interview_prep' | 'follow_up_reminder'
                                 | 'application_confirmation' | 'weekly_digest'
subject               TEXT
body_preview          TEXT
job_id                UUID REFERENCES jobs(id)
competition_id        UUID REFERENCES competitions(id)
sent_at               TIMESTAMPTZ DEFAULT now()
resend_message_id     TEXT
status                TEXT     ← 'sent' | 'failed'
error_message         TEXT
```

---

## 4. Backend API Endpoints (Complete)

### Health
```
GET  /                        → {"status": "JobBot AI is live 🚀"}
GET  /health                  → {"status": "ok", "scheduler": "running", "db": "connected"}
```

### Profile
```
GET  /profile                 → returns full profile row
PUT  /profile                 → update any profile field
POST /profile/photo           → upload profile photo → Supabase Storage → returns photo_url
GET  /profile/education       → list education records
POST /profile/education       → add education entry
PUT  /profile/education/{id}  → update
DELETE /profile/education/{id}
GET  /profile/experience      → list experience records
POST /profile/experience      → add experience
PUT  /profile/experience/{id}
DELETE /profile/experience/{id}
```

### Resume
```
POST /resume/upload
     Body: multipart/form-data { file: PDF|DOCX|TXT }
     → Extracts text (pdfplumber for PDF, python-docx for DOCX)
     → Calls Claude API to extract structured skills, experience, education
     → Saves raw_resume_text and skills[] to profile table
     → Saves PDF to Supabase Storage
     → Returns { skills, education, experience, ats_score }

POST /resume/generate-ats
     Body: { job_id: UUID }
     → Fetches job description + your resume text
     → Calls Claude API with prompt: "Rewrite this resume for ATS, 
       targeting this job description, keep factual, highlight matching skills"
     → Returns modified resume text + changes_made[]
     → Saves new resume_versions row
     → Generates PDF and uploads to Supabase Storage

GET  /resume/versions         → list all resume versions
GET  /resume/versions/{id}    → get one version (with download URL)
```

### Document Vault
```
GET  /vault                   → list all documents (no file content, just metadata)
POST /vault/upload
     Body: multipart/form-data { file, document_type, document_name, 
           issued_by, issue_date, notes }
     → Uploads file to Supabase Storage (bucket: "documents", private)
     → Creates documents row
     → Returns { id, file_url }

GET  /vault/{id}/download     → generates signed URL (1 hour TTL) for download
PUT  /vault/{id}              → update metadata
DELETE /vault/{id}            → delete file from Storage + row
```

### Jobs
```
GET  /jobs
     Query params: status, min_match, job_type, source, limit, offset
     → Returns paginated list of jobs from Supabase

GET  /jobs/{id}               → full job detail including AI summary, match reasons

POST /jobs/{id}/save          → marks job status = 'saved'
POST /jobs/{id}/ignore        → marks job status = 'ignored'

POST /jobs/{id}/apply
     Body: { method: 'manual' | 'auto', notes: TEXT }
     → Creates applications row
     → Triggers /interview prep generation (async, background task)
     → Sends application confirmation email
     → Returns application_id
```

### Scan (Job Discovery)
```
POST /scan
     Body: { sources: ['all'] | ['internshala', 'naukri', ...], keywords: TEXT[] }
     → Runs full scrape pipeline (see Section 7 for flow)
     → Returns { jobs_found, jobs_new, jobs_matched, emails_sent }

GET  /scan/status             → returns last scan time, next scheduled scan time
```

### Applications
```
GET  /applications            → list all with job details joined
GET  /applications/{id}       → single application detail
PUT  /applications/{id}
     Body: any updatable field (status, interview_date, notes, etc.)
     → Updates application
     → If status changed to 'interview_scheduled', triggers interview prep email

POST /applications/{id}/follow-up
     → Sends follow-up email alert to user reminding them to follow up
     → Sets follow_up_sent = true

GET  /applications/stats
     → Returns { total_applied, shortlisted, offers, rejections, 
                 response_rate, avg_days_to_response }
```

### Competitions
```
GET  /competitions
     Query: status, domain, type, upcoming_only
POST /competitions/{id}/register → marks as registered, logs date
PUT  /competitions/{id}
GET  /competitions/stats
     → Returns { upcoming, registered, participated, won }

POST /scan/competitions       → manual trigger to scrape Unstop, Devfolio,
                                 HackerEarth, LeetCode contests for your domains
```

### Interview Prep
```
GET  /interview/{job_id}
     → Returns full interview_prep row for that job
     → If not exists yet, generates it via Claude API (may take 10–15 sec)
     → Returns all: questions, company research, resume talking points, etc.

POST /interview/{job_id}/regenerate
     → Regenerates the prep package (useful if job description changed)

GET  /interview/{application_id}/questions
     → Returns only the questions array (for quick access from frontend)
```

### Email
```
POST /email/test              → sends a test email to profile.email
GET  /email/log               → returns last 50 emails sent
```

---

## 5. Feature Modules (Detailed)

---

### MODULE A: Multi-Source Job Discovery

**What it does:** Finds jobs from every possible source — structured scrapers for known sites, and AI-powered web search for everything else.

**Sources:**
```
Tier 1 — Structured scrapers (HTML parsing):
  - Internshala          internshala.com/internships + /jobs
  - NCS Portal           ncs.gov.in
  - Unstop               unstop.com
  - Naukri               naukri.com (fresher section)
  - Foundit (Monster)    foundit.in
  - Wellfound            wellfound.com (startups)
  - LinkedIn Jobs        linkedin.com/jobs (public listings)
  - TimesJobs            timesjobs.com
  - Shine                shine.com

Tier 2 — AI Web Search (Anthropic + SerpAPI or Google Custom Search):
  - Query: "{preferred_role} internship OR job site:linkedin.com OR site:internshala.com"
  - Query: "{skill} fresher job India 2026"
  - Query: "{company} hiring {role} India"
  - New/unknown job sites surface here

Tier 3 — Company career pages (configurable list):
  - User can add specific company URLs
  - Scraper checks their /careers page for matching roles
```

**Scrape pipeline per job:**
```
1. Fetch HTML from source URL
2. Parse: title, company, location, type, description, requirements, stipend, deadline
3. Send to Claude API:
   Prompt: "Given this job description and the user's skills {skills[]}, 
            preferred roles {preferred_roles[]}, and experience level {experience_level}:
            1. Calculate match score 0-100
            2. List top 5 reasons this matches
            3. List any critical gaps
            4. Detect fake job indicators (vague company, no registration, 
               advance fee request, too-good salary, spelling errors)
            5. Give fake risk score 0-100
            6. Write a 2-sentence plain-English summary of this role"
5. Save to jobs table
6. If match_score >= alert_threshold AND email_sent = false:
   → Trigger job alert email
7. If auto_apply_enabled AND match_score >= auto_apply_threshold:
   → Create application record (method: 'auto')
   → Trigger ATS resume generation
   → Trigger interview prep generation
```

---

### MODULE B: AI Job Matching (Anthropic Claude)

**What it does:** Replaces simple keyword matching with semantic AI understanding of job fit.

**Claude prompt pattern for matching:**
```
System: You are a career advisor analyzing job fit for a computer science student.

User profile:
- Name: {name}
- Degree: {degree}, {field}, {institution}
- CGPA: {cgpa}
- Skills: {skills[]}
- Experience: {experience_summary}
- Preferred roles: {preferred_roles[]}
- Experience level: {experience_level}
- Location preference: {preferred_locations[]}

Job:
Title: {title}
Company: {company}
Description: {description}
Requirements: {requirements}
Stipend/Salary: {stipend_or_salary}
Location: {location}
Type: {job_type}

Respond ONLY in JSON:
{
  "match_score": 0-100,
  "match_reasons": ["reason1", "reason2", "reason3"],
  "skill_gaps": ["gap1", "gap2"],
  "fake_risk_score": 0-100,
  "fake_risk_reasons": ["reason"] or [],
  "summary": "2-sentence plain English summary of this job",
  "should_apply": true|false,
  "tailored_angle": "1 sentence on how to position yourself for this role"
}
```

---

### MODULE C: Email Alert System

**Email types and content:**

#### Job Alert Email
```
Subject: 🎯 {match_score}% Match — {title} at {company}

Body sections:
  ─ Job title, company, location, type
  ─ Stipend/salary
  ─ Deadline to apply
  ─ AI summary (the 2-sentence one from matching)
  ─ Why you match: bullet list of match_reasons[]
  ─ Skill gaps to be aware of: skill_gaps[]
  ─ Fake risk level: ✅ Safe / ⚠️ Medium / 🚨 High Risk
  ─ Direct link to job posting
  ─ Button: "View Full Details" → links to your dashboard
  ─ Button: "Generate Interview Prep"
```

#### Competition Alert Email
```
Subject: 🏆 New Competition — {title} by {organizer} | {competition_date}

Body sections:
  ─ Competition title, organizer, type
  ─ Relevance score + why it matches your domain
  ─ Prizes
  ─ Registration deadline (with days remaining)
  ─ Team size
  ─ Eligibility
  ─ Registration link
  ─ "Add to tracker" button → your dashboard
```

#### Interview Prep Ready Email
```
Subject: 📋 Interview Prep Ready — {title} at {company}

Body sections:
  ─ Company overview (2–3 lines from AI research)
  ─ Role overview
  ─ 5 likely technical questions (preview)
  ─ 3 HR questions (preview)
  ─ Key topics to revise: coding_topics[]
  ─ Your resume talking points (3 bullets)
  ─ Link: "View Full Prep Package" → dashboard
  ─ Link: "Download ATS Resume for this job"
```

#### Weekly Digest Email (every Sunday)
```
Subject: 📊 Your Week — {N} new jobs, {M} competitions, {K} applications

Body:
  ─ Stats: jobs found this week, applied, shortlisted
  ─ Top 3 best-match new jobs (with scores)
  ─ Upcoming competition deadlines
  ─ Applications needing follow-up
  ─ Resume tips from AI based on week's patterns
```

#### Follow-Up Reminder Email
```
Subject: ⏰ Follow up with {company} — {N} days since application

Body:
  ─ Job details
  ─ When you applied
  ─ Draft follow-up message (Claude-generated, professional)
  ─ HR email (if found on the job listing)
```

---

### MODULE D: Document Vault

**What it stores:**
```
Category          Document Types
─────────────────────────────────────────────────────────
Identity          Aadhar Card (front + back), PAN Card, Passport, Voter ID
Academic          10th Marksheet, 12th Marksheet, Degree Certificate,
                  Semester Marksheets, Bonafide Certificate
Achievements      Certificates (courses, competitions, workshops)
Professional      Offer Letters (past internships), Experience Letters, NOC
Resume            All resume versions (auto-saved per job applied)
Photos            Passport-size photo, Profile photo
Other             Any document with a custom label
```

**Storage structure (Supabase Storage):**
```
bucket: "user-vault"  (private bucket, signed URLs only)
  /photo/
    profile.jpg
    passport-photo.jpg
  /identity/
    aadhar-front.pdf
    aadhar-back.pdf
    pan-card.pdf
  /academic/
    10th-marksheet.pdf
    12th-marksheet.pdf
    degree-certificate.pdf
    sem1-marksheet.pdf ... sem8-marksheet.pdf
  /certificates/
    coursera-ml.pdf
    hackathon-winner.pdf
  /resumes/
    master-resume-v1.pdf
    master-resume-v2.pdf
    ats-resume-google-swe-2026-01-15.pdf
    ats-resume-amazon-ml-2026-02-03.pdf
  /experience/
    internship-offer-letter.pdf
    experience-letter.pdf
```

**Access pattern:**
- All files stored privately
- Backend generates Supabase signed URL (1-hour expiry) when user requests download
- Frontend never touches storage directly for sensitive files
- File size limit: 10MB per file, 500MB total

---

### MODULE E: AI Resume + ATS Optimizer

**What it does:** When you apply to a job, Claude rewrites your master resume to maximize ATS score and keyword match for that specific job, without fabricating anything.

**Claude prompt for ATS rewrite:**
```
System: You are an expert ATS resume optimizer. 
Rules:
- NEVER fabricate skills, experience, or credentials the user doesn't have
- DO reorder bullet points to front-load most relevant experience
- DO rephrase descriptions using exact keywords from the job description
- DO adjust the summary/objective section to mirror the role
- DO ensure all required skills that exist in the profile are mentioned
- Format: clean text, no tables, no columns, no graphics (ATS-friendly)
- Output the full resume text, then list every change made

User's master resume:
{raw_resume_text}

Target job description:
{job_description}

Required skills from this job:
{skills_required[]}

Output JSON:
{
  "ats_score_before": integer,
  "ats_score_after": integer,
  "modified_resume_text": "full resume text here",
  "changes_made": ["change 1 description", "change 2", ...],
  "missing_skills": ["skills you don't have that were required"],
  "keywords_added": ["keywords inserted from job description"],
  "cover_letter": "full cover letter text, personalized"
}
```

**ATS score calculation** (done by Claude in the same call):
- Keywords matched / keywords required × 40 points
- Formatting compliance (no tables, headers clear) × 20 points
- Skills section coverage × 20 points  
- Education match × 10 points
- Contact info complete × 10 points

---

### MODULE F: Interview Preparation Engine

**What it generates (per job applied):**

```
1. Company Research
   - What the company does (Claude web knowledge)
   - Recent news / funding / products
   - Company culture signals from job description
   - Interview style: known for technical | HR heavy | case study
   - Glassdoor-style insights (from AI training data)

2. Role Deep-Dive
   - Day-to-day responsibilities broken down
   - What success looks like in 90 days
   - Tech stack / tools expected
   - Seniority expectations

3. Technical Questions (10–15 questions)
   Per question:
   {
     "question": "Explain the difference between supervised and unsupervised learning",
     "difficulty": "medium",
     "hint": "Focus on labeled vs unlabeled data, give one real example each",
     "sample_answer": "Full 3-4 sentence answer",
     "follow_up": "They might ask: name 3 supervised algorithms"
   }

4. HR / Behavioral Questions (8–10 questions)
   Per question:
   {
     "question": "Tell me about yourself",
     "what_they_look_for": "Concise, relevant, confident narrative — 90 seconds max",
     "hint": "Structure: background → relevant skills → why this role",
     "sample_answer": "Personalized answer using YOUR profile data"
   }

5. Domain/Project Questions (5–8 questions)
   - Based on your listed projects and experience
   - Questions about your own resume content
   - How to explain your projects in context of this role

6. Coding Topics to Revise (if technical role)
   - Data structures relevant to role
   - Algorithms commonly asked at this company level
   - Free LeetCode / GFG / resource links

7. Resume Talking Points
   - Exactly which bullets from your resume to highlight
   - How to frame each for this company's context
   - What NOT to mention (irrelevant stuff)

8. Dos and Don'ts
   - 5 things to do (research the company, ask about team structure, etc.)
   - 5 things to avoid (specific to the company/role type)

9. Questions to Ask the Interviewer
   - 5 smart questions tailored to this company/role

10. Estimated Interview Rounds
    - Based on company size, role type
    - What each round likely covers
```

**Claude prompt for interview prep:**
```
System: You are a career coach specializing in tech internships and fresher jobs in India.

User profile:
{full_profile_json}

Job they applied for:
{full_job_json}

Generate a complete interview preparation package.
The answers must reference the user's ACTUAL projects, skills, and experience.
Do not give generic advice — personalize everything.

Output JSON with all sections listed above.
```

---

### MODULE G: Competition & Hackathon Tracker

**Sources scraped:**
```
- Unstop (unstop.com/competitions)
- Devfolio (devfolio.co/hackathons)
- HackerEarth (hackerearth.com/challenges)
- HackerRank (hackerrank.com/contests)
- LeetCode (leetcode.com/contest)
- Kaggle (kaggle.com/competitions) ← for ML/AI roles
- NASSCOM events
- Internshala competitions
- Smart India Hackathon portal
- Google Summer of Code, MLH (for open source)
```

**Relevance scoring:**
```
Claude prompt: "Given a student with skills {skills[]} in domain {preferred_roles[]}, 
rate this competition 0-100 for relevance:
{competition_details}

Consider: domain match, skill match, prizes, prestige, learning value.
Output JSON: { relevance_score, relevance_reasons[], recommended: bool }"
```

**Tracking states:**
```
upcoming → registered → participated → won/lost
```

**Email alert:** sent when relevance_score >= 70 and registration is open.

---

### MODULE H: Application Timeline & Analytics

**Timeline view per application:**
```
Date Applied → Days to Response → Interview Scheduled → Outcome
```

**Analytics dashboard stats:**
```
- Total applications sent
- Response rate (%)
- Shortlist rate (%)
- Average days to first response
- Applications by source (which site gives best results)
- Match score vs outcome correlation (do higher match scores get responses?)
- Best performing skills (which skills in your profile led to matches)
- Top companies showing interest
- Weekly application trend chart
```

---

## 6. Frontend Pages & UI Sections

### Page 1: Dashboard (Home)
```
Top bar: Last scan time | Next scan | "Scan Now" button
Stats row: Total jobs found | Verified safe | High match (80%+) | Applied | Auto-applied
Tabs: Job Feed | Govt Schemes | My Applications | Competitions | Resume | Vault | Profile
```

### Page 2: Job Feed
```
Filters: Type (Internship/Job) | Match % | Risk level | Source | Location | Sort
Job card:
  - Title, Company, Location, Type
  - Match score badge (color-coded: green ≥80, yellow 60-79, red <60)
  - Fake risk badge
  - Salary/Stipend | Deadline
  - AI summary text (2 lines)
  - Buttons: Save | Apply | Ignore | Generate Prep
Job detail panel (side drawer):
  - Full description
  - Match reasons list
  - Skill gaps list
  - ATS resume button
  - Cover letter button
  - Interview prep button
```

### Page 3: My Applications
```
Timeline view: Application card per job
  - Job title, Company
  - Status badge: Applied | Shortlisted | Interview | Offer | Rejected | Ghosted
  - Applied date | Days since applied
  - Follow-up button (if >7 days and no response)
  - Interview prep button
  - Notes field (editable inline)
Stats panel:
  - Pie chart: application outcomes
  - Bar chart: applications per week
  - Response rate number
  - Average response time
```

### Page 4: Competitions
```
Tabs: Upcoming | Registered | Participated | All
Competition card:
  - Title, Organizer, Type
  - Relevance score badge
  - Prizes
  - Registration deadline (days remaining)
  - Team size | Online/Offline
  - Register button | Track button
Filter: Domain | Type | Online only | Deadline within N days
```

### Page 5: Resume & ATS
```
Left panel:
  - Upload master resume (PDF/DOCX/TXT)
  - View extracted skills list
  - Edit skills manually
  - ATS score of master resume

Right panel:
  - Resume versions list
    - Master v1, v2...
    - ATS optimized: [Job Title] — date
  - Per version: ATS score, changes made, download PDF

Bottom:
  - "Optimize for a job" — select job from list → generates ATS version
```

### Page 6: Document Vault
```
Grid of document categories:
  Identity | Academic | Certificates | Professional | Photos | Resume | Other
Per category: list of uploaded docs
  - Name, type, date uploaded, file size
  - Download button (generates signed URL)
  - Delete button
Upload panel:
  - File picker
  - Document type dropdown
  - Label (text field)
  - Issuer, issue date (optional)
  - Upload button
```

### Page 7: Profile
```
Sections:
  1. Personal Info: name, email, phone, DOB, gender, city, state, photo upload
  2. Online Presence: LinkedIn, GitHub, portfolio
  3. Job Preferences: preferred roles, locations, expected CTC, experience level
  4. Automation Settings:
     - Email alerts toggle + threshold slider (60–100)
     - Auto-apply toggle + threshold slider (75–100)
  5. Education list (add/edit/delete)
  6. Experience list (add/edit/delete)
  7. Skills list (editable tags — pulled from resume, manually editable)
```

### Page 8: Interview Prep (per job)
```
Header: Job title, Company, Your prep score
Tabs:
  Company Research | Role Overview | Technical Qs | HR Qs | Projects | 
  Resume Tips | Coding Topics | Resources | ATS Resume | Cover Letter

Technical Qs tab:
  - Question list
  - Click to expand: hint, sample answer, follow-up
  - Difficulty badge
  - "Practice" button (opens answer input, you type, AI gives feedback)

HR Qs tab:
  - Question list
  - Expand: what they look for, sample answer (personalized to your profile)

Coding Topics tab:
  - List of topics with links to free resources
  - Difficulty per topic

ATS Resume tab:
  - Side-by-side: original vs ATS version
  - Changes highlighted
  - ATS score before and after
  - Download PDF button
```

---

## 7. Data Flows (Step-by-Step)

### Flow 1: Resume Upload → Skill Extraction
```
1. User uploads PDF/DOCX/TXT in Resume tab
2. Frontend: POST /resume/upload (multipart)
3. Backend:
   a. If PDF → pdfplumber.extract_text()
   b. If DOCX → python-docx Document().paragraphs
   c. If TXT → read directly
4. Send text to Claude API:
   "Extract from this resume: skills[], education[], experience[], 
   projects[], certifications[]. Return JSON."
5. Save:
   - profile.raw_resume_text = extracted text
   - profile.skills[] = Claude's skill list
   - profile.resume_url = Supabase Storage upload path
   - Insert/update education rows
   - Insert/update experience rows
6. Return to frontend: { skills[], education[], experience[], ats_score }
7. Frontend shows extracted skills, user can edit/add/remove
```

### Flow 2: Scheduled Job Scan (every 30 min)
```
1. APScheduler fires → calls internal scan()
2. ScraperService runs per source:
   a. Fetch URLs from each job site
   b. Parse HTML with BeautifulSoup
   c. For each job found: check if already in DB (by source_url)
   d. New jobs only proceed
3. For each new job:
   a. Call Claude API for match score + fake risk score (see Module A)
   b. Insert into jobs table
4. Email dispatch:
   a. jobs where match_score >= profile.alert_threshold AND email_sent = false
   b. Build job alert email (see Module C)
   c. POST to Resend API
   d. Update email_sent = true
5. Auto-apply:
   a. jobs where auto_apply_enabled AND match_score >= auto_apply_threshold
   b. Create applications row
   c. Background task: generate ATS resume (POST /resume/generate-ats)
   d. Background task: generate interview prep
   e. Send application confirmation email
6. Log scan completion time
```

### Flow 3: Apply to Job → Interview Prep
```
1. User clicks "Apply" on a job card
2. Frontend: POST /jobs/{id}/apply { method: 'manual' }
3. Backend:
   a. Creates applications row (status: 'applied', applied_date: today)
   b. Background task starts:
      i.  POST /resume/generate-ats { job_id }
          → Claude rewrites resume for this job
          → Saves PDF to Supabase Storage
          → Creates resume_versions row
      ii. Generate interview prep:
          → Claude API call (see Module F)
          → Saves to interview_prep table
4. Send "application confirmation" email with:
   - Job details
   - ATS resume download link
   - Preview of interview questions
5. Frontend: redirect to Applications page, show this application
6. Interview Prep page is now available for this job
```

### Flow 4: AI Web Search for Jobs
```
1. ScraperService.web_search_jobs() called during scan
2. Builds search queries from profile:
   queries = [
     f"{role} internship 2026 India" for role in preferred_roles,
     f"{skill} developer fresher job" for skill in top_skills,
     f"B.Tech CSE {experience_level} hiring {current_month}",
   ]
3. For each query:
   a. Call search API (SerpAPI / Google Custom Search)
   b. Get top 5 result URLs
   c. For each URL: fetch page, check if it's a job posting
   d. If yes: extract job details (title, company, description)
   e. Feed through same match scoring pipeline
   f. source = 'web_search', source_url = the URL found
4. These jobs appear in Job Feed with source badge "Web"
```

### Flow 5: Competition Discovery
```
1. ScraperService.scrape_competitions() called (daily, separate cron)
2. Scrapes: Unstop, Devfolio, HackerEarth, Kaggle, HackerRank
3. Per competition:
   a. Parse: title, organizer, type, deadline, prizes, domains
   b. Check if already in DB (by title + organizer)
   c. New ones: call Claude for relevance_score
   d. Save to competitions table
4. If relevance_score >= 70 AND email_sent = false:
   a. Send competition alert email
   b. Set email_sent = true
```

---

## 8. Third-Party Integrations

### Anthropic Claude API
```
Model: claude-sonnet-4-5  (or latest sonnet — best balance of speed + quality)
Usage:
  - Resume parsing (skill/edu/exp extraction)
  - Job match scoring + fake risk scoring
  - ATS resume rewriting
  - Interview prep generation
  - Company research
  - Competition relevance scoring
  - Cover letter generation
  - Follow-up email drafting
  - Weekly digest insights

Estimated tokens per operation:
  - Job match scoring: ~800 tokens per job
  - Resume ATS rewrite: ~3000 tokens
  - Interview prep: ~5000 tokens
  - Competition scoring: ~500 tokens

Cost estimate (Sonnet pricing):
  - 100 jobs/day scored: ~80K tokens/day ≈ $0.24/day
  - 2 ATS rewrites/week: ~6K tokens ≈ $0.018/week
  - 2 interview preps/week: ~10K tokens ≈ $0.03/week
  Total: ~$7–10/month
```

### Resend Email API
```
Free tier: 3,000 emails/month
Usage:
  - Job alerts (up to 10/day)
  - Competition alerts (1-2/day)
  - Interview prep ready (per application)
  - Weekly digest (1/week)
  - Follow-up reminders
  - Test emails
Estimated: 300–600 emails/month — well within free tier
```

### Supabase
```
Free tier: 500MB database, 1GB storage
Database usage: ~10MB (jobs, applications, prep data)
Storage usage:
  - Documents vault: up to 200MB (your PDFs)
  - Resume versions: ~5MB per version × 20 versions = 100MB
  Total: ~300MB — within free tier
```

### SerpAPI or Google Custom Search (for web job search)
```
SerpAPI free tier: 100 searches/month
Google Custom Search: 100 free queries/day
Usage: 5–10 queries per scan × 4 scans/day = 20–40 queries/day
Recommendation: Use Google Custom Search JSON API (free tier sufficient)
API key env var: GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX
```

### Optional: Render Cron (or cron-job.org)
```
Purpose: Keep Render free tier alive + trigger scheduled scans
Ping /health every 14 minutes
Alternatively: Render paid tier ($7/month) removes the sleep issue entirely
```

---

## 9. Environment Variables (Complete List)

### Backend (Render)
```
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...          ← service role key (full DB access)

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Resend Email
RESEND_API_KEY=re_...
FROM_EMAIL=jobbot@yourdomain.com     ← MUST be set or all emails fail

# Web Search (optional but enables Module A Tier 2)
GOOGLE_SEARCH_API_KEY=AIza...
GOOGLE_SEARCH_CX=...                 ← Custom Search Engine ID

# App config
SCAN_INTERVAL_MINUTES=30
PORT=10000                           ← Render sets this automatically
PYTHON_VERSION=3.11.9               ← add in Render env to pin Python
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://jobbot-lpob.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... ← anon key (limited access via RLS)
```

---

## 10. File/Storage Structure

### Backend folder structure
```
backend/
├── main.py                  ← FastAPI app, routes, scheduler setup
├── requirements.txt
├── runtime.txt              ← python-3.11.9
├── routers/
│   ├── profile.py
│   ├── resume.py
│   ├── jobs.py
│   ├── vault.py
│   ├── applications.py
│   ├── interview.py
│   ├── competitions.py
│   └── email_router.py
├── services/
│   ├── ai_service.py        ← all Claude API calls
│   ├── scraper_service.py   ← all web scraping
│   ├── email_service.py     ← Resend API calls + email templates
│   ├── storage_service.py   ← Supabase Storage operations
│   ├── resume_service.py    ← PDF/DOCX parsing, ATS generation
│   └── scheduler_service.py ← APScheduler config
├── models/
│   ├── profile.py           ← Pydantic models
│   ├── job.py
│   ├── application.py
│   ├── competition.py
│   └── document.py
├── templates/
│   ├── job_alert.html       ← Email HTML templates
│   ├── competition_alert.html
│   ├── interview_ready.html
│   ├── weekly_digest.html
│   └── follow_up_reminder.html
└── utils/
    ├── pdf_generator.py     ← Generate PDF from resume text (reportlab or weasyprint)
    └── text_extractor.py    ← PDF/DOCX text extraction
```

### Supabase Storage buckets
```
bucket: "user-vault"       → private, all personal documents
  /photo/
  /identity/
  /academic/
  /certificates/
  /resumes/
  /experience/

bucket: "ats-resumes"      → private, AI-generated resume versions
  /master/
  /jobs/                   → one PDF per job applied
```

### Frontend folder structure
```
frontend/
├── app/
│   ├── page.js              ← Dashboard
│   ├── jobs/page.js         ← Job Feed
│   ├── applications/page.js ← My Applications
│   ├── competitions/page.js
│   ├── resume/page.js
│   ├── vault/page.js
│   ├── profile/page.js
│   └── interview/[jobId]/page.js
├── components/
│   ├── JobCard.js
│   ├── ApplicationCard.js
│   ├── CompetitionCard.js
│   ├── DocumentCard.js
│   ├── StatsBar.js
│   ├── ScanButton.js
│   ├── InterviewPrepPanel.js
│   ├── ResumeViewer.js
│   └── VaultUploader.js
├── lib/
│   ├── supabase.js          ← Supabase client
│   └── api.js               ← Backend API calls
└── public/
```

---

## Summary: What Changes from Current Version

| Feature | Before (v1) | After (v2) |
|---|---|---|
| Job sources | Internshala, NCS, Unstop | 9+ sites + AI web search + company pages |
| Resume format | .txt only | PDF, DOCX, TXT |
| Skill extraction | Keyword match | Claude AI structured extraction |
| Job matching | Basic keyword | Claude semantic scoring with reasons |
| Email content | Minimal | Full details: requirements, match reasons, risk, links |
| Competition tracking | None | Full tracker: 8+ sources, relevance scoring |
| Document storage | None | Full vault: Aadhar, marksheets, photos, all docs |
| Interview prep | None | Full AI package: questions, company research, tips |
| ATS resume | None | Per-job AI rewrite, score before/after, PDF download |
| Cover letter | None | AI-generated per job |
| Application analytics | None | Full stats: response rate, charts, timeline |
| Follow-up reminders | None | Auto email reminder after 7 days |
| Weekly digest | None | Sunday summary email |
| Anthropic API | Not used | Core of all AI features |
| Auth/Security | No RLS | Supabase RLS on all tables |

