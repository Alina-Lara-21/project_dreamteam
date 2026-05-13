# The Bridge — demo report sections

## Motivation

Students and early-career candidates struggle to connect scattered profile signals (skills, coursework, projects) with realistic job postings. Generic keyword search misses nuance; pure skill overlap ignores role context. The Bridge centralizes a learner profile, surfaces structured jobs with descriptions, and combines filtering with a lightweight AI-style ranked search so demos feel credible without running an external LLM.

## Problem statement

- Matching must use skills, saved preferences, and natural-language job descriptions—not titles alone.
- Sessions must persist across refresh so “Save profile” and “saved jobs” survive the demo.
- Operations must be clear: whether the app reads jobs from MongoDB or local JSON affects counts and content quality.

## Report structure (suggested)

1. Introduction and goals  
2. Architecture (FastAPI, SQLite profile store, Motor/Mongo jobs, static frontend)  
3. Requirements (below)  
4. Design decisions and tradeoffs  
5. Testing and demo checklist  
6. Deployment notes (Render env vars, logs)

---

## Functional requirements

| Area | Requirement |
|------|-------------|
| Profile persistence | SQLite-backed profile keyed by progress user; GET works without session (empty guest profile); POST requires `X-Progress-Code`. |
| Job descriptions | Every job exposes `description` and `job_type`; normalization fills gaps for mixed datasets. |
| AI search | `POST /ai/search` tokenizes the query (all terms must appear in job text blob), merges optional profile flags, ranks by skill match then description/query overlap. |
| Saved jobs | `GET/POST/DELETE /saved-jobs` with progress header; UI marks saved cards. |
| Resume parsing | `POST /profile/resume` accepts PDF, extracts text with pdfminer, returns merged keyword skills. |
| Load more | Jobs page and homepage list grow in steps of five. |

## Non-functional requirements

| Area | Target |
|------|--------|
| Response time | Job list and match endpoints stay responsive on the 24-job JSON catalog; cap Mongo reads via existing env caps for larger DBs. |
| Usability | Chips for search and skills; clear “Saved ✓” and profile save confirmation; `window.location.origin` for API calls. |
| Reliability | Graceful fallback to JSON when Mongo is empty or misconfigured; startup logs name the reason. |
| Maintainability | Shared `normalize_job_record` and `doc_to_job` mapping; minimal vanilla JS modules per page. |

---

## Deploy: Mongo vs JSON (Render)

On deploy, open **Logs** and find the startup line:

`Jobs startup source=...`

- `source=mongo` — `MONGO_URI` is set, Motor is installed, `USE_JSON_JOBS` is not forcing JSON, and `count_documents` on the target collection is **> 0**. Check `total_jobs=` and `mongo_db=`.
- `source=json` — inspect `fallback_reason=` in the same log line:
  - `USE_JSON_JOBS` — env explicitly forces JSON.
  - `MONGO_URI_missing` — set `MONGO_URI` in Render **Environment**.
  - `motor_missing` — ensure `motor` is in dependencies and redeploy.
  - `mongo_empty` — collection has zero documents; run `py -3 scripts/seed_jobs.py` locally against Atlas with env vars set, or insert data in Atlas UI.

**Environment variables**

| Variable | Role |
|----------|------|
| `MONGO_URI` | Connection string; if unset, app uses JSON. |
| `DB_NAME` or `JOBS_DB` | Mongo database name (default `jobs`). |
| `COLLECTION_NAME` or `JOBS_COLLECTION` | Collection name (default `jobs`). |
| `USE_JSON_JOBS` | If `true`/`1`/`yes`, always JSON. |

**Seed Mongo from the repo JSON**

```bash
set MONGO_URI=...
set DB_NAME=jobs
set COLLECTION_NAME=jobs
py -3 scripts/seed_jobs.py
```

**Backfill missing descriptions in Mongo**

```bash
py -3 scripts/add_descriptions.py
```

---

## Testing

### Automated

- Run `py -3 -m pytest tests/ -q` from the project root (tests force `USE_JSON_JOBS=true`).

### Sample API inputs/outputs

- `GET /jobs?limit=5000` → JSON with 24 jobs when using bundled `data/jobs.json` and `MIN_JOBS_FOR_DEMO=24`.
- `POST /ai/search` body `{"query":"agile python","limit":10,"skills":["python"],"use_skills":true}` → jobs whose combined text contains both `agile` and `python`, ordered by match score then overlap.

### User testing checklist

- [ ] Open `/` — total jobs shows 24; job cards show type badge and description snippet.  
- [ ] Add search chips — list filters client-side; “Load more” reveals more rows.  
- [ ] Save a job with progress code in localStorage — card shows “Saved ✓”; refresh persists via `/saved-jobs`.  
- [ ] Open `/profile` — save profile shows “Profile Saved ✓”, locks fields, “Edit Profile” unlocks.  
- [ ] Upload PDF resume — skills merge into chips when parse succeeds.  
- [ ] Open `/homepage` — five roles, load more adds five.  
- [ ] Render logs show intended `Jobs startup source=`.
