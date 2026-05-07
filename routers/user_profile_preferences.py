"""Persisted profile filter preferences per learner (SQLite)."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app_db.database import get_db
from app_db.deps import DependencyProgressUser
from app_db.models import UserProgressState
from app_db.schemas import ProfilePreferencesPatchBody, ProfilePreferencesPut, ProfilePreferencesResponse
from services.profile_preferences import parse_preferences_blob

router = APIRouter(tags=["saved_profile"])


def _get_or_create_state(db: Session, user_id: int) -> UserProgressState:
    row = db.query(UserProgressState).filter(UserProgressState.user_id == user_id).first()
    if row is None:
        row = UserProgressState(user_id=user_id)
        db.add(row)
        db.flush()
    return row


@router.get("/saved-profile/preferences", response_model=ProfilePreferencesResponse)
def get_saved_profile_preferences(
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    row = db.query(UserProgressState).filter(UserProgressState.user_id == learner.id).first()
    prefs = parse_preferences_blob(row.profile_preferences_json if row else None)
    return ProfilePreferencesResponse(preferences=prefs)


@router.put("/saved-profile/preferences", response_model=ProfilePreferencesResponse)
def put_saved_profile_preferences(
    body: ProfilePreferencesPut,
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    row = _get_or_create_state(db, learner.id)
    row.profile_preferences_json = json.dumps(body.preferences, ensure_ascii=False)
    db.commit()
    return ProfilePreferencesResponse(preferences=body.preferences)


@router.patch("/saved-profile/preferences", response_model=ProfilePreferencesResponse)
def patch_saved_profile_preferences(
    body: ProfilePreferencesPatchBody,
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    row = _get_or_create_state(db, learner.id)
    current = parse_preferences_blob(row.profile_preferences_json)
    for k, v in body.preferences.items():
        current[k] = v
    row.profile_preferences_json = json.dumps(current, ensure_ascii=False)
    db.commit()
    return ProfilePreferencesResponse(preferences=current)


@router.delete("/saved-profile/preferences/{field_name}", response_model=ProfilePreferencesResponse)
def delete_saved_profile_preference_key(
    field_name: str,
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    row = db.query(UserProgressState).filter(UserProgressState.user_id == learner.id).first()
    if row is None or not row.profile_preferences_json:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No preferences saved")
    current = parse_preferences_blob(row.profile_preferences_json)
    if field_name not in current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not present")
    del current[field_name]
    row.profile_preferences_json = json.dumps(current, ensure_ascii=False) if current else None
    db.commit()
    return ProfilePreferencesResponse(preferences=current)
