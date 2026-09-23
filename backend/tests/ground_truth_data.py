"""
MODULE 12 (see AUDIT.md): ground-truth benchmark data.

A small, manually-verified set of labeled examples per metric — sections
18-19 of the original audit spec. Each example's `expected` value was
confirmed by actually running the real function against it (not guessed)
before being written down here; the ground-truth label and the passing
test are two separate things that must independently agree, which is the
whole point of a benchmark. This file holds only data: no test framework
import, so it can be reused by both the pytest suite
(test_ground_truth_benchmark.py) and the report generator
(scripts/generate_accuracy_report.py).
"""

# ---------------------------------------------------------------------------
# Grammar: sentences with a manually verified correct/incorrect label.
# "incorrect" means grammar_rules.analyze() should find >=1 issue in the
# "grammar" category specifically (not spelling/style).
# ---------------------------------------------------------------------------
GRAMMAR_EXAMPLES = [
    {"text": "She goes to school every day.", "expected_has_grammar_issue": False, "note": "correct present-tense agreement"},
    {"text": "The team finished the project on time.", "expected_has_grammar_issue": False, "note": "correct simple past"},
    {"text": "I don't have no time today.", "expected_has_grammar_issue": True, "note": "double negative"},
    {"text": "Neither of the teams were ready.", "expected_has_grammar_issue": True, "note": "subject-verb agreement (neither...was)"},
    {"text": "The team finally finished the the project on time.", "expected_has_grammar_issue": True, "note": "repeated word"},
    {"text": "Yesterday I go to the office and finished my report.", "expected_has_grammar_issue": True, "note": "tense mixing (medium confidence)"},
    {"text": "I practiced alot this week.", "expected_has_grammar_issue": False, "note": "spelling issue only ('alot') — must NOT count as a grammar issue"},
    {"text": "I'm gonna finish it by Friday.", "expected_has_grammar_issue": False, "note": "style/formality issue only ('gonna') — must NOT count as a grammar issue"},
]

# ---------------------------------------------------------------------------
# Filler words: transcripts with a manually verified expected count,
# including the known false-positive cases from Module 3.
# ---------------------------------------------------------------------------
FILLER_EXAMPLES = [
    {"text": "Um, I think we should proceed.", "expected_filler_count": 1, "note": "unambiguous 'um'"},
    {"text": "Do you know the deadline?", "expected_filler_count": 0, "note": "'you know' mid-clause in a genuine question, not filler"},
    {"text": "I like pizza and my friends like it too.", "expected_filler_count": 0, "note": "'like' used as the verb 'to like', not filler"},
    {"text": "It was, like, really hard, you know.", "expected_filler_count": 2, "note": "'like' filler + clause-final 'you know'"},
    {"text": "Actually, I think this is correct.", "expected_filler_count": 1, "note": "clause-initial 'actually'"},
    {"text": "This is kind of hard to explain.", "expected_filler_count": 1, "note": "'kind of' before an adjective = filler"},
    {"text": "This kind of problem is common in distributed systems.", "expected_filler_count": 0, "note": "'kind of' before a noun = genuine usage, not filler"},
    {"text": "Uh, basically, we finished the project on time.", "expected_filler_count": 2, "note": "'uh' + clause-initial 'basically'"},
]

# ---------------------------------------------------------------------------
# Speaking pace: exact word_count/duration pairs -> exact expected WPM
# (WPM = word_count / (duration_seconds/60), by definition).
# ---------------------------------------------------------------------------
PACE_EXAMPLES = [
    {"word_count": 150, "duration_seconds": 60.0, "expected_wpm": 150.0},
    {"word_count": 100, "duration_seconds": 60.0, "expected_wpm": 100.0},
    {"word_count": 20, "duration_seconds": 10.0, "expected_wpm": 120.0},
    {"word_count": 45, "duration_seconds": 30.0, "expected_wpm": 90.0},
    {"word_count": 0, "duration_seconds": 10.0, "expected_wpm": 0.0},
]

# ---------------------------------------------------------------------------
# Answer relevance: question/answer pairs with a manually verified
# relevant/irrelevant label (threshold: score >= 50 counts as "relevant").
# ---------------------------------------------------------------------------
RELEVANCE_EXAMPLES = [
    {
        "question": "Tell me about a time you led a team through a difficult project.",
        "answer": "I led a five-person team through a difficult migration project last year, and we delivered it two weeks early.",
        "expected_relevant": True,
    },
    {
        "question": "Tell me about a time you led a team through a difficult project.",
        "answer": "My favorite programming language is Python and I enjoy hiking on weekends.",
        "expected_relevant": False,
    },
    {
        "question": "What is your experience with Python and machine learning?",
        "answer": "I've used Python and machine learning for three years.",
        "expected_relevant": True,
    },
    {
        "question": "Describe a time you resolved a conflict between two team members.",
        "answer": "I really enjoy working on interesting problems and collaborating with people, staying organized every day.",
        "expected_relevant": False,
    },
]

# ---------------------------------------------------------------------------
# Technical correctness: the fixed technical-interview questions with a
# manually verified correct/incorrect answer each.
# ---------------------------------------------------------------------------
TECHNICAL_EXAMPLES = [
    {
        "question": "Explain how a hash map works and its average time complexity.",
        "answer": "A hash map uses a hash function to convert each key into an index into buckets, storing key-value pairs there, giving average O(1) lookups.",
        "expected_verdict": "correct",
    },
    {
        "question": "Explain how a hash map works and its average time complexity.",
        "answer": "A hash map is a type of graph data structure used for storing trees and sorting large lists of numbers efficiently.",
        "expected_verdict": "incorrect",
    },
    {
        "question": "Explain the difference between processes and threads.",
        "answer": "A process has its own separate memory space, while threads are lightweight units that share memory within a process.",
        "expected_verdict": "correct",
    },
    {
        "question": "What is the difference between SQL and NoSQL databases?",
        "answer": "I don't know.",
        "expected_verdict": "insufficient",
    },
]
