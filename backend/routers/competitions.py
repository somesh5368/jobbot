from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from database import get_db
from models.competition import CompetitionResponse, CompetitionUpdate, CompetitionStats

router = APIRouter()

@router.get("/", response_model=List[CompetitionResponse])
async def list_competitions(
    status: Optional[str] = None,
    domain: Optional[str] = None,
    competition_type: Optional[str] = None,
    upcoming_only: bool = True
):
    """Query contests list, filtering by relevance scores, domains, or timelines"""
    db = get_db()
    query = db.table("competitions").select("*")
    
    if status:
        query = query.eq("status", status)
    if competition_type:
        query = query.eq("competition_type", competition_type)
    if domain:
        query = query.contains("domains", [domain])
        
    if upcoming_only:
        today_str = date.today().isoformat()
        query = query.gte("registration_deadline", today_str)
        
    res = query.order("relevance_score", desc=True).execute()
    return res.data or []

@router.get("/stats", response_model=CompetitionStats)
async def get_competition_statistics():
    """Retrieve aggregate counts grouped by competition tracking statuses"""
    db = get_db()
    res = db.table("competitions").select("status").execute()
    comps = res.data or []
    
    stats = {
        "upcoming": sum(1 for c in comps if c["status"] == "upcoming"),
        "registered": sum(1 for c in comps if c["status"] == "registered"),
        "participated": sum(1 for c in comps if c["status"] == "participated"),
        "won": sum(1 for c in comps if c["status"] == "won")
    }
    return stats

@router.post("/{id}/register")
async def register_for_competition(id: UUID):
    """Mark a competition record status as registered"""
    db = get_db()
    
    update_data = {
        "status": "registered",
        "registration_status": "registered",
        "registered_date": date.today().isoformat()
    }
    
    res = db.table("competitions").update(update_data).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Competition record not found.")
    return {"success": True, "competition": res.data[0]}

@router.put("/{id}", response_model=CompetitionResponse)
async def update_competition_details(id: UUID, comp_update: CompetitionUpdate):
    """Edit competition tags, dates, or notes details manually"""
    db = get_db()
    update_data = comp_update.model_dump(exclude_none=True)
    
    # Cast date properties to strings
    if "registration_deadline" in update_data and update_data["registration_deadline"]:
        update_data["registration_deadline"] = update_data["registration_deadline"].isoformat()
    if "competition_date" in update_data and update_data["competition_date"]:
        update_data["competition_date"] = update_data["competition_date"].isoformat()
    if "registered_date" in update_data and update_data["registered_date"]:
        update_data["registered_date"] = update_data["registered_date"].isoformat()
        
    res = db.table("competitions").update(update_data).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Competition record not found.")
    return res.data[0]
