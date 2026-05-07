"""SQLAlchemy ORM tables for learner progress."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from app_db.database import Base


class ProgressUser(Base):
    __tablename__ = "progress_users"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    progress_code = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("progress_users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_saved_job_per_user"),)


class UserProgressState(Base):
    __tablename__ = "user_progress_state"

    user_id = Column(
        Integer,
        ForeignKey("progress_users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    last_search_json = Column(Text, nullable=True)
    last_analysis_json = Column(Text, nullable=True)
    profile_preferences_json = Column(Text, nullable=True)
