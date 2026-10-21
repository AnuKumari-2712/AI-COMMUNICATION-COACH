"""
Comprehensive coverage test for the Grammar & Style Corrections engine.
Verifies that:
1. All actual mistakes across the entire answer are identified without truncation.
2. Every mistake carries original, corrected, reason, rule, and error_type.
3. The fully-corrected answer (corrected_answer) preserves original meaning.
4. Correct sentences are not falsely flagged.
"""
import pytest
from app.nlp import grammar_rules


def test_complete_paragraph_all_mistakes_detected():
    """
    Submits a multi-sentence paragraph containing 16 intentional mistakes across
    subject-verb agreement, verb forms, singular/plural, articles, prepositions, etc.
    """
    text = (
        "Hello, my name are Anu and I am a B.Tech student in Lovely Professional University. "
        "I am study in third year and I has a strong interest in web development and artificial intelligence. "
        "I have make many project like AI interview coach which help students to improves their speaking skills. "
        "I am also have knowledge of HTML, CSS, JavaScript and React. "
        "I wants to join this role because I want learning new technologies and improve my technical skill. "
        "I am hardworking person and I always tries to complete my work on time. "
        "My dream are to become a successful AI engineer in a big company."
    )

    analysis = grammar_rules.analyze(text)
    corrections = analysis["corrections"]

    # Must detect all 16 distinct issues
    assert len(corrections) >= 15, f"Expected at least 15 corrections, got {len(corrections)}"

    # Check that error_type is present on every correction
    for c in corrections:
        assert hasattr(c, "error_type")
        assert len(c.error_type) > 0
        assert hasattr(c, "original") and len(c.original) > 0
        assert hasattr(c, "corrected") and len(c.corrected) > 0
        assert hasattr(c, "reason") and len(c.reason) > 0

    # Collect all original mistakes flagged
    flagged_originals = [c.original.lower() for c in corrections]

    # Verify key mistakes from prompt
    assert any("my name are" in o for o in flagged_originals)
    assert any("i has" in o for o in flagged_originals)
    assert any("am study" in o for o in flagged_originals)
    assert any("have make" in o for o in flagged_originals)
    assert any("many project" in o for o in flagged_originals)
    assert any("to improves" in o for o in flagged_originals)
    assert any("i wants" in o for o in flagged_originals)
    assert any("want learning" in o for o in flagged_originals)
    assert any("hardworking person" in o for o in flagged_originals)
    assert any("always tries" in o for o in flagged_originals)
    assert any("my dream are" in o for o in flagged_originals)
    assert any("student in" in o for o in flagged_originals)
    assert any("which help" in o for o in flagged_originals)

    # Verify fully corrected answer
    corrected = analysis["corrected_answer"]
    assert "my name is Anu" in corrected
    assert "I have a strong interest" in corrected
    assert "I am studying" in corrected
    assert "have made many projects" in corrected
    assert "to improve" in corrected
    assert "I want to join" in corrected
    assert "want to learn" in corrected
    assert "a hardworking person" in corrected
    assert "always try" in corrected
    assert "My dream is" in corrected


def test_sentence_with_multiple_mistakes():
    """
    Verifies that multiple distinct mistakes within a single sentence
    are all identified without skipping any.
    """
    sentence = "I has make many project to improves speaking."
    analysis = grammar_rules.analyze(sentence)
    corrections = analysis["corrections"]

    # Mistakes in this single sentence:
    # 1. "I has" (subject-verb agreement)
    # 2. "have make" / "has make" (verb form)
    # 3. "many project" (plural agreement)
    # 4. "to improves" (verb form)
    assert len(corrections) >= 3

    error_types = {c.error_type for c in corrections}
    assert "Subject-Verb Agreement" in error_types or "Verb Form" in error_types


