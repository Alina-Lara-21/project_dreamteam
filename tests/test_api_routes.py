from __future__ import annotations


def test_jobs_returns_2000_with_required_fields(client):
    r = client.get("/jobs?limit=2000")
    assert r.status_code == 200
    data = r.json()
    assert "jobs" in data
    assert len(data["jobs"]) == 2000
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
