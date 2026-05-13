"""MongoDB job loading via Motor — field mapping is provisional until verified against dataset keys."""

from __future__ import annotations

import hashlib
import logging
import os
from typing import Any

from models import Job
from services.job_record import normalize_job_record
from services.skill_mapper import normalize_many

logger = logging.getLogger(__name__)

# TODO verify every key below against output of list(sample_document.keys())


def stable_int_job_id(doc: dict[str, Any]) -> int:
    """Stable positive int job id for API / matcher. Prefer numeric fields from dataset over hashing _id."""

    # TODO verify which numeric id field exists on your Kaggle LinkedIn / Indeed dataset
    for key in ("id", "job_id", "listing_id", "linkedin_job_id"):  # common variants
        v = doc.get(key)
        if isinstance(v, bool):
            continue
        if isinstance(v, int):
            out = v % (2**31 - 1)
            return out if out != 0 else 1
        if isinstance(v, float) and v == int(v):
            out = int(v) % (2**31 - 1)
            return out if out != 0 else 1

    oid = doc.get("_id")
    payload = str(oid).encode("utf-8", errors="replace")
    h = hashlib.sha256(payload).hexdigest()
    return max(1, int(h[:12], 16) % (2**31 - 1))


def _skills_list_from_doc(doc: dict[str, Any]) -> list[str]:
    """
    Produce skills_required as a list[str] (normalized), never None.
    # TODO verify which field holds skills strings vs lists on your dataset
    """

    candidates: list[Any] = []

    raw_list_keys = ("skills_required", "skills", "skill_list", "required_skills", "job_skills")
    raw_str_keys = (
        "requirements",
        "job_requirements",
        "required_qualifications",
        "skills_notes",
        "description",  # sometimes skills embedded — TODO narrow if noisy
    )

    for k in raw_list_keys:
        v = doc.get(k)
        if isinstance(v, list):
            candidates.extend(str(x) for x in v)

    combined_str = ""
    for k in raw_str_keys:
        v = doc.get(k)
        if isinstance(v, str) and v.strip():
            combined_str += " " + v

    csv_keys = ("skills_str", "skill_string", "tech_stack")  # TODO verify dataset
    for k in csv_keys:
        v = doc.get(k)
        if isinstance(v, str) and v.strip():
            combined_str += " " + v

    tokens: list[str] = []
    if candidates:
        tokens.extend(normalize_many(candidates))

    parts = combined_str.replace(";", ",").split(",") if combined_str else []
    if parts:
        tokens.extend(normalize_many(parts))

    if not tokens and combined_str.strip():
        tokens = normalize_many(combined_str.split())

    return tokens


def doc_to_job(doc: dict[str, Any]) -> Job:
    jid = stable_int_job_id(doc)
    merged: dict[str, Any] = dict(doc)
    merged["id"] = jid
    merged["description"] = doc.get("description", "") or merged.get("description", "")
    merged["job_type"] = doc.get("job_type", "") or merged.get("job_type", "")
    skills_required = _skills_list_from_doc(doc)
    if skills_required:
        merged["skills_required"] = skills_required
    return Job(**normalize_job_record(merged))


def jobs_collection(database: Any) -> Any:
    """Return the postings collection (Motor AsyncIOMotorDatabase[col])."""
    coll_name = os.environ.get("COLLECTION_NAME") or os.environ.get("JOBS_COLLECTION", "jobs")
    return database[coll_name]


async def fetch_jobs_raw(
    collection: Any,
    *,
    skip: int = 0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    cursor = collection.find({}).skip(max(0, skip)).limit(limit)
    return await cursor.to_list(length=limit)


async def fetch_jobs_cap(
    collection: Any,
    cap: int,
) -> list[dict[str, Any]]:
    cursor = collection.find({}).limit(max(1, cap))
    return await cursor.to_list(length=cap)


async def find_document_by_numeric_job_id(
    collection: Any,
    job_id: int,
) -> dict[str, Any] | None:
    """
    Prefer indexed lookup via known id columns; fall back to limited scan matching doc_to_job id.
    # TODO replace scan with authoritative index once dataset stabilizes.
    """

    find_keys = ("id", "job_id", "listing_id")  # TODO verify
    for key in find_keys:
        doc_guess = await collection.find_one({"$or": [{key: job_id}, {key: str(job_id)}]})
        if doc_guess is not None:
            return doc_guess

    scan_cap = int(os.environ.get("GET_JOB_SCAN_CAP", "5000"))
    async for doc in collection.find({}).limit(scan_cap):
        try:
            if doc_to_job(doc).id == job_id:
                return doc
        except Exception as ex:  # noqa: BLE001 — skip malformed docs
            logger.debug("Skipping malformed job doc: %s", ex)
            continue
    return None


async def count_jobs(collection: Any) -> int:
    return await collection.count_documents({})
