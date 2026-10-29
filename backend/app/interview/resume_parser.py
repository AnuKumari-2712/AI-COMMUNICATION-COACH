"""
Resume text extraction, kept deliberately separate from the interview
question-generation service (per the spec's "keep resume processing
separate from the main AI service layer") so the PDF-parsing dependency can
be swapped or removed without touching interview logic.
"""
import io
import logging

logger = logging.getLogger(__name__)


def extract_text_from_upload(filename: str, content: bytes) -> str:
    if filename.lower().endswith(".pdf"):
        return _extract_pdf_text(content)
    try:
        return content.decode("utf-8", errors="ignore")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to decode resume upload as text (%s).", exc)
        return ""


def _extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:  # noqa: BLE001
        logger.warning("PDF parsing failed (%s) — returning empty resume text.", exc)
        return ""


def analyze_resume_text(text: str) -> dict:
    import re
    from app.interview.question_bank import get_resume_based_questions

    lower = text.lower()
    words = text.split()
    word_count = len(words)

    # 1. Exhaustive Industry Technical Skills (60+ skills across CS, Web, Cloud, Data, AI)
    TECH_SKILLS_CATALOG = [
        # Languages
        "python", "java", "c++", "c#", "c", "javascript", "typescript", "golang", "go", "ruby", "rust", "php", "swift", "kotlin",
        # Web & Frameworks
        "react", "react.js", "next.js", "nextjs", "vue", "vue.js", "angular", "node.js", "nodejs", "express", "express.js",
        "fastapi", "django", "flask", "spring", "spring boot", "html", "html5", "css", "css3", "tailwind", "tailwind css",
        "bootstrap", "graphql", "rest api", "restful apis", "redux",
        # Databases & Storage
        "sql", "mysql", "postgresql", "postgres", "mongodb", "sqlite", "redis", "cassandra", "oracle", "dynamodb",
        # Cloud & DevOps
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "ci/cd", "github actions", "jenkins", "terraform",
        "linux", "bash", "git", "github", "gitlab", "nginx",
        # AI / ML / Data Science
        "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
        "pandas", "numpy", "opencv", "transformers", "spacy", "whisper", "llm", "data analysis",
        # Data & BI
        "tableau", "power bi", "excel", "spark", "kafka",
        # Core CS
        "data structures", "algorithms", "dsa", "object oriented programming", "oops", "system design", "microservices", "agile"
    ]

    found_skills_set = set()
    for s in TECH_SKILLS_CATALOG:
        pattern = r"\b" + re.escape(s) + r"\b"
        if re.search(pattern, lower):
            # Normalize casing
            if s in ["c++", "c#", "sql", "aws", "gcp", "nlp", "llm", "dsa", "oops", "html", "css", "ci/cd"]:
                found_skills_set.add(s.upper())
            elif s in ["javascript", "typescript"]:
                found_skills_set.add("JavaScript" if s == "javascript" else "TypeScript")
            elif s in ["postgresql", "postgres"]:
                found_skills_set.add("PostgreSQL")
            elif s in ["mongodb"]:
                found_skills_set.add("MongoDB")
            elif s in ["fastapi"]:
                found_skills_set.add("FastAPI")
            elif s in ["react", "react.js"]:
                found_skills_set.add("React")
            elif s in ["next.js", "nextjs"]:
                found_skills_set.add("Next.js")
            elif s in ["node.js", "nodejs"]:
                found_skills_set.add("Node.js")
            else:
                found_skills_set.add(s.title())

    found_skills = sorted(list(found_skills_set))

    # 2. Comprehensive Action Verbs (30+ power verbs)
    ACTION_VERBS = [
        "built", "developed", "designed", "implemented", "optimized", "engineered",
        "led", "managed", "created", "architected", "delivered", "deployed",
        "spearheaded", "accelerated", "automated", "resolved", "improved", "trained",
        "scaled", "collaborated", "refactored", "monitored", "integrated", "established",
        "orchestrated", "streamlined", "formulated", "executed", "analyzed", "pioneered",
        "reduced", "increased", "maximized", "transformed", "generated"
    ]
    found_verbs = sorted(list({v.title() for v in ACTION_VERBS if re.search(rf"\b{re.escape(v)}\b", lower)}))

    # 3. Section Completeness Check (Max 20 Points)
    sections_found = []
    sections_missing = []

    has_contact = bool(re.search(r"[\w\.-]+@[\w\.-]+", text) or "linkedin" in lower or "github" in lower or re.search(r"\b\d{10}\b", text))
    if has_contact:
        sections_found.append("Contact Information")
    else:
        sections_missing.append("Contact Details (Email/Phone/LinkedIn/GitHub)")

    has_education = bool(re.search(r"\b(education|academic|b\.?tech|degree|university|college|gpa|cgpa|bachelor|master)\b", lower))
    if has_education:
        sections_found.append("Education & Academics")
    else:
        sections_missing.append("Education Section")

    has_skills = bool(re.search(r"\b(skills?|technical skills?|competencies|technologies|proficiencies)\b", lower))
    if has_skills or len(found_skills) >= 4:
        sections_found.append("Technical Skills")
    else:
        sections_missing.append("Skills Section")

    has_projects = bool(re.search(r"\b(projects?|academic projects?|experience|work history|employment|internships?)\b", lower))
    if has_projects:
        sections_found.append("Projects & Experience")
    else:
        sections_missing.append("Projects / Experience Section")

    section_score = (len(sections_found) * 5)  # 4 sections * 5 = 20 pts max

    # 4. Technical Skills Score (Max 25 Points)
    if len(found_skills) >= 8:
        skill_score = 25
    elif len(found_skills) >= 5:
        skill_score = 20
    elif len(found_skills) >= 3:
        skill_score = 14
    elif len(found_skills) >= 1:
        skill_score = 8
    else:
        skill_score = 0

    # 5. Action Verbs Score (Max 20 Points)
    if len(found_verbs) >= 6:
        verb_score = 20
    elif len(found_verbs) >= 4:
        verb_score = 15
    elif len(found_verbs) >= 2:
        verb_score = 10
    elif len(found_verbs) >= 1:
        verb_score = 5
    else:
        verb_score = 0

    # 6. Quantifiable Impact & Metrics Score (Max 15 Points)
    metrics_matches = re.findall(r"(\b\d+[\%kK\+]?\b|\b\d+\.\d+\b|\b\d{2,}\b|\$\d+)", text)
    # Filter out calendar years like 2022, 2023, 2024, 2025, 2026
    actual_metrics = [m for m in metrics_matches if not re.match(r"^20\d\d$", m)]
    if len(actual_metrics) >= 4:
        metric_score = 15
    elif len(actual_metrics) >= 2:
        metric_score = 10
    elif len(actual_metrics) >= 1:
        metric_score = 6
    else:
        metric_score = 0

    # 7. Document Length & Formatting Score (Max 20 Points)
    if 200 <= word_count <= 800:
        length_score = 20
    elif 120 <= word_count < 200 or 801 <= word_count <= 1100:
        length_score = 13
    elif 60 <= word_count < 120 or 1101 <= word_count <= 1500:
        length_score = 7
    else:
        length_score = 2

    # Total ATS Score (0 - 100)
    ats_score = min(100, max(0, section_score + skill_score + verb_score + metric_score + length_score))

    # 8. Strengths Analysis
    strengths = []
    if section_score >= 15:
        strengths.append(f"Well-structured resume: Found key sections ({', '.join(sections_found[:3])}).")
    if len(found_skills) >= 5:
        strengths.append(f"Strong industry skill density: {len(found_skills)} modern technical skills detected.")
    if len(found_verbs) >= 4:
        strengths.append(f"High-impact phrasing: {len(found_verbs)} powerful action verbs utilized.")
    if len(actual_metrics) >= 2:
        strengths.append(f"Quantifiable results present: {len(actual_metrics)} measurable achievements identified.")
    if 200 <= word_count <= 750:
        strengths.append(f"Ideal length: {word_count} words fits standard 1-page engineering format.")

    # 9. Actionable Recommendations
    recommendations = []
    if sections_missing:
        recommendations.append(f"Missing standard sections: Add dedicated headers for {', '.join(sections_missing)}.")
    if len(found_skills) < 5:
        recommendations.append("Expand your technical skills section: Highlight specific frameworks, databases, and tools.")
    if len(found_verbs) < 4:
        recommendations.append("Strengthen bullet points with strong action verbs (e.g. 'Architected', 'Optimized', 'Engineered').")
    if len(actual_metrics) < 2:
        recommendations.append("Add measurable numbers and impact metrics (e.g. '% speedup', 'user count', 'data volume').")
    if word_count < 150:
        recommendations.append(f"Resume is brief ({word_count} words). Elaborate on project architecture and contributions.")
    elif word_count > 900:
        recommendations.append(f"Resume is long ({word_count} words). Aim for a concise 1-page format under 750 words.")

    # 10. Suggested Interview Questions based on actual skills and text
    questions = get_resume_based_questions(text, limit=4)

    # Count detected projects (lines under "Projects" section header)
    _project_lines = []
    _in_projects = False
    for line in text.splitlines():
        stripped = line.strip()
        if re.match(r"^(projects?|academic projects?)\s*:?$", stripped, re.IGNORECASE):
            _in_projects = True
            continue
        if _in_projects:
            if not stripped or (re.match(r"^[A-Z][a-zA-Z ]+:?$", stripped) and len(stripped.split()) <= 4 and stripped.endswith(":")):
                _in_projects = False
                continue
            if stripped:
                _project_lines.append(stripped)
    detected_projects_count = len(_project_lines)

    return {
        "word_count": word_count,
        "ats_score": ats_score,
        "section_score": section_score,
        "skill_score": skill_score,
        "verb_score": verb_score,
        "metric_score": metric_score,
        "length_score": length_score,
        "score_breakdown": {
            "sections": {
                "score": section_score,
                "max": 20,
                "found": sections_found,
                "missing": sections_missing,
            },
            "skills": {
                "score": skill_score,
                "max": 25,
            },
            "action_verbs": {
                "score": verb_score,
                "max": 20,
            },
            "metrics": {
                "score": metric_score,
                "max": 15,
                "count": len(actual_metrics),
            },
            "length": {
                "score": length_score,
                "max": 20,
                "words": word_count,
            },
        },
        "skills": found_skills,
        "action_verbs": found_verbs,
        "quantifiable_metrics_count": len(actual_metrics),
        "detected_projects_count": detected_projects_count,
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "strengths": strengths or ["Basic resume structure recognized."],
        "recommendations": recommendations or ["Resume formatting and structure meet modern ATS guidelines."],
        "suggested_questions": questions,
        "resume_text": text
    }


