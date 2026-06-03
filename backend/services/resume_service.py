"""
Resume Parser & Job Match Scorer
Extracts skills from resume text and scores job match %
"""
import re
from typing import List


# Tech skills organized by category
SKILL_CATEGORIES = {
    "languages": [
        "python", "java", "javascript", "typescript", "c++", "c", "c#",
        "go", "rust", "kotlin", "swift", "r", "matlab", "scala", "php",
        "ruby", "dart", "bash", "shell"
    ],
    "ai_ml": [
        "machine learning", "deep learning", "neural network", "nlp",
        "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn",
        "sklearn", "pandas", "numpy", "opencv", "hugging face", "transformers",
        "llm", "generative ai", "data science", "data analysis",
        "reinforcement learning", "yolo", "bert", "gpt"
    ],
    "web": [
        "react", "next.js", "vue", "angular", "html", "css", "tailwind",
        "node.js", "express", "fastapi", "flask", "django", "rest api",
        "graphql", "redux", "bootstrap", "sass"
    ],
    "database": [
        "sql", "mysql", "postgresql", "mongodb", "supabase", "firebase",
        "redis", "elasticsearch", "sqlite", "oracle", "cassandra"
    ],
    "devops": [
        "docker", "kubernetes", "aws", "azure", "gcp", "git", "github",
        "ci/cd", "linux", "terraform", "ansible", "jenkins"
    ],
    "tools": [
        "jupyter", "vscode", "postman", "figma", "excel", "tableau",
        "power bi", "selenium", "scrapy", "beautifulsoup"
    ],
}

ALL_SKILLS = []
for skills in SKILL_CATEGORIES.values():
    ALL_SKILLS.extend(skills)


def extract_skills_from_resume(resume_text: str) -> List[str]:
    """Extract technical skills from resume text"""
    if not resume_text:
        return []

    text_lower = resume_text.lower()
    found_skills = []

    for skill in ALL_SKILLS:
        # Check for exact match or near-match
        if skill in text_lower:
            found_skills.append(skill)

    # Also extract education level
    if any(word in text_lower for word in ["b.tech", "btech", "b.e", "be "]):
        found_skills.append("btech")
    if any(word in text_lower for word in ["m.tech", "mtech", "m.e", "mca"]):
        found_skills.append("mtech")

    return list(set(found_skills))


def calculate_match_score(
    job_title: str,
    job_description: str,
    job_requirements: List[str],
    candidate_skills: List[str],
    preferred_roles: List[str] = None,
) -> int:
    """
    Returns match score 0-100 between job and candidate profile
    """
    if not candidate_skills:
        return 50  # Default if no resume uploaded

    score = 0
    job_text = f"{job_title} {job_description} {' '.join(job_requirements or [])}".lower()
    candidate_skill_set = set(s.lower() for s in candidate_skills)

    # --- Skill overlap (60% weight) ---
    job_skills_found = []
    for skill in ALL_SKILLS:
        if skill in job_text:
            job_skills_found.append(skill)

    if job_skills_found:
        matching = candidate_skill_set.intersection(set(job_skills_found))
        skill_score = (len(matching) / len(job_skills_found)) * 60
        score += skill_score

    # --- Role relevance (25% weight) ---
    cse_ai_keywords = [
        "cse", "computer science", "artificial intelligence", "machine learning",
        "software", "data", "developer", "engineer", "analyst", "python",
        "backend", "frontend", "fullstack", "ai", "ml", "nlp", "deep learning"
    ]
    role_matches = sum(1 for kw in cse_ai_keywords if kw in job_text)
    role_score = min(role_matches * 5, 25)
    score += role_score

    # --- Preferred roles bonus (15% weight) ---
    if preferred_roles:
        for role in preferred_roles:
            if role.lower() in job_text:
                score += 15
                break

    # --- AI/ML specific bonus (Somesh's branch) ---
    ai_keywords = ["ai", "ml", "machine learning", "deep learning", "data science", "nlp"]
    if any(kw in job_text for kw in ai_keywords):
        score += 10

    return min(int(score), 100)
