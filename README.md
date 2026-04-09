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

The frontend `script.js` reads data from FastAPI at `http://127.0.0.1:8000` by default.

## API endpoints

- `GET /health` - service health check
- `GET /jobs` - list jobs, with optional query params:
  - `skills` (comma-separated)
  - `coursework` (comma-separated)
  - `experience` (comma-separated)
- `GET /jobs/filter` - same filtering behavior as `/jobs` (kept for compatibility)
