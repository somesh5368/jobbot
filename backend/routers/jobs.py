from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from database import get_db
from models.job import JobResponse
from services.scraper_service import trigger_background_prep
from services.email_service import send_auto_apply_confirmation

router = APIRouter()

class ApplyRequest(BaseModel):
    method: Optional[str] = "manual"  # 'manual' | 'auto'
    notes: Optional[str] = None

@router.get("/")
async def get_jobs(
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    source: Optional[str] = None,
    min_match: int = 0,
    max_risk: int = 100,
    limit: int = 50,
    offset: int = 0,
):
    """Fetch paginated job lists filtered by matching or status configurations"""
    db = get_db()
    query = db.table("jobs").select("*")
    
    if status:
        query = query.eq("status", status)
    if job_type:
        query = query.eq("job_type", job_type)
    if source:
        query = query.eq("source", source)
    if min_match > 0:
        query = query.gte("match_score", min_match)
    if max_risk < 100:
        query = query.lte("fake_risk_score", max_risk)
        
    res = query.order("posted_date", desc=True).range(offset, offset + limit - 1).execute()
    jobs = res.data or []
    return {"jobs": jobs, "total": len(jobs)}

@router.get("/{id}", response_model=JobResponse)
async def get_job_detail(id: UUID):
    """Retrieve full detail specification for a single scraped job listing"""
    db = get_db()
    res = db.table("jobs").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job record not found.")
    return res.data[0]

@router.post("/{id}/save")
async def save_job(id: UUID):
    """Mark a scraped job card status as 'saved' for future reviews"""
    db = get_db()
    res = db.table("jobs").update({"status": "saved"}).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"success": True, "job": res.data[0]}

@router.post("/{id}/ignore")
async def ignore_job(id: UUID):
    """Ignore a job listing card, excluding it from matched results"""
    db = get_db()
    res = db.table("jobs").update({"status": "ignored"}).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"success": True, "job": res.data[0]}

@router.post("/{id}/apply")
async def apply_to_job(id: UUID, req: ApplyRequest, background_tasks: BackgroundTasks):
    """Log application event, create tracker row, and generate ATS materials in background"""
    db = get_db()
    
    # Check job validity
    job_res = db.table("jobs").select("*").eq("id", str(id)).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found.")
    job = job_res.data[0]
    
    # Load profile details
    profile_res = db.table("profiles").select("*").limit(1).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not set. Upload master resume first.")
    profile = profile_res.data[0]
    
    # Create application tracker record
    app_record = {
        "profile_id": profile["id"],
        "job_id": str(id),
        "applied_method": req.method,
        "application_status": "applied",
        "applied_date": datetime.utcnow().date().isoformat(),
        "notes": req.notes
    }
    
    # Check if application already logged
    existing_app = db.table("applications").select("id").eq("job_id", str(id)).execute()
    if existing_app.data:
        raise HTTPException(status_code=400, detail="An application is already registered for this job.")
        
    app_res = db.table("applications").insert(app_record).execute()
    if not app_res.data:
        raise HTTPException(status_code=500, detail="Failed to log application record in database.")
    application_id = app_res.data[0]["id"]
    
    # Mark job status as applied
    db.table("jobs").update({"status": "applied"}).eq("id", str(id)).execute()
    
    # Queue ATS resume compile + Prep guides build as non-blocking tasks
    background_tasks.add_task(trigger_background_prep, profile, job, application_id)
    
    # Dispatch Resend confirmations
    background_tasks.add_task(send_auto_apply_confirmation, profile["email"], profile["full_name"], job)
    
    return {"success": True, "application_id": application_id}
