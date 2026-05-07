import os
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
from openai import OpenAI
from models import Job, MatchResult, UserProfile
from services.skill_mapper import build_user_skill_pool, normalize_many

# Initialize AI models (load once for efficiency)
EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')  # Free, fast embedding model
OPENAI_CLIENT = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Set in .env

def _build_profile_text(user_profile: UserProfile) -> str:
    """Combine user profile into a single text for embedding."""
    skills = " ".join(user_profile.skills)
    courses = " ".join(user_profile.courses)
    projects = " ".join(user_profile.projects)
    resume = user_profile.resume_text or ""
    return f"Skills: {skills}. Courses: {courses}. Projects: {projects}. Resume: {resume}."

def _build_job_text(job: Job) -> str:
    """Combine job details into text for embedding."""
    return f"Title: {job.title}. Company: {job.company}. Skills: {' '.join(job.skills_required)}. Description: {job.description or ''}. Requirements: {job.requirements or ''}."

def _compute_similarity(profile_embedding: np.ndarray, job_embedding: np.ndarray) -> float:
    """Cosine similarity between embeddings."""
    return np.dot(profile_embedding, job_embedding) / (np.linalg.norm(profile_embedding) * np.linalg.norm(job_embedding))

def _generate_explanation_with_llm(profile_text: str, job_text: str, matched_skills: List[str]) -> str:
    """Use LLM to generate a personalized explanation."""
    prompt = f"""
    Based on this user profile: {profile_text}
    And this job: {job_text}
    Matched skills: {', '.join(matched_skills) if matched_skills else 'None'}
    Write a 1-2 sentence explanation of why this job matches the user's profile, focusing on skills, experience, and fit.
    """
    response = OPENAI_CLIENT.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100,
        temperature=0.7
    )
    return response.choices[0].message.content.strip()

def match_jobs_with_ai(user_profile: UserProfile, jobs_list: List[Job]) -> List[MatchResult]:
    profile_text = _build_profile_text(user_profile)
    profile_embedding = EMBEDDING_MODEL.encode(profile_text)
    
    user_skills = set(build_user_skill_pool(user_profile.skills, user_profile.courses, user_profile.projects))
    
    results = []
    for job in jobs_list:
        job_text = _build_job_text(job)
        job_embedding = EMBEDDING_MODEL.encode(job_text)
        
        # AI-based similarity score (0-1, scaled to 0-100)
        similarity = _compute_similarity(profile_embedding, job_embedding)
        score = int(similarity * 100)
        
        # Fallback to rule-based for matched skills
        required_skills = set(normalize_many(job.skills_required))
        matched_skills = sorted(user_skills.intersection(required_skills))
        missing_skills = sorted(required_skills.difference(user_skills))
        
        # Use LLM for explanation if score > 50, else fallback
        if score > 50:
            explanation = _generate_explanation_with_llm(profile_text, job_text, matched_skills)
        else:
            explanation = f"Low match based on profile similarity. Matched skills: {', '.join(matched_skills[:3])}."
        
        results.append(MatchResult(
            job_id=job.id,
            title=job.title,
            company=job.company,
            match_score=score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            explanation=explanation,
            salary_range=job.salary_range,
        ))
    
    return sorted(results, key=lambda item: (-item.match_score, item.title.lower()))