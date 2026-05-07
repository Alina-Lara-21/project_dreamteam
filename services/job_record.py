"""Normalize heterogeneous job dicts (JSON, CSV, Mongo) into API Job fields."""

from __future__ import annotations

import re
from typing import Any

from services.skill_mapper import normalize_many


def _first_str(doc: dict[str, Any], keys: tuple[str, ...]) -> str:
    for k in keys:
        v = doc.get(k)
        if v is None:
            continue
        if isinstance(v, list):
            parts = [str(x).strip() for x in v if str(x).strip()]
            if parts:
                return " ".join(parts)
        s = str(v).strip()
        if s:
            return s
    return ""


def _infer_job_type_from_title(title: str) -> str:
    t = title.lower()
    if re.search(r"\bintern(ship)?\b", t):
        return "Internship"
    if "contract" in t or "contractor" in t:
        return "Contract"
    if "part-time" in t or "part time" in t:
        return "Part-time"
    if "remote" in t and "engineer" in t:
        return "Full-time"
    if any(x in t for x in ("engineer", "developer", "analyst", "scientist", "architect")):
        return "Full-time"
    return "Unspecified"


def _synthetic_description(
    title: str,
    company: str,
    skills_required: list[str],
    requirements: str,
) -> str:
    if requirements.strip():
        return requirements.strip()[:4000]
    skill_part = ", ".join(skills_required[:8]) if skills_required else "core software skills"
    return f"{title} at {company}. Focus areas include {skill_part}."


def normalize_job_record(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Map mixed dataset keys to kwargs for models.Job.
    Ensures description and job_type are non-empty strings.
    """
    jid = raw.get("id")
    if isinstance(jid, float) and jid == int(jid):
        jid = int(jid)
    if not isinstance(jid, int):
        jid = int(jid) if str(jid).isdigit() else 0

    title = _first_str(raw, ("title", "job_title", "position", "name", "Job Title")) or "(Untitled listing)"
    company = _first_str(raw, ("company", "company_name", "employer_name", "CompanyName", "organization")) or (
        "(Unknown employer)"
    )

    loc = _first_str(raw, ("location", "job_location", "city", "Location", "jobCity"))
    salary_range = _first_str(raw, ("salary_range", "salary", "compensation", "pay_range", "annual_salary"))
    if not salary_range:
        salary_range = None

    skills_raw = raw.get("skills_required")
    if isinstance(skills_raw, list):
        skills_required = normalize_many(str(x) for x in skills_raw)
    elif isinstance(skills_raw, str) and skills_raw.strip():
        skills_required = normalize_many(skills_raw.replace(";", ",").split(","))
    else:
        skills_required = []

    requirements = _first_str(
        raw,
        ("requirements", "job_requirements", "qualifications", "required_qualifications"),
    )
    if not requirements:
        requirements = None

    description = _first_str(
        raw,
        (
            "description",
            "job_description",
            "summary",
            "about_job",
            "Description",
            "skills_desc",
        ),
    )
    if not description:
        description = _synthetic_description(title, company, skills_required, requirements or "")

    job_type = _first_str(
        raw,
        (
            "job_type",
            "formatted_work_type",
            "employment_type",
            "work_type",
            "Job_Type",
            "job_employment_type",
        ),
    )
    if not job_type:
        job_type = _infer_job_type_from_title(title)

    out: dict[str, Any] = {
        "id": jid,
        "title": title,
        "company": company,
        "skills_required": skills_required,
        "salary_range": salary_range,
        "location": loc or None,
        "description": description,
        "requirements": requirements,
        "job_type": job_type,
    }
    return out
