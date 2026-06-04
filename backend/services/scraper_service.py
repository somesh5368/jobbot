import asyncio
import httpx
import logging
import os
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from bs4 import BeautifulSoup
from database import get_db
from services.ai_service import score_job_match, score_competition_relevance
from services.email_service import send_job_match_email, send_competition_email, send_fake_job_alert, send_auto_apply_confirmation

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
GOOGLE_SEARCH_CX = os.getenv("GOOGLE_SEARCH_CX")

# --- Direct Scrapers (Jobs & Internships) ---

async def scrape_internshala(keywords: List[str] = None) -> List[dict]:
    """Scrape Internshala for fresh internships"""
    jobs = []
    search_terms = keywords or ["python", "machine learning", "data science", "web development", "ai"]
    
    async with httpx.AsyncClient(headers=HEADERS, timeout=15.0, follow_redirects=True) as client:
        # Limit to first 2 keywords to keep execution time and server load reasonable
        for term in search_terms[:2]:
            try:
                url = f"https://internshala.com/internships/{term.replace(' ', '-')}-internship/"
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                
                soup = BeautifulSoup(resp.text, "lxml")
                listings = soup.select(".individual_internship") or soup.select(".internship-listing-container")
                
                for item in listings[:8]:
                    try:
                        title_el = item.select_one(".internship-heading a, .profile a")
                        company_el = item.select_one(".company-name a, .company_name")
                        location_el = item.select_one(".locations span, .location_names")
                        stipend_el = item.select_one(".stipend, .stipend_salary")
                        link_el = item.select_one("a.internship-heading-container, .internship-heading a")
                        
                        if not title_el:
                            continue
                        
                        href = link_el.get("href", "") if link_el else ""
                        apply_url = f"https://internshala.com{href}" if href.startswith("/") else href
                        
                        location = location_el.get_text(strip=True) if location_el else "Remote"
                        work_mode = "remote" if "work from home" in location.lower() else "onsite"
                        
                        jobs.append({
                            "title": title_el.get_text(strip=True),
                            "company": company_el.get_text(strip=True) if company_el else "Unknown Company",
                            "location": location,
                            "job_type": "internship",
                            "source": "internshala",
                            "source_url": apply_url,
                            "description": item.get_text(strip=True)[:500],
                            "requirements": [],
                            "stipend_or_salary": stipend_el.get_text(strip=True) if stipend_el else "Unpaid",
                            "duration": "1-6 Months",
                            "posted_date": datetime.utcnow().date().isoformat(),
                            "deadline": None
                        })
                    except Exception as e:
                        logger.warning(f"Failed parsing individual Internshala item: {e}")
                        continue
                await asyncio.sleep(1.0)
            except Exception as e:
                logger.error(f"Error crawling Internshala for '{term}': {e}")
    return jobs

