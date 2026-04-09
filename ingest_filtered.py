import re
import pandas as pd
from pymongo import UpdateOne
from db import jobs

# Keywords for title/description
KEYWORDS = [
    "intern", "internship",
    "junior", "entry level", "entry-level",
    "new grad", "new graduate", "graduate",
    "co-op", "coop",
    "apprentice", "apprenticeship",
    "trainee",
]

# levels of expiernce 
ENTRY_EXP_LEVELS = {
    "internship",
    "entry level",
    "associate",   
}

KEEP_COLS = [
    "job_id",
    "company_name",
    "title",
    "description",
    "location",
    "formatted_work_type",
    "formatted_experience_level",
    "remote_allowed",
    "skills_desc",
    "min_salary",
    "med_salary",
    "max_salary",
    "pay_period",
]

_kw_re = re.compile(r"|".join(re.escape(k) for k in KEYWORDS), re.IGNORECASE)

def is_relevant(row) -> bool:
    title = str(row.get("title") or "")
    desc = str(row.get("description") or "")
    exp = str(row.get("formatted_experience_level") or "").strip().lower()

    # if experience level is internship/entry level/etc we keep 
    if exp in ENTRY_EXP_LEVELS:
        return True

    # else keep if keyword appears in title
    text = f"{title}\n{desc}"
    return bool(_kw_re.search(text))

def ingest(csv_path="postings.csv", chunksize=2000, max_jobs=None):
    total_kept = 0
    total_seen = 0

    for chunk in pd.read_csv(csv_path, chunksize=chunksize):
        total_seen += len(chunk)

        # Keep only relevant rows
        mask = chunk.apply(is_relevant, axis=1)
        filtered = chunk[mask]

        # stop once we have enough
        if max_jobs is not None and total_kept >= max_jobs:
            break

        # Only keep columns that exist
        cols = [c for c in KEEP_COLS if c in filtered.columns]
        filtered = filtered[cols]

        ops = []
        for _, row in filtered.iterrows():
            job_id = row.get("job_id")
            if pd.isna(job_id):
                continue

            doc = row.to_dict()

            # NaN -> None
            for k, v in doc.items():
                if pd.isna(v):
                    doc[k] = None

            doc["job_id"] = int(job_id) if str(job_id).isdigit() else str(job_id)

            ops.append(UpdateOne({"job_id": doc["job_id"]}, {"$set": doc}, upsert=True))

        if ops:
            jobs.bulk_write(ops, ordered=False)
            total_kept += len(ops)

        print(f"Seen ~{total_seen} rows | Kept {len(filtered)} this chunk | Total kept {total_kept}")

        if max_jobs is not None and total_kept >= max_jobs:
            print(f"Reached max_jobs={max_jobs}. Stopping early.")
            break


    print("Done. Total kept jobs:", total_kept)

if __name__ == "__main__":
    # Set max_jobs to keep it manageable while developing (change later)
    ingest(max_jobs=25000)
