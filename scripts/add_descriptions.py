import os

from pymongo import MongoClient


def main() -> None:
    uri = os.environ["MONGO_URI"]
    db_name = (os.environ.get("DB_NAME") or os.environ.get("JOBS_DB") or "jobs").strip()
    coll_name = (os.environ.get("COLLECTION_NAME") or os.environ.get("JOBS_COLLECTION") or "jobs").strip()
    client = MongoClient(uri)
    coll = client[db_name][coll_name]
    updated = 0
    for doc in coll.find({}):
        desc = doc.get("description")
        if isinstance(desc, str) and desc.strip():
            continue
        title = str(doc.get("title") or doc.get("job_title") or "Role").strip()
        company = str(doc.get("company") or doc.get("company_name") or "Employer").strip()
        new_desc = f"{title} at {company}. See posting for full responsibilities and qualifications."
        coll.update_one({"_id": doc["_id"]}, {"$set": {"description": new_desc}})
        updated += 1
    print(updated)


if __name__ == "__main__":
    main()
