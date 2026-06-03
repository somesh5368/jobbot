"""Applications API Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from datetime import datetime, timezone

router = APIRouter()


class ApplicationCreate(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


@router.get("/")
async def get_applications():
    db = get_db()
    result = db.table("applications").select(
        "*, jobs(title, company, source, match_score, fake_risk_score, apply_url)"
    ).order("applied_at", desc=True).execute()
    return {"applications": result.data}


@router.post("/")
async def create_application(app: ApplicationCreate):
    db = get_db()

    profile = db.table("profiles").select("id").limit(1).execute()
    if not profile.data:
        raise HTTPException(status_code=400, detail="Profile not set up")

    result = db.table("applications").insert({
        "profile_id": profile.data[0]["id"],
        "job_id": app.job_id,
        "cover_letter": app.cover_letter,
        "notes": app.notes,
        "status": "applied",
        "is_auto_applied": False,
        "applied_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"success": True, "application": result.data[0] if result.data else None}


@router.patch("/{app_id}")
async def update_application(app_id: str, update: ApplicationUpdate):
    db = get_db()
    data = update.model_dump(exclude_none=True)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = db.table("applications").update(data).eq("id", app_id).execute()
    return {"success": True, "application": result.data[0] if result.data else None}
