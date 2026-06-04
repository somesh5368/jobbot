from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date, datetime
from uuid import UUID
from models.job import JobResponse

class ApplicationBase(BaseModel):
    applied_date: Optional[date] = None
    applied_method: Optional[str] = "manual"  # 'auto' | 'manual'
    application_status: Optional[str] = "applied"  # 'applied' | 'shortlisted' | 'interview_scheduled' | 'offered' | 'rejected' | 'withdrawn' | 'ghosted'
    resume_version_url: Optional[str] = None
    cover_letter_text: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_sent: Optional[bool] = False
    interview_date: Optional[datetime] = None
    interview_mode: Optional[str] = None  # 'online' | 'offline' | 'telephonic'
    interview_notes: Optional[str] = None
    offer_details: Optional[str] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    job_id: UUID
    profile_id: Optional[UUID] = None

class ApplicationUpdate(BaseModel):
    applied_date: Optional[date] = None
    applied_method: Optional[str] = None
    application_status: Optional[str] = None
    resume_version_url: Optional[str] = None
    cover_letter_text: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_sent: Optional[bool] = None
    interview_date: Optional[datetime] = None
    interview_mode: Optional[str] = None
    interview_notes: Optional[str] = None
    offer_details: Optional[str] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None

class ApplicationResponse(ApplicationBase):
    id: UUID
    profile_id: UUID
    job_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ApplicationWithJobResponse(ApplicationResponse):
    job: JobResponse

    class Config:
        from_attributes = True

# --- Analytics Response Models ---
class ApplicationStats(BaseModel):
    total_applied: int
    shortlisted: int
    offers: int
    rejections: int
    response_rate: float  # percentage
    avg_days_to_response: Optional[float] = None
    applications_by_source: Dict[str, int]
    match_score_correlation: List[Dict[str, float]]  # list of { "match_score_bucket": float, "response_rate": float }
    weekly_trend: List[Dict[str, int]]  # list of { "week": str, "applied_count": int }