async def scrape_ncs_portal() -> List[dict]:
    """Scrape NCS Portal (Government of India job feeds)"""
    jobs = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
            api_url = "https://www.ncs.gov.in/jobsearch/search-jobs"
            params = {
                "keyword": "software engineer python machine learning",
                "experienceMin": "0",
                "experienceMax": "2",
                "pageNo": "1",
                "pageSize": "15",
            }
            resp = await client.get(api_url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                listings = data.get("jobDetails", data.get("jobs", []))
                for item in listings[:10]:
                    jobs.append({
                        "title": item.get("jobTitle", "Software Engineer"),
                        "company": item.get("companyName", "NCS Verified Employer"),
                        "location": item.get("jobLocation", "India"),
                        "job_type": "fulltime",
                        "source": "ncs_portal",
                        "source_url": f"https://www.ncs.gov.in/jobsearch/{item.get('jobId', '')}",
                        "description": item.get("jobDescription", "")[:500],
                        "requirements": [],
                        "stipend_or_salary": item.get("salary", "As per norms"),
                        "posted_date": datetime.utcnow().date().isoformat(),
                        "deadline": None
                    })
    except Exception as e:
        logger.error(f"Error scraping NCS portal: {e}")
    return jobs

async def scrape_unstop_opportunities() -> List[dict]:
    """Scrape Unstop API for jobs and internships"""
    jobs = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
            resp = await client.get(
                "https://unstop.com/api/public/opportunity/search-result",
                params={
                    "opportunity": "internship,job",
                    "filters[field]": "cse,artificial-intelligence,machine-learning,data-science",
                    "page": "1",
                    "size": "15",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", {}).get("data", [])
                for item in items[:10]:
                    jobs.append({
                        "title": item.get("title", "N/A"),
                        "company": item.get("organisation", {}).get("name", "Unstop Partner"),
                        "location": item.get("city", "Remote") or "Remote",
                        "job_type": "internship" if "intern" in item.get("type", "").lower() else "fulltime",
                        "source": "unstop",
                        "source_url": f"https://unstop.com/{item.get('public_url', '')}",
                        "description": item.get("description", "")[:500],
                        "requirements": [],
                        "stipend_or_salary": item.get("salary", "Not Disclosed"),
                        "posted_date": datetime.utcnow().date().isoformat(),
                        "deadline": item.get("reg_end_date")
                    })
    except Exception as e:
        logger.error(f"Error scraping Unstop opportunities: {e}")
    return jobs

# --- Tier 2: AI Google Search Crawler ---

async def scrape_web_search_jobs(preferred_roles: List[str], skills: List[str]) -> List[dict]:
    """Leverage Google Search API to find job listings from lever, greenhouse, and startup portals"""
    jobs = []
    if not GOOGLE_SEARCH_API_KEY or not GOOGLE_SEARCH_CX:
        logger.warning("Google Custom Search credentials missing. Skipping web search crawl.")
        return jobs

    # Formulate a search query targeting fresh engineer roles
    role = preferred_roles[0] if preferred_roles else "software engineering intern"
    query = f'"{role}" site:greenhouse.io OR site:lever.co India "2026"'
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "key": GOOGLE_SEARCH_API_KEY,
                    "cx": GOOGLE_SEARCH_CX,
                    "q": query,
                    "num": 5
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                search_items = data.get("items", [])
                for item in search_items:
                    link = item.get("link", "")
                    title = item.get("title", "")
                    snippet = item.get("snippet", "")
                    
                    # Extract company name from Greenhouse/Lever page titles
                    # E.g., "Software Engineer - Google at Greenhouse" -> Google
                    company_match = re.search(r'at\s+([^-\|]+)', title)
                    company = company_match.group(1).strip() if company_match else "Google Search Result"
                    
                    jobs.append({
                        "title": title.split("-")[0].strip(),
                        "company": company,
                        "location": "India",
                        "job_type": "fulltime" if "intern" not in title.lower() else "internship",
                        "source": "web_search",
                        "source_url": link,
                        "description": snippet,
                        "requirements": [],
                        "stipend_or_salary": "As per market rates",
                        "posted_date": datetime.utcnow().date().isoformat(),
                        "deadline": None
                    })
    except Exception as e:
        logger.error(f"Error crawling Google Custom Search: {e}")
    return jobs

# --- Pipeline Core Matches Loader ---

async def evaluate_and_save_jobs(jobs: List[dict], profile: dict) -> List[dict]:
    """Score scraped jobs using Claude matching and save new entries to database"""
    db = get_db()
    new_saved_jobs = []

    for job in jobs:
        # Check if already present to avoid duplicate token costs
        try:
            existing = db.table("jobs").select("id").eq("source_url", job["source_url"]).execute()
            if existing.data:
                continue
        except Exception as e:
            logger.warning(f"Error running duplicate URL check: {e}")
            
        # Call Claude AI match evaluation
        try:
            eval_result = await score_job_match(profile_data=profile, job_data=job)
            
            # Form complete job row
            job_record = {
                "title": job["title"],
                "company": job["company"],
                "location": job["location"],
                "job_type": job["job_type"],
                "source": job["source"],
                "source_url": job["source_url"],
                "description": job["description"],
                "requirements": job["requirements"],
                "skills_required": eval_result.get("skill_gaps", []),
                "stipend_or_salary": job["stipend_or_salary"],
                "duration": job.get("duration"),
                "deadline": job["deadline"],
                "posted_date": job["posted_date"],
                "match_score": eval_result.get("match_score", 0),
                "match_reasons": eval_result.get("match_reasons", []),
                "fake_risk_score": eval_result.get("fake_risk_score", 0),
                "fake_risk_reasons": eval_result.get("fake_risk_reasons", []),
                "status": "new",
                "ai_summary": eval_result.get("summary", ""),
                "is_verified": eval_result.get("fake_risk_score", 100) < 30
            }
            
            # Save to Database
            insert_resp = db.table("jobs").insert(job_record).execute()
            if insert_resp.data:
                new_saved_jobs.append(insert_resp.data[0])
                
        except Exception as e:
            logger.error(f"Error matching/saving job '{job.get('title')}': {e}")
            
    return new_saved_jobs

async def run_scrape_cycle():
    """Main scheduler job triggered every 30 minutes to scan, evaluate, email, and apply"""
    logger.info("🔍 Scraper run starting...")
    db = get_db()
    
    try:
        # Load user profile
        profile_res = db.table("profiles").select("*").limit(1).execute()
        if not profile_res.data:
            logger.warning("No profile found. Setup profile configuration first.")
            return
            
        profile = profile_res.data[0]
        user_email = profile["email"]
        user_name = profile["full_name"]
        
        # Crawl sources concurrently
        internshala_task = scrape_internshala(profile.get("preferred_roles", []))
        ncs_task = scrape_ncs_portal()
        unstop_task = scrape_unstop_opportunities()
        web_task = scrape_web_search_jobs(profile.get("preferred_roles", []), profile.get("skills", []))
        
        results = await asyncio.gather(
            internshala_task,
            ncs_task,
            unstop_task,
            web_task,
            return_exceptions=True
        )
        
        all_jobs = []
        for res in results:
            if isinstance(res, list):
                all_jobs.extend(res)
            else:
                logger.error(f"Scraper subtask failed with exception: {res}")
                
        logger.info(f"Scraped a total of {len(all_jobs)} jobs.")
        
        # Clean, match, and write
        new_jobs = await evaluate_and_save_jobs(all_jobs, profile)
        logger.info(f"Saved {len(new_jobs)} brand new jobs.")
        
        if not new_jobs:
            return
            
        # Process and Dispatch alerts
        for job in new_jobs:
            # 1. Suspicious fraudulent jobs alerts
            if job["fake_risk_score"] >= 70:
                # Mark ignored automatically
                db.table("jobs").update({"status": "ignored"}).eq("id", job["id"]).execute()
                if profile.get("email_alerts_enabled"):
                    send_fake_job_alert(user_email, user_name, job, job["fake_risk_reasons"])
                continue
                
            # 2. Match threshold notification alerts
            if profile.get("email_alerts_enabled") and job["match_score"] >= profile.get("alert_threshold", 60):
                send_job_match_email(user_email, user_name, job)
                db.table("jobs").update({"email_sent": True}).eq("id", job["id"]).execute()
                
            # 3. Auto-Apply loops
            if profile.get("auto_apply_enabled") and job["match_score"] >= profile.get("auto_apply_threshold", 85) and job["is_verified"]:
                # Create Application
                app_data = {
                    "profile_id": profile["id"],
                    "job_id": job["id"],
                    "applied_method": "auto",
                    "application_status": "applied",
                    "applied_date": datetime.utcnow().date().isoformat()
                }
                app_res = db.table("applications").insert(app_data).execute()
                if app_res.data:
                    # Update job status
                    db.table("jobs").update({"status": "applied"}).eq("id", job["id"]).execute()
                    send_auto_apply_confirmation(user_email, user_name, job)
                    
                    # Generate ATS resume and Interview Prep in background
                    # E.g. trigger internal functions asynchronously
                    asyncio.create_task(trigger_background_prep(profile, job, app_res.data[0]["id"]))
                    
        # Log telemetry log entry
        db.table("scrape_logs").insert({
            "source": "all",
            "jobs_found": len(all_jobs),
            "jobs_new": len(new_jobs),
            "jobs_applied": len([j for j in new_jobs if j.get("status") == "applied"]),
            "finished_at": datetime.utcnow().isoformat()
        }).execute()
        
    except Exception as e:
        logger.error(f"Error in scraping cycle pipeline execution: {e}")

async def trigger_background_prep(profile: dict, job: dict, application_id: str):
    """Async trigger to rewrite resume for ATS and build interview guides"""
    try:
        from services.resume_service import generate_ats_resume_and_save
        from routers.interview import generate_prep_for_job
        
        # 1. ATS resume rewrite
        await generate_ats_resume_and_save(job_id=job["id"])
        # 2. Prep guides compilation
        await generate_prep_for_job(job_id=job["id"], application_id=application_id)
        
        logger.info(f"Successfully processed background ATS + Prep packages for application: {application_id}")
    except Exception as e:
        logger.error(f"Failed running background tasks trigger: {e}")

# --- MODULE G: Competitions Scraper & Score ---

async def scrape_devfolio_competitions() -> List[dict]:
    """Scrape Devfolio active hackathons via public search API"""
    competitions = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
            # Devfolio JSON query endpoint
            resp = await client.get("https://api.devfolio.co/api/hackathons?page=1&limit=15")
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("hackathons", []) or data.get("data", [])
                for item in items[:10]:
                    deadline_str = item.get("applications_close")
                    deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00')).date().isoformat() if deadline_str else None
                    
                    competitions.append({
                        "title": item.get("name", "Devfolio Hackathon"),
                        "organizer": item.get("organizer", {}).get("name", "Community Host"),
                        "competition_type": "hackathon",
                        "domains": [tag.get("name") for tag in item.get("tags", [])] if item.get("tags") else ["Web Dev", "Blockchain", "AI"],
                        "source_url": f"https://{item.get('slug', '')}.devfolio.co",
                        "description": item.get("tagline", "")[:300],
                        "prizes": "Swags & Cash Prizes",
                        "eligibility": "Open for all students",
                        "registration_deadline": deadline,
                        "competition_date": None,
                        "team_size": "1-4 members",
                        "is_online": item.get("is_online", True)
                    })
    except Exception as e:
        logger.error(f"Error scraping Devfolio competitions: {e}")
    return competitions

async def scrape_unstop_competitions() -> List[dict]:
    """Scrape Unstop public API for active hackathons"""
    competitions = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
            resp = await client.get(
                "https://unstop.com/api/public/opportunity/search-result",
                params={
                    "opportunity": "competitions",
                    "filters[field]": "cse,artificial-intelligence,machine-learning,data-science",
                    "page": "1",
                    "size": "15",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", {}).get("data", [])
                for item in items[:10]:
                    competitions.append({
                        "title": item.get("title", "Hackathon Challenge"),
                        "organizer": item.get("organisation", {}).get("name", "Host"),
                        "competition_type": "hackathon" if "hack" in item.get("type", "").lower() else "coding_contest",
                        "domains": ["CSE", "Algorithms"],
                        "source_url": f"https://unstop.com/{item.get('public_url', '')}",
                        "description": item.get("description", "")[:300],
                        "prizes": item.get("prizes_description", "Cash Prizes & certificates"),
                        "eligibility": "College Students",
                        "registration_deadline": item.get("reg_end_date"),
                        "competition_date": None,
                        "team_size": "2-4 members",
                        "is_online": True
                    })
    except Exception as e:
        logger.error(f"Error scraping Unstop competitions: {e}")
    return competitions

async def scrape_and_score_competitions():
    """Daily scheduler cycle to crawl hackathons and record AI relevance grades"""
    logger.info("🏆 Compiling active hackathons...")
    db = get_db()
    
    try:
        profile_res = db.table("profiles").select("*").limit(1).execute()
        if not profile_res.data:
            return
            
        profile = profile_res.data[0]
        user_email = profile["email"]
        user_name = profile["full_name"]
        
        devfolio_list = await scrape_devfolio_competitions()
        unstop_list = await scrape_unstop_competitions()
        
        all_comps = devfolio_list + unstop_list
        logger.info(f"Discovered {len(all_comps)} active contests.")
        
        for comp in all_comps:
            # Check unique source_url
            existing = db.table("competitions").select("id").eq("source_url", comp["source_url"]).execute()
            if existing.data:
                continue
                
            # Score
            eval_res = await score_competition_relevance(profile_data=profile, comp_data=comp)
            
            comp_record = {
                "profile_id": profile["id"],
                "title": comp["title"],
                "organizer": comp["organizer"],
                "competition_type": comp["competition_type"],
                "domains": comp["domains"],
                "source_url": comp["source_url"],
                "description": comp["description"],
                "prizes": comp["prizes"],
                "eligibility": comp["eligibility"],
                "registration_deadline": comp["registration_deadline"],
                "competition_date": comp["competition_date"],
                "team_size": comp["team_size"],
                "is_online": comp["is_online"],
                "relevance_score": eval_res.get("relevance_score", 0),
                "status": "upcoming",
                "registration_status": "not_registered",
                "email_sent": False
            }
            
            insert_res = db.table("competitions").insert(comp_record).execute()
            if insert_res.data:
                saved_comp = insert_res.data[0]
                # Email alert trigger
                if saved_comp["relevance_score"] >= 70 and profile.get("email_alerts_enabled"):
                    send_competition_email(user_email, user_name, saved_comp)
                    db.table("competitions").update({"email_sent": True}).eq("id", saved_comp["id"]).execute()
                    
    except Exception as e:
        logger.error(f"Error inside daily competitions scraping cycle: {e}")
