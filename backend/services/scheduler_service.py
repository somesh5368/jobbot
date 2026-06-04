import logging
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from database import get_db
from services.email_service import send_weekly_digest_email

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def run_weekly_digest_cycle():
    """
    Weekly digest cron - runs every Sunday at 9:00 AM
    Gathers metrics, top jobs, deadlines, and notifications
    """
    logger.info("📊 Running weekly digest compilation...")
    db = get_db()
    
    try:
        # Fetch the user profile
        profile_res = db.table("profiles").select("*").limit(1).execute()
        if not profile_res.data:
            logger.warning("No profile found for weekly digest.")
            return
        
        profile = profile_res.data[0]
        user_email = profile["email"]
        user_name = profile["full_name"]
        
        # Calculate time windows (past 7 days)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
        # Gather Stats
        # 1. Total jobs scraped in last 7 days
        jobs_res = db.table("jobs").select("id", count="exact").filter("scraped_at", "gte", seven_days_ago).execute()
        jobs_scraped_count = len(jobs_res.data) if jobs_res.data else 0
        
        # 2. Total applications in last 7 days
        apps_res = db.table("applications").select("id", count="exact").filter("applied_date", "gte", seven_days_ago[:10]).execute()
        apps_count = len(apps_res.data) if apps_res.data else 0
        
        # 3. Interviews scheduled (any time in future or past week)
        interviews_res = db.table("applications").select("id").eq("application_status", "interview_scheduled").execute()
        interviews_count = len(interviews_res.data) if interviews_res.data else 0
        
        stats = {
            "scraped": jobs_scraped_count,
            "applied": apps_count,
            "interviews": interviews_count
        }
        
        # Fetch Top Matches (safe jobs with match_score >= 70, status = 'new')
        top_jobs_res = db.table("jobs")\
            .select("id", "title", "company", "location", "match_score")\
            .eq("status", "new")\
            .filter("match_score", "gte", 70)\
            .order("match_score", desc=True)\
            .limit(3)\
            .execute()
        
        top_jobs = top_jobs_res.data or []
        
        # Fetch Upcoming Competitions (deadline >= today)
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        comps_res = db.table("competitions")\
            .select("id", "title", "organizer", "registration_deadline")\
            .filter("registration_deadline", "gte", today_str)\
            .order("registration_deadline", desc=False)\
            .limit(3)\
            .execute()
            
        competitions = comps_res.data or []
        
        # Fetch applications needing follow-up (applied >= 7 days ago, status='applied', follow_up_sent=false)
        seven_days_ago_date = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')
        follow_ups_res = db.table("applications")\
            .select("id", "applied_date", "job:jobs(title, company)")\
            .eq("application_status", "applied")\
            .eq("follow_up_sent", False)\
            .filter("applied_date", "lte", seven_days_ago_date)\
            .execute()
            
        follow_ups = follow_ups_res.data or []
        
        # Dispatch email
        if jobs_scraped_count > 0 or apps_count > 0 or competitions or follow_ups:
            send_weekly_digest_email(
                to_email=user_email,
                recipient_name=user_name,
                stats=stats,
                top_jobs=top_jobs,
                competitions=competitions,
                follow_ups=follow_ups
            )
            logger.info("Weekly digest email sent successfully.")
        else:
            logger.info("No activity this week, skipping digest email.")
            
    except Exception as e:
        logger.error(f"Error compiling weekly digest: {e}")

async def run_competition_scrape_cycle():
    """Trigger daily competition scraper runs"""
    logger.info("🏆 Starting daily competition scrape cycle...")
    try:
        from services.scraper_service import scrape_and_score_competitions
        await scrape_and_score_competitions()
        logger.info("✅ Daily competition scrape completed.")
    except Exception as e:
        logger.error(f"Error running daily competition scraper: {e}")

def init_scheduler():
    """Set up and trigger background scheduler threads"""
    from services.scraper_service import run_scrape_cycle
    
    # 1. Job scraping cycle: Runs every 30 minutes
    scheduler.add_job(
        run_scrape_cycle,
        trigger=IntervalTrigger(minutes=30),
        id="job_scrape_cycle",
        replace_existing=True,
        max_instances=1
    )
    
    # 2. Competition scraping cycle: Runs daily at 1:00 AM IST
    scheduler.add_job(
        run_competition_scrape_cycle,
        trigger=CronTrigger(hour=1, minute=0),
        id="competition_scrape_cycle",
        replace_existing=True,
        max_instances=1
    )
    
    # 3. Weekly digest email: Runs every Sunday at 9:00 AM IST
    scheduler.add_job(
        run_weekly_digest_cycle,
        trigger=CronTrigger(day_of_week="sun", hour=9, minute=0),
        id="weekly_digest_cycle",
        replace_existing=True,
        max_instances=1
    )
    
    scheduler.start()
    logger.info("✅ APScheduler initiated: Job Scrape (30m), Competitions (Daily), Weekly Digest (Sunday 9am)")

def shutdown_scheduler():
    """Stop the scheduler threads"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown complete.")
