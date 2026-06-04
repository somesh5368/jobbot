from fastapi import APIRouter, HTTPException
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import get_db
from services.ai_service import generate_full_interview_prep, grade_practice_answer

router = APIRouter()

class PracticeRequest(BaseModel):
    job_id: UUID
    question_type: str  # 'technical' | 'hr' | 'domain'
    question_index: int
    user_answer: str

async def generate_prep_for_job(job_id: str, application_id: str) -> Dict[str, Any]:
    """Compile prep package details using Claude and save to database"""
    db = get_db()
    
    # 1. Fetch Profile, education, and experience details
    profile_res = db.table("profiles").select("*").limit(1).execute()
    if not profile_res.data:
        raise ValueError("Profile not set up. Upload master resume first.")
    profile = profile_res.data[0]
    
    edu_res = db.table("education").select("*").eq("profile_id", profile["id"]).execute()
    exp_res = db.table("experience").select("*").eq("profile_id", profile["id"]).execute()
    
    profile_context = {
        **profile,
        "education": edu_res.data or [],
        "experience": exp_res.data or []
    }
    
    # 2. Fetch Job listing details
    job_res = db.table("jobs").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise ValueError("Job not found.")
    job = job_res.data[0]
    
    # 3. Check if optimized resume version exists
    resume_res = db.table("resume_versions").select("file_url").eq("job_id", job_id).execute()
    ats_resume_url = resume_res.data[0]["file_url"] if resume_res.data else None
    
    # 4. Call Claude AI to generate prep kit
    prep_data = await generate_full_interview_prep(profile_context, job)
    
    # 5. Insert in database
    prep_record = {
        "job_id": job_id,
        "application_id": application_id,
        "company_research": prep_data.get("company_research"),
        "role_overview": prep_data.get("role_overview"),
        "technical_questions": prep_data.get("technical_questions", []),
        "hr_questions": prep_data.get("hr_questions", []),
        "domain_questions": prep_data.get("domain_questions", []),
        "coding_topics": prep_data.get("coding_topics", []),
        "project_tips": prep_data.get("project_tips"),
        "resume_talking_points": prep_data.get("resume_talking_points", []),
        "dress_code_tips": prep_data.get("dress_code_tips"),
        "dos_and_donts": prep_data.get("dos_and_donts", []),
        "estimated_rounds": prep_data.get("estimated_rounds", 3),
        "prep_resources": prep_data.get("prep_resources", []),
        "ats_resume_url": ats_resume_url,
        "cover_letter_text": prep_data.get("cover_letter_text")
    }
    
    # Clear old prep if exists
    db.table("interview_prep").delete().eq("job_id", job_id).execute()
    
    insert_res = db.table("interview_prep").insert(prep_record).execute()
    if not insert_res.data:
        raise ValueError("Database transaction error while saving prep guides.")
        
    return insert_res.data[0]

@router.get("/{job_id}")
async def get_interview_prep(job_id: UUID):
    """Retrieve interview prep package details. If not exists, compiles one."""
    db = get_db()
    res = db.table("interview_prep").select("*").eq("job_id", str(job_id)).execute()
    if res.data:
        return {"success": True, "prep": res.data[0]}
        
    # Compile new prep package
    app_res = db.table("applications").select("id").eq("job_id", str(job_id)).execute()
    if not app_res.data:
        raise HTTPException(status_code=400, detail="Cannot prepare guides. Application tracker record not registered.")
        
    try:
        new_prep = await generate_prep_for_job(str(job_id), app_res.data[0]["id"])
        return {"success": True, "prep": new_prep}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Guide compiler error: {str(e)}")

@router.post("/{job_id}/regenerate")
async def regenerate_interview_prep(job_id: UUID):
    """Force re-generation of the AI interview prep guide"""
    db = get_db()
    app_res = db.table("applications").select("id").eq("job_id", str(job_id)).execute()
    if not app_res.data:
        raise HTTPException(status_code=400, detail="Application tracker record not found.")
        
    try:
        new_prep = await generate_prep_for_job(str(job_id), app_res.data[0]["id"])
        return {"success": True, "prep": new_prep}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Guide compiler error: {str(e)}")

@router.get("/{application_id}/questions")
async def get_questions_preview(application_id: UUID):
    """Retrieve preview questions arrays directly for dashboard panels"""
    db = get_db()
    res = db.table("interview_prep").select("technical_questions, hr_questions, domain_questions").eq("application_id", str(application_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Interview guides not compiled yet.")
    return {"success": True, "questions": res.data[0]}

@router.post("/practice")
async def submit_practice_answer(req: PracticeRequest):
    """Grade candidate's mock practice answer using Claude and log response details"""
    db = get_db()
    
    # Load prep guides row
    prep_res = db.table("interview_prep").select("*").eq("job_id", str(req.job_id)).execute()
    if not prep_res.data:
        raise HTTPException(status_code=404, detail="Interview prep guide not compiled.")
        
    prep = prep_res.data[0]
    q_type = req.question_type.lower()
    
    # Resolve question category list
    if q_type == "technical":
        q_list = prep.get("technical_questions", [])
    elif q_type == "hr":
        q_list = prep.get("hr_questions", [])
    elif q_type == "domain":
        q_list = prep.get("domain_questions", [])
    else:
        raise HTTPException(status_code=400, detail="Invalid question type category.")
        
    if req.question_index < 0 or req.question_index >= len(q_list):
        raise HTTPException(status_code=400, detail="Question index out of range bounds.")
        
    target_q = q_list[req.question_index]
    
    # Call Claude AI to grade answer
    feedback = await grade_practice_answer(
        question=target_q.get("question"),
        hint=target_q.get("hint", ""),
        sample_answer=target_q.get("sample_answer", ""),
        user_answer=req.user_answer
    )
    
    # Update target question details
    target_q["user_answer"] = req.user_answer
    target_q["feedback"] = feedback
    
    # Save list back to database
    col_name = f"{q_type}_questions"
    db.table("interview_prep").update({col_name: q_list}).eq("id", prep["id"]).execute()
    
    return {"success": True, "feedback": feedback}
