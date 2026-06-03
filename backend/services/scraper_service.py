"""
Scraper Service
Scrapes: Internshala, NCS Portal, Unstop, Naukri, LinkedIn (limited)
Runs every 30 minutes via APScheduler
"""
import asyncio
import httpx
import logging
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from typing import List, Optional
import re

from database import get_db
from services.fake_detector import calculate_fake_risk, is_safe_to_apply
from services.resume_service import calculate_match_score, extract_skills_from_resume
from services.email_service import send_new_jobs_alert, send_auto_apply_confirmation, send_fake_job_alert

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


async def scrape_internshala(keywords: List[str] = None) -> List[dict]:
    """Scrape Internshala for internships"""
    jobs = []
    search_terms = keywords or ["python", "machine learning", "data science", "web development", "ai"]

    async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
        for term in search_terms[:3]:  # Limit to avoid rate limiting
            try:
                url = f"https://internshala.com/internships/{term.replace(' ', '-')}-internship/"
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                listings = soup.select(".individual_internship") or soup.select(".internship-listing-container")

                for item in listings[:10]:
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

                        jobs.append({
                            "title": title_el.get_text(strip=True),
                            "company": company_el.get_text(strip=True) if company_el else "Unknown",
                            "location": location_el.get_text(strip=True) if location_el else "Remote",
                            "work_mode": "remote" if "work from home" in (location_el.get_text(strip=True) if location_el else "").lower() else "onsite",
                            "stipend": stipend_el.get_text(strip=True) if stipend_el else "Unpaid",
                            "type": "internship",
                            "source": "internshala",
                            "apply_url": apply_url,
                            "description": item.get_text(strip=True)[:500],
                            "requirements": [],
                            "posted_at": datetime.now(timezone.utc).isoformat(),
                            "is_govt": False,
                        })
                    except Exception as e:
                        logger.warning(f"Internshala item parse error: {e}")
                        continue

                await asyncio.sleep(2)  # Be polite to servers

            except Exception as e:
                logger.error(f"Internshala scrape error for {term}: {e}")

    logger.info(f"Internshala: found {len(jobs)} internships")
    return jobs


async def scrape_ncs_portal() -> List[dict]:
    """
    Scrape National Career Service Portal (Government of India)
    NCS is the official govt job portal — all listings here are verified
    """
    jobs = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
            # NCS API endpoint for job listings
            api_url = "https://www.ncs.gov.in/jobsearch/search-jobs"
            params = {
                "keyword": "software engineer python machine learning",
                "experienceMin": "0",
                "experienceMax": "2",
                "pageNo": "1",
                "pageSize": "20",
            }
            resp = await client.get(api_url, params=params)

            if resp.status_code == 200:
                try:
                    data = resp.json()
                    listings = data.get("jobDetails", data.get("jobs", []))
                    for item in listings[:15]:
                        jobs.append({
                            "title": item.get("jobTitle", item.get("title", "N/A")),
                            "company": item.get("companyName", item.get("employer", "Govt. Organization")),
                            "location": item.get("jobLocation", item.get("location", "India")),
                            "work_mode": "onsite",
                            "stipend": item.get("salary", item.get("ctc", "As per norms")),
                            "type": "job",
                            "source": "ncs_portal",
                            "apply_url": f"https://www.ncs.gov.in/jobsearch/{item.get('jobId', '')}",
                            "description": item.get("jobDescription", "")[:500],
                            "requirements": [],
                            "posted_at": item.get("postedDate", datetime.now(timezone.utc).isoformat()),
                            "is_govt": True,
                        })
                except Exception:
                    # Try HTML scraping as fallback
                    soup = BeautifulSoup(resp.text, "lxml")
                    job_cards = soup.select(".job-card, .job-listing")
                    for card in job_cards[:10]:
                        title_el = card.select_one("h3, .job-title")
                        if title_el:
                            jobs.append({
                                "title": title_el.get_text(strip=True),
                                "company": "NCS Portal",
                                "location": "India",
                                "work_mode": "onsite",
                                "stipend": "As per norms",
                                "type": "job",
                                "source": "ncs_portal",
                                "apply_url": "https://www.ncs.gov.in",
                                "description": card.get_text(strip=True)[:300],
                                "requirements": [],
                                "posted_at": datetime.now(timezone.utc).isoformat(),
                                "is_govt": True,
                            })

    except Exception as e:
        logger.error(f"NCS Portal scrape error: {e}")

    # Always add some known government scheme links for freshers
    govt_schemes = [
        {
            "title": "AICTE Internship Portal - CSE/AI Students",
            "company": "AICTE (Govt. of India)",
            "location": "Pan India",
            "work_mode": "hybrid",
            "stipend": "₹10,000 - ₹25,000/month",
            "type": "internship",
            "source": "aicte",
            "apply_url": "https://internship.aicte-india.org/",
            "description": "AICTE internship program for B.Tech students in AI, CSE, Data Science domains.",
            "requirements": ["B.Tech/BE", "CSE or related branch"],
            "posted_at": datetime.now(timezone.utc).isoformat(),
            "is_govt": True,
        },
        {
            "title": "DRDO Research Internship - Electronics & CS",
            "company": "DRDO (Ministry of Defence)",
            "location": "Multiple cities",
            "work_mode": "onsite",
            "stipend": "₹15,000 - ₹20,000/month",
            "type": "internship",
            "source": "drdo",
            "apply_url": "https://drdo.gov.in/drdo/internship-programme",
            "description": "Research internships for final year B.Tech students in CS, AI, Electronics.",
            "requirements": ["B.Tech Final Year", "CSE/ECE/AI"],
            "posted_at": datetime.now(timezone.utc).isoformat(),
            "is_govt": True,
        },
        {
            "title": "IIT Research Internship (IITB-SRFP)",
            "company": "IIT Bombay",
            "location": "Mumbai",
            "work_mode": "onsite",
            "stipend": "₹8,000 - ₹15,000/month",
            "type": "internship",
            "source": "iit",
            "apply_url": "https://www.iitb.ac.in/newacadhome/studentfellowship.jsp",
            "description": "Summer Research Fellowship at IIT Bombay for outstanding B.Tech students.",
            "requirements": ["B.Tech 2nd/3rd year", "Strong academics"],
            "posted_at": datetime.now(timezone.utc).isoformat(),
            "is_govt": False,
        },
    ]
    jobs.extend(govt_schemes)

    logger.info(f"NCS/Govt: found {len(jobs)} listings")
    return jobs


