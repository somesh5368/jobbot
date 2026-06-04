from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from uuid import UUID
from database import get_db
from services.resume_service import process_and_save_master_resume, generate_ats_resume_and_save
from services.storage_service import generate_download_url

router = APIRouter()

class GenerateATSRequest(BaseModel):
    job_id: UUID

@router.post("/upload")
async def upload_master_resume(file: UploadFile = File(...)):
    """Upload master resume file (PDF/DOCX/TXT) and parse structured profile details"""
    if not file.filename.lower().endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Only PDF, DOCX, and TXT files are allowed."
        )
        
    contents = await file.read()
    try:
        result = await process_and_save_master_resume(contents, file.filename)
        return {"success": True, "parsed_profile": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed parsing resume: {str(e)}")

@router.post("/generate-ats")
async def generate_ats_resume(request: GenerateATSRequest):
    """Rewrite bullet phrases for target job and build modified PDF resume"""
    try:
        result = await generate_ats_resume_and_save(str(request.job_id))
        
        # Pre-render signed URL for download
        file_path = result["resume_version"].get("file_url")
        if file_path:
            signed_url = generate_download_url("ats-resumes", file_path)
            result["resume_version"]["download_url"] = signed_url
            
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ATS Generator encountered internal error: {str(e)}")

@router.get("/versions")
async def list_resume_versions():
    """Retrieve list of modified resume versions"""
    db = get_db()
    res = db.table("resume_versions").select("*").order("generated_at", desc=True).execute()
    versions = res.data or []
    
    # Generate download signed links for each
    for version in versions:
        file_path = version.get("file_url")
        if file_path:
            version["download_url"] = generate_download_url("ats-resumes", file_path)
            
    return {"success": True, "versions": versions}

@router.get("/versions/{id}")
async def get_resume_version(id: UUID):
    """Fetch detail configuration for a specific resume version"""
    db = get_db()
    res = db.table("resume_versions").select("*").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Resume version not found.")
        
    version = res.data[0]
    file_path = version.get("file_url")
    if file_path:
        version["download_url"] = generate_download_url("ats-resumes", file_path)
        
    return {"success": True, "version": version}
