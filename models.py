from typing import Optional

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    skills: list[str] = Field(default_factory=list)
    courses: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    resume_text: Optional[str] = None


class Job(BaseModel):
    """API job shape consumed by vanilla JS (`skills_required`, etc.). Maps from Mongo via services.jobs_mongo."""

    id: int
    title: str
    company: str
    skills_required: list[str] = Field(default_factory=list)
    salary_range: Optional[str] = None
    location: Optional[str] = None
    description: str = "Description not provided."
    requirements: Optional[str] = None
    job_type: str = "Unspecified"


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


class AiSearchResponse(BaseModel):
    jobs: list[Job]
    matches: list[MatchResult]


class AiSearchRequest(BaseModel):
    """Semantic search + skill match over the loaded job catalog (no external LLM required)."""

    query: str = ""
    limit: int = Field(default=50, ge=1, le=5000)
    skills: list[str] = Field(default_factory=list)
    courses: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    resume_text: Optional[str] = None
