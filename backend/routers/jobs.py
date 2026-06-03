"""Jobs API Router"""
from fastapi import APIRouter, Query, HTTPException
from database import get_db
from typing import Optional

router = APIRouter()


@router.get("/")
async def get_jobs(
    type: Optional[str] = None,
    source: Optional[str] = None,
    min_match: int = 0,
    max_risk: int = 100,
    limit: int = 50,
    offset: int = 0,
):
    db = get_db()
    query = db.table("jobs").select("*")

    if type:
        query = query.eq("type", type)
    if source:
        query = query.eq("source", source)
    if min_match > 0:
        query = query.gte("match_score", min_match)
    if max_risk < 100:
        query = query.lte("fake_risk_score", max_risk)

    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"jobs": result.data, "total": len(result.data)}


@router.get("/stats")
async def get_stats():
    db = get_db()
    jobs = db.table("jobs").select("*").execute().data or []
    applications = db.table("applications").select("*").execute().data or []

    return {
        "total_jobs": len(jobs),
        "safe_jobs": len([j for j in jobs if j.get("fake_risk_score", 100) < 40]),
        "high_match": len([j for j in jobs if j.get("match_score", 0) >= 80]),
        "total_applied": len(applications),
        "auto_applied": len([a for a in applications if a.get("is_auto_applied")]),
        "govt_jobs": len([j for j in jobs if j.get("is_govt")]),
    }


@router.get("/{job_id}")
async def get_job(job_id: str):
    db = get_db()
    result = db.table("jobs").select("*").eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]
