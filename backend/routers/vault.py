from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from uuid import UUID
from datetime import date
from database import get_db
from models.document import DocumentUpdate, DocumentResponse
from services.storage_service import upload_file_to_storage, generate_download_url, delete_file_from_storage

router = APIRouter()

@router.get("/", response_model=list[DocumentResponse])
async def list_documents():
    """List details for all documents inside the vault registry"""
    db = get_db()
    res = db.table("documents").select("*").order("uploaded_at", desc=True).execute()
    return res.data or []

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    document_name: str = Form(...),
    issued_by: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None)
):
    """Upload academic or identity document to private vault storage"""
    db = get_db()
    
    profile_res = db.table("profiles").select("id").limit(1).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found. Upload master resume first.")
        
    profile_id = profile_res.data[0]["id"]
    contents = await file.read()
    
    # Categorize storage folders by document type
    dtype = document_type.lower()
    if dtype in ["aadhar", "pan", "passport", "voter_id"]:
        folder = "identity"
    elif dtype in ["marksheet_10", "marksheet_12", "degree", "marksheet_sem"]:
        folder = "academic"
    elif dtype in ["certificate"]:
        folder = "certificates"
    elif dtype in ["offer_letter", "experience_letter", "experience"]:
        folder = "experience"
    else:
        folder = "other"
        
    storage_path = f"{folder}/{profile_id}_{file.filename}"
    
    uploaded_path = upload_file_to_storage(
        bucket_name="user-vault",
        storage_path=storage_path,
        file_bytes=contents,
        mime_type=file.content_type
    )
    
    if not uploaded_path:
        raise HTTPException(status_code=500, detail="Failed uploading document to storage.")
        
    doc_record = {
        "profile_id": str(profile_id),
        "document_type": document_type,
        "document_name": document_name,
        "file_url": storage_path,
        "file_name": file.filename,
        "file_size_bytes": len(contents),
        "mime_type": file.content_type,
        "issued_by": issued_by,
        "issue_date": issue_date if issue_date else None,
        "expiry_date": expiry_date if expiry_date else None,
        "notes": notes
    }
    
    res = db.table("documents").insert(doc_record).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to write document metadata to database.")
        
    return res.data[0]

@router.get("/{id}/download")
async def get_download_link(id: UUID):
    """Generate signed URL for private document download (1-hour expiry)"""
    db = get_db()
    res = db.table("documents").select("file_url").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    file_url = res.data[0]["file_url"]
    signed_url = generate_download_url("user-vault", file_url)
    if not signed_url:
        raise HTTPException(status_code=500, detail="Failed generating signed link.")
        
    return {"download_url": signed_url}

@router.put("/{id}", response_model=DocumentResponse)
async def update_document_metadata(id: UUID, doc_update: DocumentUpdate):
    """Update metadata notes or fields for a stored document"""
    db = get_db()
    update_data = doc_update.model_dump(exclude_none=True)
    
    # Cast dates to string if present
    if "issue_date" in update_data and update_data["issue_date"]:
        update_data["issue_date"] = update_data["issue_date"].isoformat()
    if "expiry_date" in update_data and update_data["expiry_date"]:
        update_data["expiry_date"] = update_data["expiry_date"].isoformat()
        
    res = db.table("documents").update(update_data).eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Document metadata not found.")
    return res.data[0]

@router.delete("/{id}")
async def delete_document(id: UUID):
    """Remove document from storage and delete database row"""
    db = get_db()
    res = db.table("documents").select("file_url").eq("id", str(id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Document registry not found.")
        
    file_url = res.data[0]["file_url"]
    
    # Storage removal
    delete_file_from_storage("user-vault", file_url)
    
    # DB row removal
    db.table("documents").delete().eq("id", str(id)).execute()
    
    return {"success": True, "message": "Document removed successfully."}
