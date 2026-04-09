import pandas as pd
from pymongo import UpdateOne
from db import jobs

# Columns we care about for the app (safe if some are missing)
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

def ingest(csv_path="postings.csv", chunksize=2000):
    total = 0

    # Read the big CSV in chunks (prevents memory crashes)
    for chunk in pd.read_csv(csv_path, chunksize=chunksize):
        cols = [c for c in KEEP_COLS if c in chunk.columns]
        chunk = chunk[cols]

        ops = []
        for _, row in chunk.iterrows():
            job_id = row.get("job_id")
            if pd.isna(job_id):
                continue

            doc = row.to_dict()

            # Convert NaN -> None (MongoDB-friendly)
            for k, v in doc.items():
                if pd.isna(v):
                    doc[k] = None

            # Stable job_id type
            doc["job_id"] = int(job_id) if str(job_id).isdigit() else str(job_id)

            ops.append(UpdateOne({"job_id": doc["job_id"]}, {"$set": doc}, upsert=True))

        if ops:
            jobs.bulk_write(ops, ordered=False)
            total += len(ops)
            print(f"Upserted {len(ops)} jobs (total {total})")

    print(" Done. Total jobs upserted:", total)

if __name__ == "__main__":
    ingest()
