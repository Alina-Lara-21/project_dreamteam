# DreamTeam Job Matching System

Software Engineering Final Project

## Overview

DreamTeam Job Matching System is a web-based application designed to help users match their skills, coursework, and experience with available job postings. The system uses filtering and matching algorithms to recommend relevant jobs and provide an interactive user experience.

The project combines a FastAPI backend with a frontend interface built using HTML, CSS, JavaScript, and TypeScript components.

---

## Features

- Job matching based on:
  - Skills
  - Coursework
  - Experience
- FastAPI backend API
- Interactive frontend pages
- User profile management
- Job tracking functionality
- Filtering and comparison tools
- Database integration
- Automated data ingestion scripts
- Skill extraction and matching algorithms

---

## Project Structure

```text
project_dreamteam/
│
├── frontend/              # Frontend application
├── routers/               # API route handlers
├── services/              # Backend services
├── app_db/                # Database files
├── data/                  # Data storage
├── images/                # Project images/assets
│
├── main.py                # Main FastAPI application
├── db.py                  # Database connection logic
├── models.py              # Database models
├── matching.py            # Job matching logic
├── skill_extraction.py    # Skill extraction utilities
├── requirements.txt       # Python dependencies
└── README.md
