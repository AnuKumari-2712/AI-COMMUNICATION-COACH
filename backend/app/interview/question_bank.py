"""
Interview question bank: fixed categories, plus generators for resume-based
and job-role-based interviews (sections 25/26 of the spec) that build
questions from what the student actually submits rather than a static list.
"""
import re

CATEGORIES = [
    {"id": "hr", "title": "HR Interview", "description": "General fit, motivation and background questions.", "question_count": 5, "duration_minutes": 15, "difficulty": "Easy"},
    {"id": "technical", "title": "Technical Interview", "description": "Role-specific technical and problem-solving questions.", "question_count": 5, "duration_minutes": 25, "difficulty": "Hard"},
    {"id": "behavioral", "title": "Behavioral Interview", "description": "STAR-format questions about past experiences.", "question_count": 5, "duration_minutes": 20, "difficulty": "Medium"},
    {"id": "self_intro", "title": "Self Introduction", "description": "Practice a confident, structured self-introduction.", "question_count": 3, "duration_minutes": 8, "difficulty": "Easy"},
    {"id": "resume", "title": "Resume-based Interview", "description": "Questions generated from your uploaded resume.", "question_count": 5, "duration_minutes": 15, "difficulty": "Medium"},
    {"id": "job_role", "title": "Job-role based Interview", "description": "Questions tailored to a specific target role.", "question_count": 5, "duration_minutes": 20, "difficulty": "Hard"},
    {"id": "mock", "title": "Full Mock Interview", "description": "End-to-end simulation across all rounds.", "question_count": 8, "duration_minutes": 40, "difficulty": "Hard"},
]

_FIXED_QUESTIONS = {
    "hr": [
        "Tell me about yourself.",
        "Why do you want to join our company?",
        "Where do you see yourself in 5 years?",
        "What are your greatest strengths and weaknesses?",
        "Why should we hire you?",
    ],
    "technical": [
        "Explain how a hash map works and its average time complexity.",
        "How would you design a URL shortener?",
        "What is the difference between SQL and NoSQL databases?",
        "Walk me through how you would debug a slow API endpoint.",
        "Explain the difference between processes and threads.",
    ],
    "behavioral": [
        "Describe a time you handled conflict within a team.",
        "Tell me about a failure and what you learned from it.",
        "Describe a time you had to meet a tight deadline.",
        "Tell me about a time you led a project or initiative.",
        "Describe a situation where you had to persuade someone.",
    ],
    "self_intro": [
        "Introduce yourself in under two minutes.",
        "What makes you a good fit for this field?",
        "Summarize your academic and project background.",
    ],
}

_ROLE_QUESTION_TEMPLATES = {
    "software developer": [
        "Walk me through a project where you built a full-stack feature end-to-end.",
        "How do you approach writing testable, maintainable code?",
        "Describe your experience with version control and code review.",
    ],
    "full stack developer": [
        "How do you decide what logic belongs on the frontend vs the backend?",
        "Describe a time you optimized an application's performance.",
        "How do you handle state management in a complex UI?",
    ],
    "ai/ml engineer": [
        "Explain the bias-variance tradeoff in your own words.",
        "Describe a machine learning project you've worked on end-to-end.",
        "How would you handle an imbalanced dataset?",
    ],
    "data analyst": [
        "Walk me through how you'd approach a messy, incomplete dataset.",
        "Describe a time your analysis changed a business decision.",
        "How do you decide which chart to use for a given dataset?",
    ],
}

_SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "react", "node", "sql", "aws", "docker",
    "kubernetes", "machine learning", "deep learning", "tensorflow", "pytorch", "django",
    "flask", "fastapi", "spring", "figma", "excel", "tableau", "power bi",
]


def get_categories() -> list[dict]:
    return CATEGORIES


def get_fixed_questions(category_id: str) -> list[str]:
    return _FIXED_QUESTIONS.get(category_id, _FIXED_QUESTIONS["hr"])


def get_job_role_questions(job_role: str, limit: int = 5) -> list[str]:
    role_key = job_role.strip().lower()
    templates = _ROLE_QUESTION_TEMPLATES.get(role_key, [])
    base = [
        f"What excites you most about working as a {job_role}?",
        f"What do you think are the top 3 skills every {job_role} needs, and which do you have?",
    ]
    combined = templates + base + _FIXED_QUESTIONS["hr"]
    return combined[:limit]


def get_resume_based_questions(resume_text: str, career_goal: str = "", limit: int = 5) -> list[str]:
    lower = resume_text.lower()
    found_skills = [s for s in _SKILL_KEYWORDS if s in lower]

    project_lines = []
    in_projects = False
    for line in resume_text.splitlines():
        stripped = line.strip()
        if re.match(r"^(projects?|academic projects?)\s*:?$", stripped, re.IGNORECASE):
            in_projects = True
            continue
        if in_projects:
            if not stripped or re.match(r"^[A-Z][a-zA-Z ]+:?$", stripped) and len(stripped.split()) <= 4 and stripped.isupper() is False and stripped.endswith(":"):
                in_projects = False
                continue
            if stripped:
                project_lines.append(stripped)

    questions = []
    for skill in found_skills[:2]:
        questions.append(f"I see {skill.title()} on your resume — walk me through how you've used it in a real project.")
    for project in project_lines[:2]:
        questions.append(f"Tell me more about this: \"{project[:90]}\" — what was your specific contribution?")

    questions.append(f"Why did you choose to pursue {career_goal or 'this career path'} based on your background?")
    questions.extend(_FIXED_QUESTIONS["hr"][:2])
    return questions[:limit] if questions else _FIXED_QUESTIONS["hr"][:limit]
