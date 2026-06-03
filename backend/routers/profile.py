"""Profile API Router"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from database import get_db
from services.resume_service import extract_skills_from_resume

router = APIRouter()


class ProfileUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    preferred_roles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    work_mode: Optional[str] = None
    min_stipend: Optional[int] = None
    auto_apply: Optional[bool] = None
    auto_apply_threshold: Optional[int] = None
    email_alerts: Optional[bool] = None


@router.get("/")
async def get_profile():
    db = get_db()
    result = db.table("profiles").select("*").limit(1).execute()
    if not result.data:
        return {"profile": None}
    return {"profile": result.data[0]}


@router.post("/")
async def create_or_update_profile(profile: ProfileUpdate):
    db = get_db()
    data = profile.model_dump(exclude_none=True)

    existing = db.table("profiles").select("id").limit(1).execute()
    if existing.data:
        result = db.table("profiles").update(data).eq("id", existing.data[0]["id"]).execute()
    else:
        result = db.table("profiles").insert(data).execute()

    return {"success": True, "profile": result.data[0] if result.data else None}


@router.post("/resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload resume text and auto-extract skills"""
    if not file.filename.endswith((".txt", ".pdf")):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files supported")

    content = await file.read()
    try:
        resume_text = content.decode("utf-8")
    except UnicodeDecodeError:
        resume_text = content.decode("latin-1")

    skills = extract_skills_from_resume(resume_text)

    db = get_db()
    existing = db.table("profiles").select("id").limit(1).execute()
    if existing.data:
        db.table("profiles").update({
            "resume_text": resume_text[:10000],
            "skills": skills,
        }).eq("id", existing.data[0]["id"]).execute()

    return {"success": True, "skills_extracted": skills, "skill_count": len(skills)}
