from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

# --- Education Models ---
class EducationBase(BaseModel):
    degree: str
    institution: str
    board_or_university: Optional[str] = None
    field_of_study: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    cgpa_or_percentage: Optional[str] = None
    backlogs: Optional[int] = 0

class EducationCreate(EducationBase):
    profile_id: Optional[UUID] = None

class EducationUpdate(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    board_or_university: Optional[str] = None
    field_of_study: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    cgpa_or_percentage: Optional[str] = None
    backlogs: Optional[int] = None

class EducationResponse(EducationBase):
    id: UUID
    profile_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- Experience Models ---
class ExperienceBase(BaseModel):
    company: str
    role: str
    employment_type: Optional[str] = None  # 'internship', 'fulltime', 'freelance', 'project'
    start_date: date
    end_date: Optional[date] = None
    is_current: Optional[bool] = False
    description: Optional[str] = None
    technologies: Optional[List[str]] = []

class ExperienceCreate(ExperienceBase):
    profile_id: Optional[UUID] = None

class ExperienceUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    technologies: Optional[List[str]] = None

class ExperienceResponse(ExperienceBase):
    id: UUID
    profile_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- Profile Models ---
class ProfileBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    preferred_roles: Optional[List[str]] = []
    preferred_locations: Optional[List[str]] = []
    expected_ctc: Optional[str] = None
    notice_period: Optional[str] = None
    experience_level: Optional[str] = None  # 'fresher', 'intern', '1-3yr', '3-5yr'
    auto_apply_enabled: Optional[bool] = False
    auto_apply_threshold: Optional[int] = 85
    email_alerts_enabled: Optional[bool] = True
    alert_threshold: Optional[int] = 60
    skills: Optional[List[str]] = []
    raw_resume_text: Optional[str] = None
    resume_url: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    preferred_roles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    expected_ctc: Optional[str] = None
    notice_period: Optional[str] = None
    experience_level: Optional[str] = None
    auto_apply_enabled: Optional[bool] = None
    auto_apply_threshold: Optional[int] = None
    email_alerts_enabled: Optional[bool] = None
    alert_threshold: Optional[int] = None
    skills: Optional[List[str]] = None
    raw_resume_text: Optional[str] = None
    resume_url: Optional[str] = None

class ProfileResponse(ProfileBase):
    id: UUID
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Deep Nest Profile Response ---
class CompleteProfileResponse(ProfileResponse):
    education: List[EducationResponse] = []
    experience: List[ExperienceResponse] = []
