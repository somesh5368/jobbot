"""
JobBot AI - FastAPI Backend
Deploy on Render.com (free tier)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

from routers import jobs, profile, applications, scraper
from services.scraper_service import run_scrape_cycle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start scheduler on startup
    scheduler.add_job(
        run_scrape_cycle,
        trigger=IntervalTrigger(minutes=30),
        id="scrape_cycle",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("✅ Scheduler started — scraping every 30 minutes")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(
    title="JobBot AI",
    description="Automated Job/Internship finder for Somesh Pandey",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your Vercel URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(scraper.router, prefix="/api/scraper", tags=["Scraper"])


@app.get("/")
async def root():
    return {"status": "JobBot AI is live 🚀", "message": "Automated job hunting active"}


@app.get("/health")
async def health():
    return {"status": "ok"}