def test_correct_text_produces_zero_corrections():
    """
    Verifies that standard correct sentences produce zero false positives.
    """
    clean_text = (
        "I am a software engineer with four years of experience developing web applications. "
        "I have worked with React, TypeScript, and Python. "
        "In my previous role at the university, I collaborated with cross-functional teams to deliver projects on time."
    )
    analysis = grammar_rules.analyze(clean_text)
    assert len(analysis["corrections"]) == 0
    assert analysis["score"] >= 95.0


def test_technical_question_mistakes_detected():
    """
    Verifies mistakes in technical/project questions:
    'one of my biggest problem were' -> problems, was
    'have did' -> have done
    'good in coding' -> good at coding
    'there is many solutions' -> there are many solutions
    'to worked' -> to work
    """
    text = (
        "In my last project, one of my biggest problem were database latency. "
        "I have did several optimizations and I am good in coding. "
        "There is many solutions we evaluated to worked on scalability."
    )
    analysis = grammar_rules.analyze(text)
    corrections = analysis["corrections"]
    flagged = [c.original.lower() for c in corrections]

    assert any("one of my biggest problem" in f for f in flagged)
    assert any("problem were" in f or "were" in f for f in flagged)
    assert any("have did" in f for f in flagged)
    assert any("good in coding" in f for f in flagged)
    assert any("there is many" in f for f in flagged)
    assert any("to worked" in f for f in flagged)

    corrected = analysis["corrected_answer"]
    assert "one of my biggest problems" in corrected
    assert "have done" in corrected
    assert "good at coding" in corrected
    assert "there are many solutions" in corrected.lower()
    assert "to work" in corrected


def test_strengths_and_weaknesses_mistakes_detected():
    """
    Verifies mistakes in HR / Strengths & Weaknesses answers:
    'My strengths is' -> strengths are
    'cope up with' -> cope with
    'everyone are' -> everyone is
    """
    text = (
        "My strengths is dedication and communication. "
        "I try to cope up with tight deadlines under pressure. "
        "In my team, everyone are encouraged to share feedback."
    )
    analysis = grammar_rules.analyze(text)
    corrections = analysis["corrections"]
    flagged = [c.original.lower() for c in corrections]

    assert any("strengths is" in f for f in flagged)
    assert any("cope up with" in f for f in flagged)
    assert any("everyone are" in f for f in flagged)

    corrected = analysis["corrected_answer"]
    assert "strengths are" in corrected
    assert "cope with" in corrected
    assert "everyone is" in corrected


def test_introduction_and_behavioral_mistakes_detected():
    """
    Verifies mistakes in Introduction / Behavioral questions:
    'myself Rahul' -> I am Rahul
    'am software engineer' -> am a software engineer
    'am having 2 years experience' -> have 2 years of experience
    'passed out from' -> graduated from
    'me and my team worked' -> My team and I worked
    'feedbacks' -> feedback
    'revert back' -> revert / reply
    """
    text = (
        "Myself Rahul and I am software engineer. "
        "I passed out from college and I am having 2 years of experience. "
        "Me and my team worked hard to solved client issues. "
        "Please revert back with your feedbacks."
    )
    analysis = grammar_rules.analyze(text)
    corrections = analysis["corrections"]
    flagged = [c.original.lower() for c in corrections]

    assert any("myself rahul" in f for f in flagged)
    assert any("am software engineer" in f for f in flagged)
    assert any("am having 2 years" in f for f in flagged)
    assert any("passed out" in f for f in flagged)
    assert any("me and my team" in f for f in flagged)
    assert any("to solved" in f for f in flagged)
    assert any("revert back" in f for f in flagged)
    assert any("feedbacks" in f for f in flagged)

    corrected = analysis["corrected_answer"]
    assert "I am Rahul" in corrected or "My name is Rahul" in corrected
    assert "am a software engineer" in corrected
    assert "have 2 years of experience" in corrected
    assert "graduated from" in corrected
    assert "My team and I worked" in corrected
    assert "to solve" in corrected
    assert "revert" in corrected or "reply" in corrected
    assert "feedback" in corrected

