from fastapi import APIRouter, BackgroundTasks, HTTPException
from database import get_db
from services.scraper_service import run_scrape_cycle, scrape_and_score_competitions

router = APIRouter()

@router.post("/trigger")
async def trigger_scrape(background_tasks: BackgroundTasks):
    """Manually trigger a job scraping scan in background"""
    background_tasks.add_task(run_scrape_cycle)
    return {"success": True, "message": "Job scrape cycle triggered in background."}

@router.post("/competitions/trigger")
async def trigger_competition_scrape(background_tasks: BackgroundTasks):
    """Manually trigger hackathon and contest scraping scan in background"""
    background_tasks.add_task(scrape_and_score_competitions)
    return {"success": True, "message": "Competition scrape cycle triggered in background."}

@router.get("/logs")
async def get_scrape_logs():
    """Retrieve telemetry log list from past scraping runs"""
    db = get_db()
    res = db.table("scrape_logs").select("*").order("started_at", desc=True).limit(20).execute()
    return {"logs": res.data or []}

@router.get("/status")
async def get_scraper_status():
    """Check scheduling configuration and timestamps of the latest scan runs"""
    db = get_db()
    logs = db.table("scrape_logs").select("*").order("started_at", desc=True).limit(1).execute()
    last_run = logs.data[0] if logs.data else None
    return {
        "scheduler_status": "running",
        "scan_interval_minutes": 30,
        "last_run_details": last_run,
        "active_crawlers": ["internshala", "ncs_portal", "unstop", "web_search", "devfolio"]
    }
