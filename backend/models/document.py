from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class DocumentBase(BaseModel):
    document_type: str  # 'aadhar' | 'pan' | 'marksheet_10' | 'marksheet_12' | 'degree' | 'offer_letter' | 'certificate' | 'other'
    document_name: str
    issued_by: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

class DocumentCreate(DocumentBase):
    file_url: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    profile_id: Optional[UUID] = None

class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    document_name: Optional[str] = None
    issued_by: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: UUID
    profile_id: UUID
    file_url: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True
