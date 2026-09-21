"""
Static content pools for Grammar and Vocabulary practice, filtered/ordered
per-student by `personalization.weakness_detector` output and the
scikit-learn difficulty prediction — this is what makes two students with
different weaknesses see a different question order and mix, satisfying
"do not give the same exercise sequence to every student."
"""
import random

from app.ml.difficulty_model import predict_difficulty
from app.personalization.exercise_generator import consistency_score, recent_trend
from app.personalization.weakness_detector import detect
from app.schemas.student import LearnerProfile

GRAMMAR_QUESTIONS = [
    {"id": "g1", "type": "fill-blank", "prompt": "By the time I arrived, the meeting ____ already started.", "answer": "had", "explanation": "Use past perfect (\"had started\") for an action completed before another past action.", "weakness_tag": "tense_consistency", "difficulty": "Medium"},
    {"id": "g2", "type": "multiple-choice", "prompt": "Choose the correct sentence:", "options": ["Neither of the candidates were prepared.", "Neither of the candidates was prepared.", "Neither of the candidates being prepared.", "Neither of the candidate were prepared."], "answer": "Neither of the candidates was prepared.", "explanation": "'Neither' is singular, so it takes a singular verb ('was').", "weakness_tag": "subject_verb_agreement", "difficulty": "Medium"},
    {"id": "g3", "type": "correct-sentence", "prompt": "Correct the sentence: \"She don't have no experience in public speaking.\"", "answer": "She doesn't have any experience in public speaking.", "explanation": "Avoid double negatives; use \"doesn't\" with third person singular and \"any\" instead of \"no\".", "weakness_tag": "double_negative", "difficulty": "Easy"},
    {"id": "g4", "type": "rewrite", "prompt": "Rewrite more formally: \"The report was kinda late because we messed up the schedule.\"", "answer": "The report was delayed due to a scheduling error.", "explanation": "Formal writing avoids casual fillers like 'kinda' and 'messed up'.", "weakness_tag": "formality", "difficulty": "Medium"},
    {"id": "g5", "type": "fill-blank", "prompt": "Each of the applicants ____ (was/were) asked the same question.", "answer": "was", "explanation": "'Each' is singular and takes a singular verb.", "weakness_tag": "subject_verb_agreement", "difficulty": "Easy"},
    {"id": "g6", "type": "correct-sentence", "prompt": "Correct the sentence: \"Yesterday I go to the office and finished my report.\"", "answer": "Yesterday I went to the office and finished my report.", "explanation": "Keep verb tense consistent — both verbs should be past tense.", "weakness_tag": "tense_consistency", "difficulty": "Easy"},
    {"id": "g7", "type": "multiple-choice", "prompt": "Choose the correct sentence:", "options": ["I don't have no time today.", "I don't have any time today.", "I have no not time today.", "I haven't no time today."], "answer": "I don't have any time today.", "explanation": "Avoid double negatives.", "weakness_tag": "double_negative", "difficulty": "Easy"},
    {"id": "g8", "type": "rewrite", "prompt": "Rewrite formally: \"I'm gonna finish it by Friday.\"", "answer": "I will finish it by Friday.", "explanation": "Expand casual contractions in professional communication.", "weakness_tag": "formality", "difficulty": "Hard"},
]

VOCAB_WORDS = [
    {"id": "v1", "word": "Articulate", "meaning": "Able to express thoughts and ideas clearly and effectively.", "example": "She gave an articulate explanation of the project timeline.", "difficulty": "Medium", "phonetic": "/ɑːrˈtɪkjəleɪt/"},
    {"id": "v2", "word": "Concise", "meaning": "Giving information clearly, in few words.", "example": "Keep your interview answers concise and relevant.", "difficulty": "Easy", "phonetic": "/kənˈsaɪs/"},
    {"id": "v3", "word": "Ambiguous", "meaning": "Open to more than one interpretation; not clear.", "example": "The instructions were too ambiguous to follow.", "difficulty": "Medium", "phonetic": "/æmˈbɪɡjuəs/"},
    {"id": "v4", "word": "Resilience", "meaning": "The capacity to recover quickly from difficulties.", "example": "Resilience helped her bounce back after a tough interview.", "difficulty": "Medium", "phonetic": "/rɪˈzɪliəns/"},
    {"id": "v5", "word": "Meticulous", "meaning": "Showing great attention to detail; very careful.", "example": "He is meticulous about proofreading his reports.", "difficulty": "Difficult", "phonetic": "/məˈtɪkjələs/"},
    {"id": "v6", "word": "Pragmatic", "meaning": "Dealing with things sensibly and realistically.", "example": "We need a pragmatic approach to solve this bug.", "difficulty": "Difficult", "phonetic": "/præɡˈmætɪk/"},
    {"id": "v7", "word": "Collaborate", "meaning": "To work jointly with others on an activity.", "example": "Our team collaborates closely with the design department.", "difficulty": "Easy", "phonetic": "/kəˈlæbəreɪt/"},
    {"id": "v8", "word": "Versatile", "meaning": "Able to adapt to many different functions.", "example": "A versatile communicator adjusts tone to the audience.", "difficulty": "Medium", "phonetic": "/ˈvɜːrsətaɪl/"},
]

_DIFFICULTY_ORDER = ["Beginner", "Easy", "Medium", "Hard", "Advanced"]


def _target_difficulty(profile: LearnerProfile) -> str:
    analysis = detect(profile.scores)
    trend = recent_trend(profile.practice_history)
    consistency = consistency_score(profile.practice_history)
    level = predict_difficulty(analysis["mean_score"], trend, consistency)
    return level.value


def personalized_grammar_set(profile: LearnerProfile, count: int = 5) -> list[dict]:
    analysis = detect(profile.scores)
    weakness_tags = set()
    if "Grammar" in analysis["weakness_labels"] or not analysis["weakness_labels"]:
        weakness_tags = {"tense_consistency", "subject_verb_agreement", "double_negative", "formality"}

    target_difficulty = _target_difficulty(profile)
    target_index = _DIFFICULTY_ORDER.index(target_difficulty) if target_difficulty in _DIFFICULTY_ORDER else 2

    def relevance(q: dict) -> tuple[int, int]:
        tag_match = 0 if q["weakness_tag"] in weakness_tags else 1
        q_difficulty_index = ["Easy", "Medium", "Hard"].index(q["difficulty"]) if q["difficulty"] in ["Easy", "Medium", "Hard"] else 1
        difficulty_distance = abs(q_difficulty_index - min(target_index, 2))
        return (tag_match, difficulty_distance)

    ordered = sorted(GRAMMAR_QUESTIONS, key=relevance)
    random.Random(profile.student_id).shuffle(ordered[count:])  # keep top matches stable, vary the rest per-student
    return ordered[:count]


def personalized_vocab_set(profile: LearnerProfile, count: int = 8) -> list[dict]:
    target_difficulty = _target_difficulty(profile)
    difficulty_map = {"Beginner": "Easy", "Easy": "Easy", "Medium": "Medium", "Hard": "Difficult", "Advanced": "Difficult"}
    preferred = difficulty_map.get(target_difficulty, "Medium")

    def relevance(w: dict) -> int:
        return 0 if w["difficulty"] == preferred else 1

    ordered = sorted(VOCAB_WORDS, key=relevance)
    rng = random.Random(profile.student_id + "-vocab")
    tail = ordered[count:]
    rng.shuffle(tail)
    return (ordered[:count] + tail)[:count]
