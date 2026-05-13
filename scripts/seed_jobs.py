import json
import os
from pathlib import Path

from pymongo import MongoClient


def main() -> None:
    uri = os.environ["MONGO_URI"]
    db_name = (os.environ.get("DB_NAME") or os.environ.get("JOBS_DB") or "jobs").strip()
    coll_name = (os.environ.get("COLLECTION_NAME") or os.environ.get("JOBS_COLLECTION") or "jobs").strip()
    root = Path(__file__).resolve().parent.parent
    data_path = root / "data" / "jobs.json"
    docs = json.loads(data_path.read_text(encoding="utf-8"))
    if not isinstance(docs, list):
        raise SystemExit("jobs.json must be a JSON array")
    client = MongoClient(uri)
    coll = client[db_name][coll_name]
    coll.delete_many({})
    if docs:
        coll.insert_many(docs)
    print(coll.count_documents({}))


if __name__ == "__main__":
    main()
