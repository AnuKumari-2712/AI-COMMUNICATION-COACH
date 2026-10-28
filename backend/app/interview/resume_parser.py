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
    from app.interview.question_bank import _SKILL_KEYWORDS, get_resume_based_questions

    lower = text.lower()
    words = text.split()
    word_count = len(words)

    # 1. Skill Extraction
    found_skills = [s.title() for s in _SKILL_KEYWORDS if re.search(rf"\b{re.escape(s)}\b", lower)]

    # 2. Action Verbs Extraction
    action_verbs_list = [
        "built", "developed", "designed", "implemented", "optimized", "engineered",
        "led", "managed", "created", "architected", "delivered", "deployed",
        "spearheaded", "accelerated", "automated", "resolved", "improved", "trained",
        "scaled", "collaborated", "refactored", "monitored", "integrated"
    ]
    found_verbs = [v.title() for v in action_verbs_list if re.search(rf"\b{re.escape(v)}\b", lower)]

    # 3. Project lines detection
    project_lines = []
    in_projects = False
    for line in text.splitlines():
        stripped = line.strip()
        if re.match(r"^(projects?|academic projects?|experience|work history)\s*:?$", stripped, re.IGNORECASE):
            in_projects = True
            continue
        if in_projects:
            if not stripped or (re.match(r"^[A-Z][a-zA-Z ]+:?$", stripped) and len(stripped.split()) <= 4 and not stripped.endswith(".")):
                in_projects = False
                continue
            if len(stripped) > 15:
                project_lines.append(stripped)

    # 4. ATS & Quality Scoring
    base_score = 45
    skills_score = min(25, len(found_skills) * 4)
    verbs_score = min(15, len(found_verbs) * 3)
    length_score = 15 if (150 <= word_count <= 800) else (8 if word_count > 800 else 5)
    ats_score = min(100, base_score + skills_score + verbs_score + length_score)

    # 5. Strengths & Recommendations
    strengths = []
    if len(found_skills) >= 4:
        strengths.append(f"Strong technical stack: {len(found_skills)} relevant industry skills identified.")
    if len(found_verbs) >= 4:
        strengths.append(f"High-impact phrasing: {len(found_verbs)} professional action verbs utilized.")
    if 250 <= word_count <= 650:
        strengths.append(f"Ideal length: {word_count} words fits well within the 1-2 page standard.")

    recommendations = []
    if len(found_skills) < 4:
        recommendations.append("Highlight more specific technical competencies (e.g. frameworks, databases, cloud tools).")
    if len(found_verbs) < 4:
        recommendations.append("Use stronger action verbs (e.g., 'Architected', 'Spearheaded', 'Optimized') at the start of bullet points.")
    if not re.search(r"\b(\d+[\%kK]?|\$\d+|\d+x)\b", text):
        recommendations.append("Include quantifiable impact and metrics (e.g., 'improved performance by 25%', 'handled 10k users').")
    if word_count < 150:
        recommendations.append("Resume appears too brief. Add more project descriptions and internship details.")

    # 6. Suggested interview questions
    questions = get_resume_based_questions(text, limit=4)

    return {
        "word_count": word_count,
        "ats_score": ats_score,
        "skills": found_skills,
        "action_verbs": found_verbs,
        "detected_projects_count": len(project_lines),
        "strengths": strengths or ["Good foundational resume content."],
        "recommendations": recommendations or ["Resume formatting and structure meet modern standards."],
        "suggested_questions": questions,
        "resume_text": text
    }

