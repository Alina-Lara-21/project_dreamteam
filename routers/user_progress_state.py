"""JSON blobs persist Smart Search filters and AI match payloads."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app_db.database import get_db
from app_db.deps import DependencyProgressUser
from app_db.models import UserProgressState
from app_db.schemas import ProgressStatePut, ProgressStateResponse

router = APIRouter(tags=["progress_state"])


@router.get("/progress/state", response_model=ProgressStateResponse)
def read_state(
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    row = db.query(UserProgressState).filter(UserProgressState.user_id == learner.id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Missing state row")

    return ProgressStateResponse(
        user_id=learner.id,
        last_search_json=row.last_search_json,
        last_analysis_json=row.last_analysis_json,
    )


@router.put("/progress/state", response_model=ProgressStateResponse)
def write_state(
    body: ProgressStatePut,
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    row = db.query(UserProgressState).filter(UserProgressState.user_id == learner.id).first()
    if row is None:
        row = UserProgressState(user_id=learner.id)
        db.add(row)
        db.flush()

    incoming = body.model_dump(exclude_unset=True)

    # Only mutate keys the browser intentionally sent.
    if "last_search_json" in incoming:
        row.last_search_json = incoming["last_search_json"]
    if "last_analysis_json" in incoming:
        row.last_analysis_json = incoming["last_analysis_json"]

    db.commit()

    return ProgressStateResponse(
        user_id=learner.id,
        last_search_json=row.last_search_json,
        last_analysis_json=row.last_analysis_json,
    )
