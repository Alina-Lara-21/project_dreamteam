"""Merge SQLite-backed profile preferences into API filter and profile models."""

from __future__ import annotations

import json
from typing import Any

from models import UserProfile


def parse_preferences_blob(raw: str | None) -> dict[str, Any]:
    if not raw or not str(raw).strip():
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def prefs_for_user_row(profile_preferences_json: str | None) -> dict[str, Any]:
    return parse_preferences_blob(profile_preferences_json)


def _nonempty_query(val: str | None) -> bool:
    return bool(val and str(val).strip())


def _pref_to_csv(key: str, prefs: dict[str, Any]) -> str | None:
    v = prefs.get(key)
    if v is None:
        return None
    if isinstance(v, list):
        s = ", ".join(str(x).strip() for x in v if str(x).strip())
        return s or None
    s = str(v).strip()
    return s or None


def merge_job_filters(
    prefs: dict[str, Any],
    *,
    skills: str | None,
    coursework: str | None,
    experience: str | None,
    location: str | None,
    job_types: str | None,
    apply_saved: bool,
) -> tuple[str | None, str | None, str | None, str | None, str | None]:
    """Explicit non-empty query params win over saved preferences."""
    if not apply_saved or not prefs:
        return skills, coursework, experience, location, job_types

    def pick(q: str | None, key: str) -> str | None:
        if _nonempty_query(q):
            return q
        return _pref_to_csv(key, prefs)

    jt = pick(job_types, "job_types")
    if jt is None:
        jt = _pref_to_csv("types", prefs)

    return (
        pick(skills, "skills"),
        pick(coursework, "coursework"),
        pick(experience, "experience"),
        pick(location, "location"),
        jt,
    )


def list_from_pref(val: Any) -> list[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if str(x).strip()]
    return [p.strip() for p in str(val).split(",") if p.strip()]


def merge_user_profile(prefs: dict[str, Any], body: UserProfile) -> UserProfile:
    """Fill empty body lists from saved preferences."""
    skills = body.skills if body.skills else list_from_pref(prefs.get("skills"))
    courses = body.courses if body.courses else list_from_pref(prefs.get("coursework"))
    projects = body.projects if body.projects else list_from_pref(prefs.get("projects"))
    if not projects:
        projects = list_from_pref(prefs.get("experience"))

    resume_text = body.resume_text
    if not resume_text:
        resume_text = prefs.get("resume_text") or prefs.get("resumeText")
        if resume_text is not None:
            resume_text = str(resume_text).strip() or None

    return UserProfile(skills=skills, courses=courses, projects=projects, resume_text=resume_text)


def load_preferences_map(db: Any, user_id: int) -> dict[str, Any]:
    """Load merged preference dict for a learner from SQLite."""
    from app_db.models import UserProgressState

    row = db.query(UserProgressState).filter(UserProgressState.user_id == user_id).first()
    if row is None or not row.profile_preferences_json:
        return {}
    return parse_preferences_blob(row.profile_preferences_json)
