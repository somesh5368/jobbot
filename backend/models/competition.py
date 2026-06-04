from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

class CompetitionBase(BaseModel):
    title: str
    organizer: str
    competition_type: Optional[str] = None  # 'hackathon', 'coding_contest', 'case_study', etc.
    domains: Optional[List[str]] = []
    source_url: str
    description: Optional[str] = None
    prizes: Optional[str] = None
    eligibility: Optional[str] = None
    registration_deadline: Optional[date] = None
    competition_date: Optional[date] = None
    team_size: Optional[str] = None  # 'solo', '2-4', 'open'
    is_online: Optional[bool] = True
    relevance_score: Optional[int] = 0
    status: Optional[str] = "upcoming"  # 'upcoming', 'registered', 'participated', 'won'
    registration_status: Optional[str] = "not_registered"  # 'not_registered', 'registered'
    registered_date: Optional[date] = None
    notes: Optional[str] = None
    email_sent: Optional[bool] = False

class CompetitionCreate(CompetitionBase):
    profile_id: Optional[UUID] = None

class CompetitionUpdate(BaseModel):
    title: Optional[str] = None
    organizer: Optional[str] = None
    competition_type: Optional[str] = None
    domains: Optional[List[str]] = None
    source_url: Optional[str] = None
    description: Optional[str] = None
    prizes: Optional[str] = None
    eligibility: Optional[str] = None
    registration_deadline: Optional[date] = None
    competition_date: Optional[date] = None
    team_size: Optional[str] = None
    is_online: Optional[bool] = None
    relevance_score: Optional[int] = None
    status: Optional[str] = None
    registration_status: Optional[str] = None
    registered_date: Optional[date] = None
    notes: Optional[str] = None
    email_sent: Optional[bool] = None

class CompetitionResponse(CompetitionBase):
    id: UUID
    profile_id: UUID
    scraped_at: datetime

    class Config:
        from_attributes = True

class CompetitionStats(BaseModel):
    upcoming: int
    registered: int
    participated: int
    won: int
