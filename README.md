<p align="center">
  <strong>JobBot AI v2.0</strong><br />
  <em>Your personal 24/7 AI-powered job search agent</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Claude-AI-D97757?style=flat-square" alt="Claude" />
</p>

---

## What is JobBot?

JobBot AI automates the grind of job hunting for students and early-career engineers:

| Module | What it does |
|--------|----------------|
| **Job discovery** | Scrapes listings (internships, full-time) and scores match + fraud risk |
| **Web search** | Google Custom Search on Greenhouse & Lever boards |
| **Applications** | Track pipeline, follow-ups, and AI-tailored resumes |
| **Interview prep** | Claude-generated guides, practice Q&A, and grading |
| **Competitions** | Hackathons and coding contests matched to your profile |
| **Email alerts** | Resend-powered job, competition, and digest emails with dashboard links |
| **Vault** | Secure document storage for certificates and offer letters |

The dashboard is **passcode-protected** (single-user) and works on **desktop and mobile**.

---

## Architecture

```mermaid
flowchart LR
  subgraph client [Frontend - Vercel]
    UI[Next.js Dashboard]
  end
  subgraph api [Backend - Render]
    FAST[FastAPI + APScheduler]
  end
  subgraph data [Services]
    SB[(Supabase)]
    CL[Claude API]
    RS[Resend Email]
    GS[Google Custom Search]
  end
  UI -->|X-JobBot-Key + REST| FAST
  FAST --> SB
  FAST --> CL
  FAST --> RS
  FAST --> GS
  RS -->|email links| UI
```

---

## Project structure