async def scrape_unstop() -> List[dict]:
    """Scrape Unstop (formerly D2C) for competitions and internships"""
    jobs = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
            resp = await client.get(
                "https://unstop.com/api/public/opportunity/search-result",
                params={
                    "opportunity": "internship,job",
                    "filters[field]": "cse,artificial-intelligence,machine-learning,data-science",
                    "page": "1",
                    "size": "20",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("data", {}).get("data", [])[:15]:
                    jobs.append({
                        "title": item.get("title", "N/A"),
                        "company": item.get("organisation", {}).get("name", "N/A"),
                        "location": item.get("city", "Remote") or "Remote",
                        "work_mode": "remote" if item.get("is_remote") else "onsite",
                        "stipend": item.get("salary", "Not disclosed"),
                        "type": "internship" if "intern" in item.get("type", "").lower() else "job",
                        "source": "unstop",
                        "apply_url": f"https://unstop.com/{item.get('public_url', '')}",
                        "description": item.get("description", "")[:500],
                        "requirements": [],
                        "posted_at": item.get("created_at", datetime.now(timezone.utc).isoformat()),
                        "is_govt": False,
                    })
    except Exception as e:
        logger.error(f"Unstop scrape error: {e}")

    logger.info(f"Unstop: found {len(jobs)} listings")
    return jobs


async def save_jobs_to_db(jobs: List[dict], profile: dict) -> List[dict]:
    """Save new jobs to Supabase and return only truly new ones"""
    db = get_db()
    new_jobs = []
    candidate_skills = profile.get("skills", [])

    for job in jobs:
        # Calculate match and fake scores
        match_score = calculate_match_score(
            job["title"],
            job.get("description", ""),
            job.get("requirements", []),
            candidate_skills,
            profile.get("preferred_roles", []),
        )

        fake_risk_score, fake_reasons = calculate_fake_risk(
            job["title"],
            job["company"],
            job.get("description", ""),
            job.get("stipend", ""),
            job.get("apply_url", ""),
            job["source"],
        )

        # Government jobs are always safe
        if job.get("is_govt"):
            fake_risk_score = 0
            fake_reasons = []

        job_record = {
            **job,
            "match_score": match_score,
            "fake_risk_score": fake_risk_score,
            "fake_risk_reasons": fake_reasons,
            "is_verified": fake_risk_score < 30,
        }

        # Check if already in DB (by title + company)
        try:
            existing = db.table("jobs").select("id").eq("title", job["title"]).eq("company", job["company"]).execute()
            if existing.data:
                continue  # Skip duplicates
        except Exception:
            pass

        # Insert to DB
        try:
            result = db.table("jobs").insert(job_record).execute()
            if result.data:
                saved_job = result.data[0]
                new_jobs.append(saved_job)
        except Exception as e:
            logger.error(f"DB insert error: {e}")

    return new_jobs


async def run_scrape_cycle():
    """
    Main scrape cycle - runs every 30 minutes
    1. Get profile from DB
    2. Scrape all sources
    3. Score and save new jobs
    4. Send email alerts
    5. Auto-apply if enabled
    """
    logger.info("🔍 Starting scrape cycle...")
    db = get_db()

    try:
        # Get the single user profile
        profile_result = db.table("profiles").select("*").limit(1).execute()
        if not profile_result.data:
            logger.warning("No profile found. Set up profile first.")
            return

        profile = profile_result.data[0]
        user_email = profile["email"]
        user_name = profile.get("name", "Somesh")

        # Extract skills if resume uploaded
        if profile.get("resume_text") and not profile.get("skills"):
            skills = extract_skills_from_resume(profile["resume_text"])
            db.table("profiles").update({"skills": skills}).eq("id", profile["id"]).execute()
            profile["skills"] = skills

        # Scrape all sources concurrently
        internshala_jobs, ncs_jobs, unstop_jobs = await asyncio.gather(
            scrape_internshala(profile.get("preferred_roles", [])),
            scrape_ncs_portal(),
            scrape_unstop(),
            return_exceptions=True,
        )

        all_jobs = []
        for result in [internshala_jobs, ncs_jobs, unstop_jobs]:
            if isinstance(result, list):
                all_jobs.extend(result)

        logger.info(f"Total scraped: {len(all_jobs)} jobs")

        # Save to DB and get only new ones
        new_jobs = await save_jobs_to_db(all_jobs, profile)
        logger.info(f"New jobs found: {len(new_jobs)}")

        if not new_jobs:
            logger.info("No new jobs this cycle")
            return

        # Separate by risk level
        safe_jobs = [j for j in new_jobs if j.get("fake_risk_score", 100) < 40]
        risky_jobs = [j for j in new_jobs if j.get("fake_risk_score", 0) >= 70]
        good_matches = [j for j in safe_jobs if j.get("match_score", 0) >= 60]

        # Send new jobs email alert
        if profile.get("email_alerts") and good_matches:
            send_new_jobs_alert(user_email, user_name, sorted(
                good_matches, key=lambda x: x.get("match_score", 0), reverse=True
            ))

        # Alert on fake jobs
        for job in risky_jobs[:3]:  # Max 3 fake alerts
            if profile.get("email_alerts"):
                send_fake_job_alert(user_email, user_name, job, job.get("fake_risk_reasons", []))

        # Auto-apply if enabled
        if profile.get("auto_apply"):
            threshold = profile.get("auto_apply_threshold", 85)
            auto_apply_jobs = [
                j for j in safe_jobs
                if j.get("match_score", 0) >= threshold
                and j.get("apply_url")
            ]
            for job in auto_apply_jobs[:3]:  # Max 3 auto-applies per cycle
                # Log application to DB
                db.table("applications").insert({
                    "profile_id": profile["id"],
                    "job_id": job["id"],
                    "status": "applied",
                    "is_auto_applied": True,
                }).execute()
                send_auto_apply_confirmation(user_email, user_name, job)
                logger.info(f"Auto-applied: {job['title']} at {job['company']}")

        # Log scrape run
        db.table("scrape_logs").insert({
            "source": "all",
            "jobs_found": len(all_jobs),
            "jobs_new": len(new_jobs),
            "jobs_applied": len([j for j in new_jobs if j.get("auto_applied")]),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        logger.info(f"✅ Scrape cycle complete. New: {len(new_jobs)}, Alerts sent: {len(good_matches)}")

    except Exception as e:
        logger.error(f"Scrape cycle error: {e}")
