from typing import Optional

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    skills: list[str] = Field(default_factory=list)
    courses: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    resume_text: Optional[str] = None


class Job(BaseModel):
    id: int
    title: str
    company: str
    skills_required: list[str] = Field(default_factory=list)
    salary_range: Optional[str] = None
    location: Optional[str] = None


class MatchResult(BaseModel):
    job_id: int
    title: str
    company: str
    match_score: int
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    explanation: str
    salary_range: Optional[str] = None


class MatchResponse(BaseModel):
    matches: list[MatchResult]


class SkillGapItem(BaseModel):
    job_id: int
    title: str
    company: str
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class SkillGapResponse(BaseModel):
    results: list[SkillGapItem]


class ResumeGenerateResponse(BaseModel):
    bullets: list[str]


class JobsResponse(BaseModel):
    jobs: list[Job]
