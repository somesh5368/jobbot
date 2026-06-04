"""
JobBot AI v2.0 - FastAPI Backend
Core entrypoint registering routers and APScheduler lifespan hooks
"""
from dotenv import load_dotenv

load_dotenv()

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import get_db


from services.scheduler_service import init_scheduler, shutdown_scheduler
from routers import (
    profile, resume, vault, jobs, applications, 
    competitions, interview, email_router, scraper
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize background scheduler tasks on app startup
    try:
        init_scheduler()
    except Exception as e:
        logger.error(f"Failed starting background scheduler tasks: {e}")
        
    yield
    
    # Shutdown scheduler threads on app termination
    try:
        shutdown_scheduler()
    except Exception as e:
        logger.error(f"Failed during scheduler termination: {e}")

# Security Header validation Key Check
async def verify_jobbot_key(x_jobbot_key: str = Header(None, alias="X-JobBot-Key")):
    expected_key = os.getenv("X_JOBBOT_KEY", "your_secure_backend_access_key").strip()
    if (x_jobbot_key or "").strip() != expected_key:
        raise HTTPException(
            status_code=403, 
            detail="Unauthorized: Invalid or missing X-JobBot-Key header"
        )

app = FastAPI(
    title="JobBot AI",
    description="Your personal 24/7 AI-powered job search agent.",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS (comma-separated origins in CORS_ORIGINS, or * for dev)
_cors_raw = os.getenv("CORS_ORIGINS", "*").strip()
_cors_origins = ["*"] if _cors_raw == "*" else [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routing Modules
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(vault.router, prefix="/api/vault", tags=["Vault"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(competitions.router, prefix="/api/competitions", tags=["Competitions"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(email_router.router, prefix="/api/email", tags=["Email"], dependencies=[Depends(verify_jobbot_key)])
app.include_router(scraper.router, prefix="/api/scan", tags=["Scan"], dependencies=[Depends(verify_jobbot_key)])

@app.get("/")
async def root():
    return {
        "status": "JobBot AI is live 🚀", 
        "version": "2.0.0",
        "description": "Automated B.Tech CSE-AI Career Assistant active."
    }

@app.get("/health")
async def health_check():
    """Verify live status and connectivity to third-party databases"""
    try:
        db = get_db()
        # Verify simple select connectivity
        db.table("profiles").select("id").limit(1).execute()
        return {"status": "ok", "database": "connected", "scheduler": "active"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
