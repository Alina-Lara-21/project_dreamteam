import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "career_path")

if not MONGO_URI:
    raise ValueError("MONGO_URI not found. Check your .env file.")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

jobs = db.jobs