```
jobbot/
├── backend/          # FastAPI API, scrapers, scheduler, email templates
│   ├── main.py
│   ├── routers/
│   ├── services/
│   ├── templates/    # HTML emails (use DASHBOARD_URL)
│   └── render.yaml   # Render deploy blueprint
└── frontend/         # Next.js 14 dashboard
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── lib/api.js
    └── vercel.json
```

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- Accounts: [Supabase](https://supabase.com), [Anthropic](https://console.anthropic.com), [Resend](https://resend.com)
- Optional: [Google Cloud](https://console.cloud.google.com) + [Programmable Search Engine](https://programmablesearchengine.google.com) for web job discovery

---

## Local development

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env — see Environment variables below
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API root: http://localhost:8000  
- Health: http://localhost:8000/health  

### 2. Frontend

```powershell
cd frontend
npm install
copy .env.example .env.development
# Edit .env.development
npm run dev
```

- Dashboard: http://localhost:3000  

### 3. Unlock the dashboard

Set the **same secret** in backend and frontend server env:

| File | Variable |
|------|----------|
| `backend/.env` | `X_JOBBOT_KEY` |
| `frontend/.env.local` or `.env.development` | `JOBBOT_ACCESS_SECRET` |

Enter that value on the lock screen. A **30-day HttpOnly cookie** is set — the secret is **never** stored in the browser or exposed via `NEXT_PUBLIC_*`.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (server only) |
| `ANTHROPIC_API_KEY` | Yes | Claude API for scoring, resume, interview |
| `RESEND_API_KEY` | Yes | Transactional email |
| `FROM_EMAIL` | Yes | Verified sender in Resend |
| `X_JOBBOT_KEY` | Yes | API auth header secret |
| `DASHBOARD_URL` | Yes | Frontend URL for **email links** (`http://localhost:3000` local, Vercel URL in prod) |
| `CORS_ORIGINS` | Prod | Comma-separated allowed origins, e.g. `https://your-app.vercel.app` (use `*` only for dev) |
| `GOOGLE_SEARCH_API_KEY` | Optional | Google Cloud API key (Custom Search API enabled) |
| `GOOGLE_SEARCH_CX` | Optional | Programmable Search engine ID |
| `PORT` | Auto | `8000` locally; Render sets `$PORT` |

### Frontend (`.env.local` local / **Vercel** production)

| Variable | Required | Exposed to browser? | Description |
|----------|----------|---------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Anon key only |
| `JOBBOT_ACCESS_SECRET` | Yes | **No** | Unlock passcode + proxy adds `X-JobBot-Key` — **must equal** `X_JOBBOT_KEY` on Render |
| `BACKEND_API_URL` | Yes | **No** | Render URL ending in `/api` — used only by Next.js API routes |

> Do **not** use `NEXT_PUBLIC_UI_ACCESS_KEY` or `NEXT_PUBLIC_API_URL` — the browser talks to `/api/backend/*` on the same origin; Vercel proxies to Render with the secret server-side.

---

## Google Custom Search setup

1. **Google Cloud** → enable **Custom Search API** → create API key → restrict to Custom Search API.  
2. **Programmable Search** → create engine **JobBot Jobs** with sites `*.greenhouse.io/*` and `*.lever.co/*` (add separately).  
3. Copy **Search engine ID** → `GOOGLE_SEARCH_CX`.  
4. Set both vars in `backend/.env` and Render.

Without these, web search is skipped; other scrapers still run.

---

## Production deployment

### Backend — Render

1. Connect repo → use `backend/render.yaml` or create a **Web Service** (Python).  
2. **Root directory:** `backend`  
3. **Python version:** `3.11.9` (required — see below)  
4. **Build:** `pip install -r requirements.txt`  
5. **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`  
6. Set all env vars from the table above.  
7. **Important:**
   - `DASHBOARD_URL` = your Vercel URL (no trailing slash)  
   - `CORS_ORIGINS` = same Vercel URL  
   - `X_JOBBOT_KEY` = strong random secret  

Health check path: `/health`

#### Pin Python 3.11 (fixes `pydantic-core` build failures)

New Render services default to **Python 3.14**, which forces Rust builds for `pydantic-core` and often fails. This repo pins **3.11.9** via:

- `backend/.python-version`
- `PYTHON_VERSION=3.11.9` in `render.yaml`

**If the build log still shows `Installing Python version 3.14.x`**, set this manually in Render:

**Dashboard → your service → Environment → Add variable**

| Key | Value |
|-----|--------|
| `PYTHON_VERSION` | `3.11.9` |

Save, then **Clear build cache & deploy**. The next log should show `Installing Python version 3.11.9...`.

### Frontend — Vercel

1. Import repo → **Root directory:** `frontend`  
2. Framework: Next.js (auto-detected)  
3. Environment variables (Production):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
JOBBOT_ACCESS_SECRET=same_long_secret_as_X_JOBBOT_KEY_on_Render
BACKEND_API_URL=https://YOUR-BACKEND.onrender.com/api
```

4. Deploy → open site → unlock with `JOBBOT_ACCESS_SECRET` value.

---

## Pre-deploy checklist

Use this before every release:

- [ ] `BACKEND_API_URL` on Vercel ends with `/api`  
- [ ] `JOBBOT_ACCESS_SECRET` on Vercel === `X_JOBBOT_KEY` on Render  
- [ ] Removed legacy `NEXT_PUBLIC_UI_ACCESS_KEY` from Vercel (if present)  
- [ ] `DASHBOARD_URL` points to live Vercel URL (not localhost)  
- [ ] `CORS_ORIGINS` includes Vercel URL  
- [ ] Google keys set on Render (if using web search)  
- [ ] `GET https://YOUR-BACKEND.onrender.com/health` returns `"database": "connected"`  
- [ ] Unlock dashboard and run **Scan Jobs Now** once  
- [ ] Test on a phone: menu, bottom nav, job cards scroll  

---

## API authentication (production architecture)

```mermaid
sequenceDiagram
  participant Browser
  participant Vercel as Next.js on Vercel
  participant Render as FastAPI on Render
  Browser->>Vercel: POST /api/auth/unlock (passcode)
  Vercel->>Vercel: Set HttpOnly cookie (signed, 30 days)
  Browser->>Vercel: GET /api/backend/profile (cookie)
  Vercel->>Render: GET /api/profile + X-JobBot-Key header
  Render-->>Vercel: JSON
  Vercel-->>Browser: JSON
```

- **Browser** never sees `X_JOBBOT_KEY` or `JOBBOT_ACCESS_SECRET`.
- **Render** only accepts direct calls with `X-JobBot-Key` (added by Vercel proxy).
- **Unlock** compares passcode to `JOBBOT_ACCESS_SECRET` on Vercel only.

Implementation: `frontend/src/pages/api/auth/*` and `frontend/src/pages/api/backend/[...path].js`.

---

## Mobile experience

The UI is responsive:

- **Hamburger menu** + slide-out sidebar on small screens  
- **Bottom navigation** (Home, Jobs, Apps, Profile)  
- **Touch-friendly** inputs and scrollable tables/charts  
- **Safe area** padding for notched phones  

Test with Chrome DevTools → device toolbar or a real phone on the same network.

---

## Email links (`DASHBOARD_URL`)

Backend emails (job alerts, competitions, interview ready, weekly digest) embed links like:

- `{DASHBOARD_URL}/jobs`  
- `{DASHBOARD_URL}/applications`  
- `{DASHBOARD_URL}/interview/{jobId}`  

If `DASHBOARD_URL` is still `http://localhost:3000` in production, email links will be wrong.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **403 on unlock** | `JOBBOT_ACCESS_SECRET` on Vercel must match what you type (and match Render `X_JOBBOT_KEY`) |
| **401 on dashboard** | Session expired — unlock again; check `JOBBOT_ACCESS_SECRET` is set on Vercel |
| **500 on unlock** | `JOBBOT_ACCESS_SECRET` missing on Vercel — add env var and redeploy |
| **Network error / CORS** | Set `CORS_ORIGINS` on Render to your Vercel domain (proxy uses server-side fetch) |
| **502 Backend unavailable** | Render down or wrong `BACKEND_API_URL` on Vercel |
| **Web search skipped** | Set `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_CX`; restart backend |
| **Google 403** | Enable Custom Search API; check key restrictions and daily quota |
| **Emails not sending** | Verify Resend domain / `FROM_EMAIL` |
| **Render: `pydantic-core` / maturin / Rust error** | Set `PYTHON_VERSION` to `3.11.9`; redeploy with cleared build cache |
| **Render: Python 3.14 in build log** | Same — `runtime.txt` is ignored; use `.python-version` or `PYTHON_VERSION` env |

---

## License

Private / personal use — adjust as needed for your deployment.

---

<p align="center">
  Built for autonomous career ops — scan, apply, prep, repeat.
</p>
