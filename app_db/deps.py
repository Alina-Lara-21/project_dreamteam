"""Resolves learner rows from browser header."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app_db.database import get_db
from app_db.models import ProgressUser


def get_progress_user_dependency(
    x_progress_code: Annotated[str | None, Header(alias="X-Progress-Code")] = None,
    db: Session = Depends(get_db),
) -> ProgressUser:
    """Load ProgressUser whenever X-Progress-Code echoes local bridge_progress_code."""
    code = (x_progress_code or "").strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Progress-Code header.",
        )

    learner = db.query(ProgressUser).filter(ProgressUser.progress_code == code).first()
    if learner is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown progress_code.",
        )

    return learner


DependencyProgressUser = Annotated[ProgressUser, Depends(get_progress_user_dependency)]


def get_optional_progress_user(
    x_progress_code: Annotated[str | None, Header(alias="X-Progress-Code")] = None,
    db: Session = Depends(get_db),
) -> ProgressUser | None:
    """Same lookup as get_progress_user_dependency but returns None if header missing or unknown."""
    code = (x_progress_code or "").strip()
    if not code:
        return None
    learner = db.query(ProgressUser).filter(ProgressUser.progress_code == code).first()
    return learner


DependencyOptionalProgressUser = Annotated[ProgressUser | None, Depends(get_optional_progress_user)]
