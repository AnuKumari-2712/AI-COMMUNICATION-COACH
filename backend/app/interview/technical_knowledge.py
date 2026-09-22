"""
MODULE 8 (see AUDIT.md): technical answer correctness.

Before this module, a technical interview answer was scored only on
grammar/vocabulary/structure/fluency — nothing checked whether the
answer's actual technical content was right, partially right, wrong, or
just too thin to judge. An answer that "sounded professional" (good
grammar, confident tone, reasonable length) could score well while being
factually incorrect, and nothing would catch that.

Real automated correctness-checking would require either a large curated
answer-key model or an LLM judge — neither exists in this project. The
honest, implementable alternative used here is a small, manually-curated
concept checklist for each of the five FIXED technical questions in
question_bank.py (the only technical questions with a stable, known-in-
advance correct answer shape). Each concept lists the phrasings/keywords
that indicate a candidate actually mentioned it. This is checked, not
"understood" — a candidate who used the right words in a nonsensical
sentence would still be credited, and a candidate who explained the
concept correctly using entirely different words would be missed. Both
limitations are documented in AUDIT.md, not hidden.

Dynamic technical-sounding questions (resume-based, job-role-based) have
no known-in-advance correct answer, so there is no checklist for them —
`evaluate_technical_correctness` honestly reports `applicable=False`
rather than fabricating a verdict for a question it has no answer key for.
"""

# Each concept: "name" (shown to the caller) + "keywords" (any one, case-
# insensitive substring match, counts as "mentioned"). `required=True`
# concepts must be present for a fully "correct" verdict; `required=False`
# concepts are bonus points that show deeper understanding but aren't
# mandatory for a baseline correct answer.
_TECHNICAL_CHECKLISTS: dict[str, list[dict]] = {
    "explain how a hash map works and its average time complexity.": [
        {"name": "hash function / hashing", "keywords": ["hash function", "hashing", "hash code", "hashes the key"], "required": True},
        {"name": "key-value storage in buckets/array", "keywords": ["key-value", "key and value", "bucket", "buckets", "array of"], "required": True},
        {"name": "average O(1) time complexity", "keywords": ["o(1)", "constant time", "average case"], "required": True},
        {"name": "collision handling", "keywords": ["collision", "chaining", "open addressing", "linked list"], "required": False},
    ],
    "how would you design a url shortener?": [
        {"name": "generating a short code (hash/encoding)", "keywords": ["hash", "base62", "short code", "short url", "encode", "random string"], "required": True},
        {"name": "storing the mapping (database/key-value store)", "keywords": ["database", "mapping", "key-value store", "store the", "lookup table"], "required": True},
        {"name": "redirect mechanism", "keywords": ["redirect", "301", "302"], "required": True},
        {"name": "scalability considerations", "keywords": ["scale", "distributed", "cache", "load balancer", "sharding"], "required": False},
    ],
    "what is the difference between sql and nosql databases?": [
        {"name": "schema (structured vs flexible/schema-less)", "keywords": ["schema", "structured", "unstructured", "schema-less", "schemaless", "flexible schema", "fixed schema"], "required": True},
        {"name": "relational tables vs non-relational documents/key-value", "keywords": ["relational", "non-relational", "tables", "documents", "key-value", "graph database", "column"], "required": True},
        {"name": "scalability approach (vertical vs horizontal)", "keywords": ["vertical scaling", "horizontal scaling", "scale up", "scale out", "sharding"], "required": True},
        {"name": "consistency model (ACID vs BASE/eventual)", "keywords": ["acid", "base", "eventual consistency", "consistency model"], "required": False},
    ],
    "walk me through how you would debug a slow api endpoint.": [
        {"name": "measure/profile before guessing", "keywords": ["profile", "profiling", "logging", "logs", "metrics", "monitor", "measure"], "required": True},
        {"name": "check database queries", "keywords": ["database query", "slow query", "index", "n+1", "query performance", "queries"], "required": True},
        {"name": "check network/external calls", "keywords": ["network", "external api", "third-party", "latency", "downstream"], "required": False},
        {"name": "consider caching as a fix", "keywords": ["cache", "caching"], "required": False},
    ],
    "explain the difference between processes and threads.": [
        {"name": "separate vs shared memory space", "keywords": ["memory space", "shared memory", "separate memory", "address space"], "required": True},
        {"name": "process is independent, thread is a unit within a process", "keywords": ["independent", "lightweight", "within a process", "subset of a process", "part of a process"], "required": True},
        {"name": "context switching cost", "keywords": ["context switch", "overhead"], "required": False},
        {"name": "inter-process vs inter-thread communication", "keywords": ["ipc", "inter-process communication", "shared variables"], "required": False},
    ],
}

_MIN_WORDS_FOR_JUDGEABLE_ANSWER = 6


def evaluate_technical_correctness(question: str, answer: str) -> dict:
    key = (question or "").strip().lower()
    checklist = _TECHNICAL_CHECKLISTS.get(key)

    if checklist is None:
        return {
            "applicable": False,
            "verdict": None,
            "matched_concepts": [],
            "missing_concepts": [],
            "bonus_concepts_mentioned": [],
            "score": None,
            "explanation": (
                "No verified concept checklist exists for this question — technical correctness "
                "is only automatically checkable for this project's fixed technical-interview "
                "question set, not for dynamically generated resume/job-role questions."
            ),
        }

    lower_answer = (answer or "").lower()
    word_count = len(answer.split()) if answer else 0

    required = [c for c in checklist if c["required"]]
    bonus = [c for c in checklist if not c["required"]]

    matched_required = [c["name"] for c in required if any(k in lower_answer for k in c["keywords"])]
    missing_required = [c["name"] for c in required if c["name"] not in matched_required]
    matched_bonus = [c["name"] for c in bonus if any(k in lower_answer for k in c["keywords"])]

    coverage = len(matched_required) / len(required) if required else 1.0
    score = round(coverage * 100, 1)

    if word_count < _MIN_WORDS_FOR_JUDGEABLE_ANSWER:
        verdict = "insufficient"
        explanation = f"Answer is only {word_count} word(s) — too short to demonstrate whether the required concepts ({', '.join(c['name'] for c in required)}) are understood."
    elif coverage >= 0.75:
        verdict = "correct"
        explanation = f"Covers the key required concepts: {', '.join(matched_required)}."
        if missing_required:
            explanation += f" Could still mention: {', '.join(missing_required)}."
    elif coverage > 0:
        verdict = "partially_correct"
        explanation = f"Mentions {', '.join(matched_required)}, but is missing: {', '.join(missing_required)}."
    else:
        verdict = "incorrect"
        explanation = f"Does not mention any of the required concepts for this question: {', '.join(c['name'] for c in required)}."

    if matched_bonus:
        explanation += f" Bonus points for also mentioning: {', '.join(matched_bonus)}."

    return {
        "applicable": True,
        "verdict": verdict,
        "matched_concepts": matched_required,
        "missing_concepts": missing_required,
        "bonus_concepts_mentioned": matched_bonus,
        "score": score,
        "explanation": explanation,
    }
