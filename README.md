# Group-1-Software-Engineering-Project

Software Engineering Course: Final Project

## Run the FastAPI backend

1. Install dependencies:
   ```bash
   python3 -m pip install -r requirements.txt
   ```
2. Start the API server:
   ```bash
   python3 -m uvicorn main:app --reload
   ```

The root HTML app's `script.js` calls the API on the same origin (`window.location.origin`). To point at a different backend, set `window.__API_BASE__` before loading scripts. The Vite app in `frontend/` uses `VITE_API_URL` when set (see `frontend/src/apiBase.ts`).

## API endpoints

- `GET /health` - service health check
- `GET /jobs` - list jobs, with optional query params:
  - `skills` (comma-separated)
  - `coursework` (comma-separated)
  - `experience` (comma-separated)
- `GET /jobs/filter` - same filtering behavior as `/jobs` (kept for compatibility)
