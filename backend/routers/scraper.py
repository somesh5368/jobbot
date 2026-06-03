"""Scraper API Router - Manual triggers"""
from fastapi import APIRouter, BackgroundTasks
from database import get_db
from services.scraper_service import run_scrape_cycle

router = APIRouter()


@router.post("/trigger")
async def trigger_scrape(background_tasks: BackgroundTasks):
    """Manually trigger a scrape cycle"""
    background_tasks.add_task(run_scrape_cycle)
    return {"success": True, "message": "Scrape cycle started in background"}


@router.get("/logs")
async def get_scrape_logs():
    db = get_db()
    result = db.table("scrape_logs").select("*").order("started_at", desc=True).limit(20).execute()
    return {"logs": result.data}


@router.get("/status")
async def get_scraper_status():
    db = get_db()
    logs = db.table("scrape_logs").select("*").order("started_at", desc=True).limit(1).execute()
    last_run = logs.data[0] if logs.data else None
    return {
        "scheduler": "active",
        "interval_minutes": 30,
        "last_run": last_run,
        "sources": ["internshala", "ncs_portal", "unstop", "aicte", "drdo"],
    }
