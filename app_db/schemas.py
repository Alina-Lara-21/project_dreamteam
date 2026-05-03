"""JSON bodies for progress-code endpoints (distinct from pydantic Job models.py)."""

from pydantic import BaseModel, Field


class ProgressStartBody(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=255)


class ProgressResumeBody(BaseModel):
    progress_code: str = Field(min_length=8, max_length=128)


class ProgressStartResponse(BaseModel):
    progress_code: str
    display_name: str
    email: str


class SavedJobPayload(BaseModel):
    job_id: int


class SavedJobIdsResponse(BaseModel):
    job_ids: list[int]


class ProgressStatePut(BaseModel):
    last_search_json: str | None = None
    last_analysis_json: str | None = None


class ProgressStateResponse(BaseModel):
    user_id: int
    last_search_json: str | None = None
    last_analysis_json: str | None = None
