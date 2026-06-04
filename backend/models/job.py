from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    job_type: Optional[str] = None  # 'internship', 'fulltime', 'parttime', 'remote'
    source: str
    source_url: str
    description: str
    requirements: Optional[List[str]] = []
    skills_required: Optional[List[str]] = []
    stipend_or_salary: Optional[str] = None
    duration: Optional[str] = None
    deadline: Optional[date] = None
    posted_date: Optional[date] = None
    match_score: Optional[int] = 0
    match_reasons: Optional[List[str]] = []
    fake_risk_score: Optional[int] = 0
    fake_risk_reasons: Optional[List[str]] = []
    status: Optional[str] = "new"  # 'new', 'saved', 'applied', 'rejected', 'ignored'
    ai_summary: Optional[str] = None
    is_verified: Optional[bool] = False
    email_sent: Optional[bool] = False

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    skills_required: Optional[List[str]] = None
    stipend_or_salary: Optional[str] = None
    duration: Optional[str] = None
    deadline: Optional[date] = None
    posted_date: Optional[date] = None
    match_score: Optional[int] = None
    match_reasons: Optional[List[str]] = None
    fake_risk_score: Optional[int] = None
    fake_risk_reasons: Optional[List[str]] = None
    status: Optional[str] = None
    ai_summary: Optional[str] = None
    is_verified: Optional[bool] = None
    email_sent: Optional[bool] = None

class JobResponse(JobBase):
    id: UUID
    scraped_at: datetime

    class Config:
        from_attributes = True
