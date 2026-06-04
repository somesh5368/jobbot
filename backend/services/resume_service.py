import logging
from typing import Dict, Any, List, Optional
from database import get_db
from utils.text_extractor import extract_text_from_bytes
from utils.pdf_generator import convert_resume_text_to_pdf
from services.ai_service import parse_resume_to_json, generate_ats_optimized_resume
from services.storage_service import upload_file_to_storage

logger = logging.getLogger(__name__)

async def process_and_save_master_resume(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    1. Extracts text from PDF/DOCX resume file
    2. Sends text to Claude AI for structured profile extraction
    3. Saves PDF to Supabase Storage private vault
    4. Syncs extracted profile, education, and experience details in database
    """
    db = get_db()
    
    # Step 1: Text extraction
    resume_text = extract_text_from_bytes(file_bytes, filename)
    
    # Step 2: Claude structured parsing
    parsed_profile = await parse_resume_to_json(resume_text)
    
    # Step 3: Find or Create Profile Row
    profile_id = None
    existing_profile = db.table("profiles").select("id").limit(1).execute()
    
    profile_data = {
        "full_name": parsed_profile.get("full_name", "Somesh Pandey"),
        "email": parsed_profile.get("email", "somesh@example.com"),
        "phone": parsed_profile.get("phone"),
        "city": parsed_profile.get("city"),
        "state": parsed_profile.get("state"),
        "linkedin_url": parsed_profile.get("linkedin_url"),
        "github_url": parsed_profile.get("github_url"),
        "portfolio_url": parsed_profile.get("portfolio_url"),
        "experience_level": parsed_profile.get("experience_level", "fresher"),
        "skills": parsed_profile.get("skills", []),
        "raw_resume_text": resume_text
    }
    
    if existing_profile.data:
        profile_id = existing_profile.data[0]["id"]
        db.table("profiles").update(profile_data).eq("id", profile_id).execute()
        logger.info(f"Updated existing profile row: {profile_id}")
    else:
        insert_res = db.table("profiles").insert(profile_data).execute()
        if insert_res.data:
            profile_id = insert_res.data[0]["id"]
            logger.info(f"Inserted brand new profile row: {profile_id}")
            
    if not profile_id:
        raise ValueError("Database transaction failed. Cannot create or load user profile.")
        
    # Step 4: Upload PDF to private Supabase Storage vault
    storage_path = f"resumes/master-resume_{profile_id}.pdf" if filename.lower().endswith(".pdf") else f"resumes/master-resume_{profile_id}.docx"
    mime_type = "application/pdf" if filename.lower().endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    uploaded_path = upload_file_to_storage(
        bucket_name="user-vault",
        storage_path=storage_path,
        file_bytes=file_bytes,
        mime_type=mime_type
    )
    
    if uploaded_path:
        db.table("profiles").update({"resume_url": storage_path}).eq("id", profile_id).execute()
        
    # Step 5: Sync Education Records (Clear old entries and insert new ones)
    try:
        db.table("education").delete().eq("profile_id", profile_id).execute()
        edu_list = parsed_profile.get("education", [])
        for edu in edu_list:
            edu["profile_id"] = str(profile_id)
            db.table("education").insert(edu).execute()
        logger.info(f"Synced {len(edu_list)} education entries in DB.")
    except Exception as e:
        logger.error(f"Error syncing education entries: {e}")
        
    # Step 6: Sync Experience Records (Clear old entries and insert new ones)
    try:
        db.table("experience").delete().eq("profile_id", profile_id).execute()
        exp_list = parsed_profile.get("experience", [])
        for exp in exp_list:
            exp["profile_id"] = str(profile_id)
            db.table("experience").insert(exp).execute()
        logger.info(f"Synced {len(exp_list)} experience entries in DB.")
    except Exception as e:
        logger.error(f"Error syncing experience entries: {e}")
        
    return {
        "profile_id": profile_id,
        "full_name": profile_data["full_name"],
        "skills": profile_data["skills"],
        "education_count": len(parsed_profile.get("education", [])),
        "experience_count": len(parsed_profile.get("experience", []))
    }

async def generate_ats_resume_and_save(job_id: str) -> Dict[str, Any]:
    """
    1. Fetch target job description and candidate master profile details
    2. Feed to Claude ATS optimizer to output rephrased resume text
    3. Render tailored resume text to PDF utilizing ReportLab generator
    4. Upload modified PDF to Supabase Storage (ats-resumes bucket)
    5. Save a row in resume_versions database table
    """
    db = get_db()
    
    # 1. Fetch details
    profile_res = db.table("profiles").select("*").limit(1).execute()
    if not profile_res.data:
        raise ValueError("Profile does not exist. Please upload master resume first.")
    profile = profile_res.data[0]
    
    job_res = db.table("jobs").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise ValueError(f"Job with ID {job_id} not found.")
    job = job_res.data[0]
    
    # Fetch experience & education details to format complete prompt context
    edu_res = db.table("education").select("*").eq("profile_id", profile["id"]).execute()
    exp_res = db.table("experience").select("*").eq("profile_id", profile["id"]).execute()
    
    profile_context = {
        **profile,
        "education": edu_res.data or [],
        "experience": exp_res.data or []
    }
    
    # 2. Call Claude ATS Optimization
    ats_result = await generate_ats_optimized_resume(profile_data=profile_context, job_data=job)
    
    modified_text = ats_result.get("modified_resume_text", "")
    if not modified_text:
        raise ValueError("AI resume generator returned empty text output.")
        
    # 3. Render ReportLab PDF
    pdf_bytes = convert_resume_text_to_pdf(modified_text)
    
    # 4. Upload PDF to private ats-resumes bucket
    storage_path = f"jobs/{job_id}_ats-resume.pdf"
    uploaded_path = upload_file_to_storage(
        bucket_name="ats-resumes",
        storage_path=storage_path,
        file_bytes=pdf_bytes,
        mime_type="application/pdf"
    )
    
    if not uploaded_path:
        raise ValueError("Failed uploading generated ATS resume PDF to storage.")
        
    # 5. Insert version details in resume_versions table
    version_record = {
        "profile_id": profile["id"],
        "job_id": job_id,
        "version_label": f"ATS for {job.get('company')} - {job.get('title')}",
        "original_text": profile.get("raw_resume_text"),
        "modified_text": modified_text,
        "changes_made": ats_result.get("changes_made", []),
        "ats_score_before": ats_result.get("ats_score_before", 0),
        "ats_score_after": ats_result.get("ats_score_after", 0),
        "file_url": storage_path
    }
    
    version_res = db.table("resume_versions").insert(version_record).execute()
    
    return {
        "resume_version": version_res.data[0] if version_res.data else {},
        "cover_letter": ats_result.get("cover_letter", "")
    }
