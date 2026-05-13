"""Lightweight SQLite column adds for existing deployments (create_all does not migrate)."""

from __future__ import annotations

from sqlalchemy import inspect, text

from app_db.database import engine


def ensure_user_profile_columns() -> None:
    insp = inspect(engine)
    if not insp.has_table("user_profiles"):
        return
    cols = {c["name"] for c in insp.get_columns("user_profiles")}
    with engine.begin() as conn:
        if "experience_entries_json" not in cols:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN experience_entries_json TEXT DEFAULT ''"))
        if "education_json" not in cols:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN education_json TEXT DEFAULT ''"))


def ensure_user_progress_state_columns() -> None:
    insp = inspect(engine)
    if not insp.has_table("user_progress_state"):
        return
    cols = {c["name"] for c in insp.get_columns("user_progress_state")}
    if "profile_preferences_json" in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE user_progress_state ADD COLUMN profile_preferences_json TEXT")
        )
