from db import jobs

def create_indexes():
    jobs.create_index("job_id", unique=True)
    jobs.create_index("location")
    jobs.create_index("remote_allowed")
    jobs.create_index("formatted_work_type")
    jobs.create_index("formatted_experience_level")
    # text index for keyword searching
    jobs.create_index([("title", "text"), ("description", "text"), ("skills_desc", "text")])
    print("Indexes created successfully.")

if __name__ == "__main__":
    create_indexes()