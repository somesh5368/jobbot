from fastapi import APIRouter, HTTPException, BackgroundTasks
from uuid import UUID
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict
from database import get_db
from models.application import ApplicationResponse, ApplicationWithJobResponse, ApplicationUpdate, ApplicationStats
from services.email_service import send_follow_up_reminder_email, send_interview_prep_email
from services.ai_service import generate_follow_up_email_draft

router = APIRouter()

@router.get("/", response_model=List[ApplicationWithJobResponse])
async def list_applications():
    """List all tracked job applications with their corresponding job card details"""
    db = get_db()
    res = db.table("applications").select("*, job:jobs(*)").order("applied_date", desc=True).execute()
    return res.data or []

@router.get("/stats")
async def get_application_analytics():
    """Compile application outcome ratios, response times, weekly trends, and source counts"""
    db = get_db()
    
    # Load all application rows with job sources
    res = db.table("applications").select("*, job:jobs(source, match_score)").execute()
    apps = res.data or []
    
    total = len(apps)
    if total == 0:
        return {
            "total_applied": 0,
            "shortlisted": 0,
            "offers": 0,
            "rejections": 0,
            "response_rate": 0.0,
            "avg_days_to_response": None,
            "applications_by_source": {},
            "match_score_correlation": [],
            "weekly_trend": []
        }
        
    shortlisted = sum(1 for a in apps if a["application_status"] in ["shortlisted", "interview_scheduled"])
    offers = sum(1 for a in apps if a["application_status"] == "offered")
    rejections = sum(1 for a in apps if a["application_status"] == "rejected")
    
    # Response rate: applications that are not still in the baseline 'applied' state
    responded_apps = [a for a in apps if a["application_status"] != "applied"]
    responded_count = len(responded_apps)
    response_rate = round((responded_count / total) * 100, 2)
    
    # Avg days to response
    avg_days = None
    if responded_count > 0:
        total_days = 0
        valid_counts = 0
        for app in responded_apps:
            try:
                app_date = datetime.strptime(app["applied_date"], "%Y-%m-%d")
                updated_date = datetime.fromisoformat(app["updated_at"].replace('Z', '+00:00')).replace(tzinfo=None)
                delta = (updated_date - app_date).days
                total_days += max(0, delta)
                valid_counts += 1
            except Exception:
                continue
        if valid_counts > 0:
            avg_days = round(total_days / valid_counts, 1)
            
    # Group by source
    by_source = {}
    for app in apps:
        src = app.get("job", {}).get("source", "unknown") if app.get("job") else "unknown"
        by_source[src] = by_source.get(src, 0) + 1
        
    # Match score buckets correlation
    # Buckets: 60-70, 70-80, 80-90, 90-100
    buckets = {"60-70": [0, 0], "70-80": [0, 0], "80-90": [0, 0], "90-100": [0, 0]}
    for app in apps:
        if not app.get("job"):
            continue
        score = app["job"].get("match_score", 0)
        responded = app["application_status"] != "applied"
        
        b_key = None
        if 60 <= score < 70:
            b_key = "60-70"
        elif 70 <= score < 80:
            b_key = "70-80"
        elif 80 <= score < 90:
            b_key = "80-90"
        elif 90 <= score <= 100:
            b_key = "90-100"
            
        if b_key:
            buckets[b_key][0] += 1  # Total apps in bucket
            if responded:
                buckets[b_key][1] += 1  # Responded apps in bucket
                
    correlation = []
    for bucket, counts in buckets.items():
        rate = round((counts[1] / counts[0]) * 100, 2) if counts[0] > 0 else 0.0
        correlation.append({"match_score_bucket": bucket, "response_rate": rate})
        
    # Weekly trend (last 4 weeks)
    weekly_trend = []
    today = date.today()
    for w in range(4):
        start_date = today - timedelta(days=(w+1)*7)
        end_date = today - timedelta(days=w*7)
        count = sum(1 for a in apps if start_date <= datetime.strptime(a["applied_date"], "%Y-%m-%d").date() < end_date)
        weekly_trend.insert(0, {
            "week": f"{start_date.strftime('%d %b')} - {end_date.strftime('%d %b')}",
            "applied_count": count
        })

    return {
        "total_applied": total,
        "shortlisted": shortlisted,
        "offers": offers,
        "rejections": rejections,
        "response_rate": response_rate,
        "avg_days_to_response": avg_days,
        "applications_by_source": by_source,
        "match_score_correlation": correlation,
        "weekly_trend": weekly_trend
    }

@router.get("/{id}", response_model=ApplicationWithJobResponse)
async def get_application_detail(id: UUID):
    """Retrieve full detail for a single tracked application"""
    db = get_db()
    res = db.table("applications").select("*, job:jobs(*)").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application tracker record not found.")
    return res.data[0]

@router.put("/{id}", response_model=ApplicationResponse)
async def update_application_status(id: UUID, app_update: ApplicationUpdate, background_tasks: BackgroundTasks):
    """Update application parameters. If status becomes interview_scheduled, prep guides get emailed."""
    db = get_db()
    
    # Verify application exists
    existing = db.table("applications").select("*, job:jobs(*)").eq("id", str(id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Application record not found.")
    app = existing.data[0]
    
    update_data = app_update.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    # Cast dates to strings
    if "applied_date" in update_data and update_data["applied_date"]:
        update_data["applied_date"] = update_data["applied_date"].isoformat()
    if "follow_up_date" in update_data and update_data["follow_up_date"]:
        update_data["follow_up_date"] = update_data["follow_up_date"].isoformat()
    if "interview_date" in update_data and update_data["interview_date"]:
        update_data["interview_date"] = update_data["interview_date"].isoformat()
        
    res = db.table("applications").update(update_data).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update database row.")
        
    # Trigger interview prep ready notification email if status changes
    if app_update.application_status == "interview_scheduled" and app.get("application_status") != "interview_scheduled":
        # Check prep checklist existence
        prep_res = db.table("interview_prep").select("*").eq("application_id", str(id)).execute()
        if prep_res.data:
            # Query user email
            profile_res = db.table("profiles").select("email, full_name").eq("id", app["profile_id"]).execute()
            if profile_res.data:
                profile = profile_res.data[0]
                background_tasks.add_task(
                    send_interview_prep_email,
                    profile["email"],
                    profile["full_name"],
                    app["job"],
                    prep_res.data[0]
                )
                
    return res.data[0]

@router.post("/{id}/follow-up")
async def trigger_follow_up_reminder(id: UUID, background_tasks: BackgroundTasks):
    """Compile custom follow-up message using Claude and dispatch notification email"""
    db = get_db()
    
    # Load application and job details
    res = db.table("applications").select("*, job:jobs(*)").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application record not found.")
    app = res.data[0]
    
    if not app.get("job"):
        raise HTTPException(status_code=400, detail="Job description details missing for follow up generation.")
        
    # Load profile details
    profile_res = db.table("profiles").select("*").eq("id", app["profile_id"]).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile record missing.")
        
    profile = profile_res.data[0]
    
    # Call Claude to compose professional draft message
    draft_message = await generate_follow_up_email_draft(profile, app["job"])
    
    # Dispatch Email Alert via background queue
    background_tasks.add_task(
        send_follow_up_reminder_email,
        profile["email"],
        profile["full_name"],
        app["job"],
        app,
        draft_message
    )
    
    # Update status to record alert dispatched
    db.table("applications").update({"follow_up_sent": True}).eq("id", str(id)).execute()
    
    return {"success": True, "draft_message": draft_message}
