import os
import json
import logging
import httpx
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
# Models used (Sonnet for complex tasks, Haiku for quick matches)
SONNET_MODEL = "claude-3-5-sonnet-20241022"
HAIKU_MODEL = "claude-3-5-haiku-20241022"

async def _call_claude(system_prompt: str, user_prompt: str, use_sonnet: bool = True) -> str:
    """Helper method to make async requests to Anthropic Messages API"""
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY is not set in environment variables")
        # Return fallback mock JSON if API key is missing to allow development/testing
        return "{}"

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    model = SONNET_MODEL if use_sonnet else HAIKU_MODEL

    payload = {
        "model": model,
        "max_tokens": 4000,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_prompt}
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(CLAUDE_API_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                logger.error(f"Claude API returned status {resp.status_code}: {resp.text}")
                raise ValueError(f"Claude API error: {resp.text}")
            
            data = resp.json()
            return data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Error calling Claude API: {e}")
        raise

def _clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Extract and parse JSON block from Claude response"""
    try:
        # Look for ```json ... ``` blocks
        json_match = re.search(r'```json\s*(.*?)\s*```', raw_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1).strip())
        
        # If no block, try parsing the whole raw text
        return json.loads(raw_text.strip())
    except Exception as e:
        logger.error(f"Failed to parse JSON response: {e}. Raw: {raw_text}")
        # Try to find any curly brace structure
        try:
            start_idx = raw_text.find('{')
            end_idx = raw_text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                return json.loads(raw_text[start_idx:end_idx+1])
        except Exception:
            pass
        return {}

import re # Import re for clean_json_response

# --- AI Service Methods ---

async def parse_resume_to_json(resume_text: str) -> Dict[str, Any]:
    """Parse resume text into structured fields: skills, education, experience"""
    system_prompt = (
        "You are an expert ATS resume parser. Your job is to extract education, experience, and skills "
        "from the provided resume text. Respond ONLY with a raw JSON object matching the schema below. "
        "Do not include any chat prefix or suffix. Return exactly this JSON schema:\n"
        "{\n"
        "  \"full_name\": \"...\",\n"
        "  \"email\": \"...\",\n"
        "  \"phone\": \"...\",\n"
        "  \"city\": \"...\",\n"
        "  \"state\": \"...\",\n"
        "  \"linkedin_url\": \"...\",\n"
        "  \"github_url\": \"...\",\n"
        "  \"portfolio_url\": \"...\",\n"
        "  \"experience_level\": \"fresher|intern|1-3yr|3-5yr\",\n"
        "  \"skills\": [\"skill1\", \"skill2\"],\n"
        "  \"education\": [\n"
        "    {\"degree\": \"B.Tech\", \"institution\": \"...\", \"board_or_university\": \"...\", \"field_of_study\": \"CSE-AI\", \"start_year\": 2022, \"end_year\": 2026, \"cgpa_or_percentage\": \"9.1\", \"backlogs\": 0}\n"
        "  ],\n"
        "  \"experience\": [\n"
        "    {\"company\": \"...\", \"role\": \"...\", \"employment_type\": \"internship\", \"start_date\": \"YYYY-MM-DD\", \"end_date\": \"YYYY-MM-DD|null\", \"is_current\": false, \"description\": \"bullet point description\", \"technologies\": [\"python\"]}\n"
        "  ]\n"
        "}"
    )

    user_prompt = f"Resume Text to Parse:\n\n{resume_text}"
    raw_response = await _call_claude(system_prompt, user_prompt, use_sonnet=True)
    return _clean_json_response(raw_response)

async def score_job_match(profile_data: Dict[str, Any], job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Perform semantic matching between user profile and job posting"""
    system_prompt = (
        "You are an expert career advisor. Your task is to calculate the match percentage "
        "and fraud risk index between a job listing and the user's profile. "
        "Evaluate skills, experience level, locations, salary expectations, and potential red flags. "
        "Respond ONLY with a JSON object. Return exactly this JSON structure:\n"
        "{\n"
        "  \"match_score\": 0-100,\n"
        "  \"match_reasons\": [\"reason1\", \"reason2\"],\n"
        "  \"skill_gaps\": [\"gap1\", \"gap2\"],\n"
        "  \"fake_risk_score\": 0-100,\n"
        "  \"fake_risk_reasons\": [\"reason1\"] or [],\n"
        "  \"summary\": \"2-sentence plain English summary of this job\",\n"
        "  \"should_apply\": true|false,\n"
        "  \"tailored_angle\": \"1-sentence positioning advice\"\n"
        "}"
    )

    user_prompt = f"User Profile Details:\n{json.dumps(profile_data, indent=2)}\n\nJob Details:\n{json.dumps(job_data, indent=2)}"
    # Using Haiku to minimize costs on frequent scraping runs
    raw_response = await _call_claude(system_prompt, user_prompt, use_sonnet=False)
    return _clean_json_response(raw_response)

async def generate_ats_optimized_resume(profile_data: Dict[str, Any], job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Tailor resume layout and phrasing to match job descriptions without fabrication"""
    system_prompt = (
        "You are an expert ATS resume optimizer. Aligns the candidate's achievements with key words "
        "from the target job description. Reorder bullet points and highlight relevant skills. "
        "RULES: NEVER fabricate skills, projects, or employment. Only use factual details from the user's resume. "
        "Respond ONLY with a JSON object. Return exactly this JSON structure:\n"
        "{\n"
        "  \"ats_score_before\": 0-100,\n"
        "  \"ats_score_after\": 0-100,\n"
        "  \"modified_resume_text\": \"full plain-text formatted resume template to be rendered as PDF. Organize with headers and bullet points. Use standard uppercase section titles (e.g. PROFESSIONAL SUMMARY, TECHNICAL SKILLS, WORK EXPERIENCE, PROJECTS, EDUCATION).\",\n"
        "  \"changes_made\": [\"bullet point edits summary\"],\n"
        "  \"missing_skills\": [\"skills required that candidate doesn't have\"],\n"
        "  \"keywords_added\": [\"specific keywords aligned\"],\n"
        "  \"cover_letter\": \"personalized cover letter draft for this job\"\n"
        "}"
    )

    user_prompt = f"User Profile:\n{json.dumps(profile_data, indent=2)}\n\nJob Description:\n{json.dumps(job_data, indent=2)}"
    raw_response = await _call_claude(system_prompt, user_prompt, use_sonnet=True)
    return _clean_json_response(raw_response)

async def generate_full_interview_prep(profile_data: Dict[str, Any], job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build a targeted interview preparation package based on the job and candidate profile"""
    system_prompt = (
        "You are an expert career coach specializing in B.Tech engineering interviews. "
        "Your task is to generate a comprehensive interview prep package personalized to the user's projects and the job criteria. "
        "Respond ONLY with a JSON object. Return exactly this JSON structure:\n"
        "{\n"
        "  \"company_research\": \"brief summary of the company products, culture, and known styles\",\n"
        "  \"role_overview\": \"what this role entails day-to-day\",\n"
        "  \"technical_questions\": [\n"
        "    {\"question\": \"...\", \"hint\": \"...\", \"sample_answer\": \"...\", \"difficulty\": \"easy|medium|hard\"}\n"
        "  ],\n"
        "  \"hr_questions\": [\n"
        "    {\"question\": \"...\", \"hint\": \"...\", \"what_they_look_for\": \"...\", \"sample_answer\": \"...\"}\n"
        "  ],\n"
        "  \"domain_questions\": [\n"
        "    {\"question\": \"...\", \"hint\": \"...\", \"sample_answer\": \"...\"}\n"
        "  ],\n"
        "  \"coding_topics\": [\"Arrays\", \"SQL\"],\n"
        "  \"project_tips\": \"how to pitch candidate projects in the context of this job\",\n"
        "  \"resume_talking_points\": [\"highlight bullet 1\", \"highlight bullet 2\"],\n"
        "  \"dress_code_tips\": \"professional presentation advice\",\n"
        "  \"dos_and_donts\": [\"Do study X\", \"Don't exaggerate Y\"],\n"
        "  \"estimated_rounds\": 3,\n"
        "  \"prep_resources\": [\n"
        "    {\"title\": \"LeetCode Arrays\", \"url\": \"https://leetcode.com\", \"type\": \"practice\"}\n"
        "  ]\n"
        "}"
    )

    user_prompt = f"User Profile:\n{json.dumps(profile_data, indent=2)}\n\nJob details:\n{json.dumps(job_data, indent=2)}"
    raw_response = await _call_claude(system_prompt, user_prompt, use_sonnet=True)
    return _clean_json_response(raw_response)

async def score_competition_relevance(profile_data: Dict[str, Any], comp_data: Dict[str, Any]) -> Dict[str, Any]:
    """Score hackathon/contest relevance 0-100 against candidate domain"""
    system_prompt = (
        "You are an AI hackathon coordinator. Rate the relevance of this challenge against the student's skills "
        "and preferences. Respond ONLY with a JSON object. Return exactly this JSON structure:\n"
        "{\n"
        "  \"relevance_score\": 0-100,\n"
        "  \"relevance_reasons\": [\"matches ML domain\", \"learning value\"],\n"
        "  \"recommended\": true|false\n"
        "}"
    )

    user_prompt = f"User Profile:\n{json.dumps(profile_data, indent=2)}\n\nCompetition Details:\n{json.dumps(comp_data, indent=2)}"
    raw_response = await _call_claude(system_prompt, user_prompt, use_sonnet=False)
    return _clean_json_response(raw_response)

async def grade_practice_answer(question: str, hint: str, sample_answer: str, user_answer: str) -> Dict[str, Any]:
    """Evaluate candidate answer to a mock interview question and provide constructive feedback"""
    system_prompt = (
        "You are an experienced technical interviewer. Evaluate the candidate's response to the interview question. "
        "Compare it with the sample answer and give feedback, suggestions, and a rating. "
        "Respond ONLY with a JSON object. Return exactly this JSON structure:\n"
        "{\n"
        "  \"score\": 0-100,\n"
        "  \"strengths\": [\"Clear statement of concept\"],\n"
        "  \"weaknesses\": [\"Missed complexity details\"],\n"
        "  \"improvement_tips\": [\"Mention memory complexity\"],\n"
        "  \"suggested_phrasing\": \"A more concise way to frame it is...\"\n"
        "}"
    )

    user_prompt = (
        f"Question: {question}\n"
        f"Hint: {hint}\n"
        f"Sample Answer: {sample_answer}\n"
        f"Candidate's Answer: {user_answer}"
    )
    raw_response = await _call_claude(system_prompt, user_prompt, use_sonnet=True)
    return _clean_json_response(raw_response)

async def generate_follow_up_email_draft(profile_data: Dict[str, Any], job_data: Dict[str, Any]) -> str:
    """Generate a personalized professional follow-up email draft to recruiter"""
    system_prompt = (
        "You are a professional career coach. Write a brief, polite, and persuasive follow-up email "
        "checking on the status of a job application. Highlight matching skills factually. "
        "Keep it under 150 words. Do not invent any facts outside the provided profile data. "
        "Return ONLY the plain-text email body content. Start directly with the salutation."
    )
    user_prompt = (
        f"Candidate details:\nName: {profile_data.get('full_name')}\nEmail: {profile_data.get('email')}\nSkills: {profile_data.get('skills')}\n\n"
        f"Job details:\nRole: {job_data.get('title')}\nCompany: {job_data.get('company')}\n"
    )
    raw_response = await _call_claude(system_prompt, user_prompt, use_sonnet=True)
    return raw_response.strip()

