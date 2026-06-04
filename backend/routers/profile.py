from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional
from database import get_db
from models.profile import (
    ProfileUpdate, ProfileResponse, CompleteProfileResponse,
    EducationCreate, EducationUpdate, EducationResponse,
    ExperienceCreate, ExperienceUpdate, ExperienceResponse
)
from services.storage_service import upload_file_to_storage, generate_download_url
from uuid import UUID

router = APIRouter()

# --- User Profile Endpoints ---

@router.get("/", response_model=CompleteProfileResponse)
async def get_profile():
    db = get_db()
    # Load profile row (there is only one row in the single-user database)
    profile_res = db.table("profiles").select("*").limit(1).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile details not initialized yet.")
    
    profile = profile_res.data[0]
    profile_id = profile["id"]
    
    # Pre-render photo signed URL if profile photo exists
    if profile.get("photo_url"):
        signed_photo = generate_download_url("user-vault", profile["photo_url"])
        if signed_photo:
            profile["photo_url"] = signed_photo
            
    # Load related education list
    edu_res = db.table("education").select("*").eq("profile_id", profile_id).execute()
    # Load related experience list
    exp_res = db.table("experience").select("*").eq("profile_id", profile_id).execute()
    
    profile["education"] = edu_res.data or []
    profile["experience"] = exp_res.data or []
    
    return profile

@router.put("/", response_model=ProfileResponse)
async def update_profile(profile_update: ProfileUpdate):
    db = get_db()
    # Find existing row
    existing = db.table("profiles").select("id").limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Profile not found. Please upload master resume to initialize.")
    
    profile_id = existing.data[0]["id"]
    update_data = profile_update.model_dump(exclude_none=True)
    
    # Cast email address to string if present
    if "email" in update_data:
        update_data["email"] = str(update_data["email"])
        
    res = db.table("profiles").update(update_data).eq("id", profile_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update profile row in database.")
    return res.data[0]

@router.post("/photo")
async def upload_profile_photo(file: UploadFile = File(...)):
    """Upload photo to private storage and log path in profiles table"""
    db = get_db()
    existing = db.table("profiles").select("id").limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Profile not found. Upload master resume first.")
    
    profile_id = existing.data[0]["id"]
    
    if not file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
        raise HTTPException(status_code=400, detail="Unsupported image format. Only PNG, JPG, JPEG, and WEBP images are allowed.")
        
    contents = await file.read()
    storage_path = f"photo/profile_{profile_id}.jpg"
    
    uploaded_path = upload_file_to_storage(
        bucket_name="user-vault",
        storage_path=storage_path,
        file_bytes=contents,
        mime_type=file.content_type
    )
    
    if not uploaded_path:
        raise HTTPException(status_code=500, detail="Failed uploading profile photo to storage.")
        
    # Update profile photo URL
    db.table("profiles").update({"photo_url": storage_path}).eq("id", profile_id).execute()
    
    # Return signed preview URL
    signed_url = generate_download_url("user-vault", storage_path)
    return {"success": True, "photo_url": signed_url}


# --- Education CRUD Endpoints ---

@router.get("/education", response_model=List[EducationResponse])
async def list_education():
    db = get_db()
    profile_res = db.table("profiles").select("id").limit(1).execute()
    if not profile_res.data:
        return []
    
    profile_id = profile_res.data[0]["id"]
    edu_res = db.table("education").select("*").eq("profile_id", profile_id).execute()
    return edu_res.data or []

@router.post("/education", response_model=EducationResponse)
async def add_education(edu: EducationCreate):
    db = get_db()
    profile_res = db.table("profiles").select("id").limit(1).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    profile_id = profile_res.data[0]["id"]
    edu_data = edu.model_dump()
    edu_data["profile_id"] = str(profile_id)
    
    res = db.table("education").insert(edu_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to insert education row.")
    return res.data[0]

@router.put("/education/{id}", response_model=EducationResponse)
async def update_education(id: UUID, edu_update: EducationUpdate):
    db = get_db()
    update_data = edu_update.model_dump(exclude_none=True)
    res = db.table("education").update(update_data).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Education record not found.")
    return res.data[0]

@router.delete("/education/{id}")
async def delete_education(id: UUID):
    db = get_db()
    res = db.table("education").delete().eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Education record not found.")
    return {"success": True, "message": "Education record deleted successfully."}


# --- Experience CRUD Endpoints ---

@router.get("/experience", response_model=List[ExperienceResponse])
async def list_experience():
    db = get_db()
    profile_res = db.table("profiles").select("id").limit(1).execute()
    if not profile_res.data:
        return []
    
    profile_id = profile_res.data[0]["id"]
    exp_res = db.table("experience").select("*").eq("profile_id", profile_id).execute()
    return exp_res.data or []

@router.post("/experience", response_model=ExperienceResponse)
async def add_experience(exp: ExperienceCreate):
    db = get_db()
    profile_res = db.table("profiles").select("id").limit(1).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    profile_id = profile_res.data[0]["id"]
    exp_data = exp.model_dump()
    exp_data["profile_id"] = str(profile_id)
    # Serialize date to string for supabase
    exp_data["start_date"] = exp_data["start_date"].isoformat()
    if exp_data["end_date"]:
        exp_data["end_date"] = exp_data["end_date"].isoformat()
        
    res = db.table("experience").insert(exp_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to insert experience row.")
    return res.data[0]

@router.put("/experience/{id}", response_model=ExperienceResponse)
async def update_experience(id: UUID, exp_update: ExperienceUpdate):
    db = get_db()
    update_data = exp_update.model_dump(exclude_none=True)
    # Format date parameters
    if "start_date" in update_data:
        update_data["start_date"] = update_data["start_date"].isoformat()
    if "end_date" in update_data and update_data["end_date"]:
        update_data["end_date"] = update_data["end_date"].isoformat()
        
    res = db.table("experience").update(update_data).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Experience record not found.")
    return res.data[0]

@router.delete("/experience/{id}")
async def delete_experience(id: UUID):
    db = get_db()
    res = db.table("experience").delete().eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Experience record not found.")
    return {"success": True, "message": "Experience record deleted successfully."}
