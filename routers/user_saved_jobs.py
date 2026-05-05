"""Bookmarked numeric job IDs per learner."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app_db.database import get_db
from app_db.deps import DependencyProgressUser
from app_db.models import SavedJob
from app_db.schemas import SavedJobIdsResponse, SavedJobPayload

router = APIRouter(tags=["saved_jobs"])


@router.get("/saved-jobs", response_model=SavedJobIdsResponse)
def list_saved_jobs(
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    rows = db.query(SavedJob).filter(SavedJob.user_id == learner.id).order_by(SavedJob.id.asc()).all()
    return SavedJobIdsResponse(job_ids=[row.job_id for row in rows])


@router.post("/saved-jobs", status_code=status.HTTP_204_NO_CONTENT)
def add_saved_job(
    payload: SavedJobPayload,
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    exists = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == learner.id, SavedJob.job_id == payload.job_id)
        .first()
    )
    if exists:
        return None

    db.add(SavedJob(user_id=learner.id, job_id=payload.job_id))
    db.commit()


@router.delete("/saved-jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_job(
    job_id: int,
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    row = db.query(SavedJob).filter(SavedJob.user_id == learner.id, SavedJob.job_id == job_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved job missing")
    db.delete(row)
    db.commit()
