from __future__ import annotations


def test_jobs_returns_catalog_with_required_fields(client):
    r = client.get("/jobs?limit=5000")
    assert r.status_code == 200
    data = r.json()
    assert "jobs" in data
    n = len(data["jobs"])
    assert n == 24
    for job in data["jobs"]:
        assert job.get("id") is not None
        assert job.get("title")
        assert job.get("company")
        assert "description" in job and job["description"]
        assert "job_type" in job and job["job_type"]


def test_jobs_pagination_skip_limit(client):
    r = client.get("/jobs?skip=5&limit=5")
    assert r.status_code == 200
    assert len(r.json()["jobs"]) == 5


def test_jobs_catalog_full_despite_saved_filter_prefs(client):
    """Catalog GET /jobs must not merge saved filter prefs by default (avoids empty list on UI)."""
    r = client.post("/progress/start", json={"display_name": "Filter User", "email": "filter@example.com"})
    code = r.json()["progress_code"]
    h = {"X-Progress-Code": code}
    client.put(
        "/saved-profile/preferences",
        headers=h,
        json={"preferences": {"skills": "totally_nonexistent_skill_zzzzz"}},
    )
    r = client.get("/jobs?limit=5000", headers=h)
    assert r.status_code == 200
    assert len(r.json()["jobs"]) == 24


def test_saved_jobs_flow(client):
    r = client.post("/progress/start", json={"display_name": "Tester", "email": "tester@example.com"})
    assert r.status_code == 200
    code = r.json()["progress_code"]

    r = client.get("/saved-jobs", headers={"X-Progress-Code": code})
    assert r.status_code == 200
    assert r.json()["job_ids"] == []

    job_id = 42
    r = client.post(
        "/saved-jobs",
        headers={"X-Progress-Code": code},
        json={"job_id": job_id},
    )
    assert r.status_code == 204

    r = client.get("/saved-jobs", headers={"X-Progress-Code": code})
    assert r.status_code == 200
    assert job_id in r.json()["job_ids"]

    r = client.delete(f"/saved-jobs/{job_id}", headers={"X-Progress-Code": code})
    assert r.status_code == 204

    r = client.get("/saved-jobs", headers={"X-Progress-Code": code})
    assert r.json()["job_ids"] == []


def test_preferences_patch_delete_field(client):
    r = client.post("/progress/start", json={"display_name": "P User", "email": "p@example.com"})
    code = r.json()["progress_code"]
    h = {"X-Progress-Code": code}

    r = client.put("/saved-profile/preferences", headers=h, json={"preferences": {"skills": "java", "location": "Remote"}})
    assert r.status_code == 200
    assert r.json()["preferences"]["skills"] == "java"

    r = client.patch("/saved-profile/preferences", headers=h, json={"preferences": {"skills": "python"}})
    assert r.status_code == 200
    assert r.json()["preferences"]["skills"] == "python"
    assert r.json()["preferences"]["location"] == "Remote"

    r = client.delete("/saved-profile/preferences/location", headers=h)
    assert r.status_code == 200
    assert "location" not in r.json()["preferences"]


def test_match_merges_saved_profile(client):
    r = client.post("/progress/start", json={"display_name": "M User", "email": "m@example.com"})
    code = r.json()["progress_code"]
    client.put(
        "/saved-profile/preferences",
        headers={"X-Progress-Code": code},
        json={"preferences": {"skills": "python, sql"}},
    )
    r = client.post(
        "/match",
        headers={"X-Progress-Code": code},
        json={"skills": [], "courses": [], "projects": []},
    )
    assert r.status_code == 200
    matches = r.json()["matches"]
    assert isinstance(matches, list)
    assert len(matches) > 0


def test_match_returns_score_breakdown(client):
    r = client.post(
        "/match",
        json={
            "skills": ["python", "sql"],
            "courses": [],
            "projects": ["Software engineering intern", "frontend development with React"],
            "resume_text": "Computer science major coursework in algorithms.",
        },
    )
    assert r.status_code == 200
    matches = r.json()["matches"]
    assert len(matches) > 0
    m = matches[0]
    assert "match_score" in m
    assert "required_skills_fit" in m
    assert "profile_text_match" in m
    assert "keyword_overlap" in m
    assert 0 <= m["match_score"] <= 100
    expected_total = int(
        round((m["required_skills_fit"] + m["profile_text_match"] + m["keyword_overlap"]) / 3.0),
    )
    assert m["match_score"] == expected_total


def test_ai_search_smoke(client):
    r = client.post(
        "/ai/search",
        json={"query": "engineer", "limit": 20, "skills": ["python"]},
    )
    assert r.status_code == 200
    data = r.json()
    assert "jobs" in data and "matches" in data
    assert isinstance(data["jobs"], list)
    assert isinstance(data["matches"], list)


def test_ai_search_multi_token_and(client):
    r = client.post(
        "/ai/search",
        json={"query": "agile python", "limit": 20, "skills": ["python"], "use_skills": True},
    )
    assert r.status_code == 200
    for job in r.json()["jobs"]:
        blob = f"{job.get('title', '')} {job.get('description', '')}".lower()
        assert "python" in blob
        assert "agile" in blob


def test_profile_data_guest_without_progress_header(client):
    r = client.get("/profile/data")
    assert r.status_code == 200
    data = r.json()
    assert data["user_id"] == ""
    assert data["full_name"] == ""


def test_profile_data_empty_on_first_get(client):
    r = client.post("/progress/start", json={"display_name": "Profile User", "email": "profile@example.com"})
    assert r.status_code == 200
    code = r.json()["progress_code"]

    r = client.get("/profile/data", headers={"X-Progress-Code": code})
    assert r.status_code == 200
    data = r.json()
    assert data["user_id"]
    assert data["full_name"] == ""
    assert data["email"] == ""
    assert data["skills"] == ""
    assert data["coursework"] == ""
    assert data["experience"] == ""
    assert data["location"] == ""
    assert data["job_types"] == ""
    assert data["resume_text"] == ""
    assert data.get("experience_entries_json") == "[]"
    assert data.get("education_json") == "[]"


def test_profile_data_post_then_get_roundtrip(client):
    r = client.post("/progress/start", json={"display_name": "Roundtrip", "email": "round@example.com"})
    code = r.json()["progress_code"]
    headers = {"X-Progress-Code": code}

    payload = {
        "full_name": "Round Trip",
        "email": "round@example.com",
        "skills": "python, sql",
        "coursework": "os, db",
        "experience": "capstone project",
        "location": "Remote",
        "job_types": "Internship, Full-Time",
        "resume_text": "Built backend APIs.",
        "experience_entries_json": '[{"title":"Intern","description":"APIs"}]',
        "education_json": '[{"school":"State U"}]',
    }
    r = client.post("/profile/data", headers=headers, json=payload)
    assert r.status_code == 200
    saved = r.json()
    assert saved["full_name"] == payload["full_name"]
    assert saved["updated_at"]

    r = client.get("/profile/data", headers=headers)
    assert r.status_code == 200
    loaded = r.json()
    for key, value in payload.items():
        assert loaded[key] == value
