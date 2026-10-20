"""
Rule-based grammar checker — MODULE 1 (see AUDIT.md for the full rationale).

Design rules enforced here, per the accuracy audit:
1. Only issues categorized "grammar" affect grammar_score. Spelling and
   style/formality issues are detected and reported, but never lower the
   grammar score — they are a different kind of mistake.
2. Every issue carries a confidence level. Pattern-exact matches (double
   negative, "I has", etc.) are "high" confidence. The tense-consistency
   heuristic can legitimately false-positive on correct sentences (e.g.
   reported speech: "She said she is happy" mixes past+present correctly),
   so it is always "medium" confidence and weighted at half strength in the
   score, never presented as a certain error.
3. The scoring formula is fully transparent and returned in the response,
   not hidden in code: an average reader of the API response can recompute
   the score by hand from the numbers given.
4. Sentence counting uses real sentence boundaries (spaCy when available,
   else a punctuation-based regex split), not a punctuation character tally.

This is real, deterministic NLP — not a mock — built from regex + (when
spaCy is available) POS tags. Coverage was widened after user reports that
written feedback missed obvious mistakes: pronoun/verb agreement ("he don't",
"they was"), "should of", a/an, double comparatives, wrong verb form after
"didn't", common Indian-English patterns ("I am agree", "discuss about"), a
lowercase pronoun "i", and ~60 frequently misspelled words. Every new rule is
a narrow, exact pattern so it stays high-confidence (low false-positive). It intentionally avoids a heavyweight
grammar-correction dependency (LanguageTool needs a JVM; a transformer
grammar-correction model is 300MB+) so the project installs cleanly on a
student laptop. Coverage is intentionally narrow and honestly documented:
see AUDIT.md for exactly which error types are and are not detected.
"""
import re
from dataclasses import dataclass, field
from typing import Literal

from app.nlp.spacy_model import get_nlp

Category = Literal["grammar", "spelling", "style"]
Confidence = Literal["high", "medium"]


@dataclass
class Correction:
    original: str
    corrected: str
    reason: str
    rule: str
    category: Category
    confidence: Confidence
    sentence: str = ""  # the full sentence the issue was found in, for context
    error_type: str = "Grammar"


@dataclass
class GrammarAnalysis:
    score: float
    corrections: list[Correction]
    grammar_issue_count: int
    spelling_issue_count: int
    style_issue_count: int
    sentence_count: int
    word_count: int
    weighted_error_count: float
    formula: str
    sufficient_data: bool
    weaknesses: list[str] = field(default_factory=list)
    corrected_answer: str = ""


_DOUBLE_NEGATIVE = re.compile(r"\b(don't|doesn't|didn't|isn't|wasn't|can't|won't)\b\s+\w*\s*\b(no|none|nothing|nobody|never)\b", re.IGNORECASE)
_I_HAS = re.compile(r"\bI\s+(has|was is|don't has)\b", re.IGNORECASE)
_NEITHER_PLURAL = re.compile(r"\b(neither|either|each|every one) of (the )?\w+ (were|are)\b", re.IGNORECASE)
_REPEATED_WORD = re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE)
_ALOT = re.compile(r"\balot\b", re.IGNORECASE)
_YOUR_GOING = re.compile(r"\byour\s+(going|coming|trying|looking|planning)\b", re.IGNORECASE)
_THEIR_GOING = re.compile(r"\btheir\s+(going|coming|trying)\b", re.IGNORECASE)
_KINDA_SORTA = re.compile(r"\b(kinda|sorta|gonna|wanna|dunno)\b", re.IGNORECASE)


# --- Widened coverage (see module docstring) --------------------------------
_PRONOUN_DONT = re.compile(r"\b(he|she|it)\s+don't\b", re.IGNORECASE)
_PLURAL_DOESNT = re.compile(r"\b(I|we|you|they)\s+doesn't\b", re.IGNORECASE)
_PLURAL_WAS = re.compile(r"\b(we|you|they)\s+was\b", re.IGNORECASE)
_PLURAL_IS = re.compile(r"\b(we|you|they)\s+is\b", re.IGNORECASE)
_SINGULAR_HAVE = re.compile(r"\b(he|she|it)\s+have\b", re.IGNORECASE)
_I_IS_ARE = re.compile(r"\bI\s+(is|are)\b")
_MODAL_OF = re.compile(r"\b(should|could|would|must|might)\s+of\b", re.IGNORECASE)
_DOUBLE_COMPARATIVE = re.compile(
    r"\b(more)\s+(better|easier|faster|bigger|smaller|higher|lower|worse|harder|simpler|cheaper|stronger|clearer)\b",
    re.IGNORECASE,
)
_DID_PAST_FORM = re.compile(
    r"\b(didn't|did\s+not)\s+(went|saw|came|ate|took|made|got|gave|knew|wrote|had|said|told|found|thought)\b",
    re.IGNORECASE,
)
_PAST_TO_BASE = {
    "went": "go", "saw": "see", "came": "come", "ate": "eat", "took": "take", "made": "make",
    "got": "get", "gave": "give", "knew": "know", "wrote": "write", "had": "have", "said": "say",
    "told": "tell", "found": "find", "thought": "think",
}
_AM_AGREE = re.compile(r"\bI\s+am\s+agree\b", re.IGNORECASE)
_DISCUSS_ABOUT = re.compile(r"\b(discuss|discussed|discussing|discusses)\s+about\b", re.IGNORECASE)
_NAME_DREAM_ARE = re.compile(r"\b(my|his|her|their|our)\s+(name|dream|goal|aim|hobby|passion|vision|plan|purpose)\s+(are|were)\b", re.IGNORECASE)
_I_VERB_S = re.compile(r"\bI\s+(?:(?:always|usually|often|sometimes|never|also|really|surely)\s+)?(wants|tries|works|likes|thinks|says|gets|gives|makes|takes|knows|needs|helps|starts|feels|believes|hopes)\b", re.IGNORECASE)
_MANY_SINGULAR = re.compile(r"\b(many|several|multiple|various|few|both|two|three|four|five)\s+(project|student|technology|skill|company|problem|challenge|error|bug|issue|year|month|day|book|friend|colleague|task|role|opportunity|feature)\b", re.IGNORECASE)
_TO_S = re.compile(r"\bto\s+(improves|works|helps|learns|makes|gives|gets|creates|develops|builds|solves)\b", re.IGNORECASE)
_WANT_GERUND = re.compile(r"\b(want|wants|wanted)\s+(learning|working|doing|joining|making|knowing|improving|becoming|studying|getting)\b", re.IGNORECASE)
_MISSING_ARTICLE_ADJ_NOUN = re.compile(r"\b(am|is|are|was|were)\s+(hardworking|dedicated|passionate|honest|creative|responsible|enthusiastic|curious|good|strong)\s+(person|student|engineer|developer|professional|worker|candidate|individual)\b", re.IGNORECASE)
_AM_HAVE = re.compile(r"\b(I\s+am|am|is|are)\s+(?:also\s+)?have\b", re.IGNORECASE)
_HAVE_MAKE_BASE = re.compile(r"\b(have|has|had)\s+(make|complete|learn|create|develop|build|work|design|start|finish|manage|solve|take|write|give|achieve|attend|participate|submit|improve|prepare)\b", re.IGNORECASE)
_AM_STUDY_BASE = re.compile(r"\b(am|is|are|was|were)\s+(study|work|learn|prepare|look|try|do|live|teach|code|program|test|develop|manage)\b", re.IGNORECASE)
_STUDENT_IN_UNIV = re.compile(r"\bstudent\s+in\s+([A-Z][a-zA-Z\s]+(University|College|Institute))\b")
_IN_ORDINAL_YEAR = re.compile(r"\bin\s+(first|second|third|fourth|final)\s+year\b", re.IGNORECASE)
_TECH_SKILL = re.compile(r"\b(my|our|their)\s+technical\s+skill\b", re.IGNORECASE)
_COACH_WHICH_HELP = re.compile(r"\b(coach|project|application|system|feature|tool|platform|service)\s+which\s+help\b", re.IGNORECASE)

_SINGULAR_BARE_VERB = re.compile(
    r"\b(he|she)\s+(go|do|make|take|come|work|like|want|need|know|think|play|say|get|give|use|try|help|speak|write|live)\b",
    re.IGNORECASE,
)
# Words before "he/she + verb" that legitimately take a bare verb after the
# pronoun (questions, modals, "let/make him go" style), so we never flag them.
_BARE_VERB_OK_BEFORE = {
    "did", "does", "do", "can", "could", "will", "would", "should", "may", "might", "must", "shall",
    "to", "let", "if", "that", "lest", "whether", "than", "as",
}
_ARTICLE_PHRASE = re.compile(r"\b(a|an)\s+([a-z][A-Za-z'-]*)\b", re.IGNORECASE)
# Vowel-starting words that take "a" (consonant sound) and consonant-starting
# words that take "an" (vowel sound).
_A_BEFORE_VOWEL_PREFIXES = ("univers", "unit", "unif", "union", "uniq", "unic", "unilat", "use", "usu", "util", "eu", "one", "once", "ubiq", "ukr")
_AN_BEFORE_CONSONANT_PREFIXES = ("hour", "honest", "honor", "honour", "heir")
_LOWER_I = re.compile(
    r"(?<![\w.'\-])i((?:\s+(?:am|was|have|had|will|would|can|could|do|did|think|want|like|work|worked|believe|feel))|'(?:m|ve|ll|d))\b"
)
_RULE_ERROR_TYPE_MAP: dict[str, str] = {
    "subject_verb_agreement": "Subject-Verb Agreement",
    "plural_agreement": "Singular / Plural",
    "verb_form": "Verb Form",
    "modal_of": "Modal Verb Usage",
    "double_negative": "Double Negative",
    "double_comparative": "Comparative Adjective",
    "preposition": "Preposition",
    "article_usage": "Article Usage",
    "capitalization": "Capitalization",
    "punctuation": "Punctuation",
    "spelling": "Spelling",
    "homophone": "Homophone",
    "formality": "Formality & Style",
    "repeated_word": "Repeated Word",
    "tense_consistency": "Tense Consistency",
    "word_choice": "Word Choice",
}

_COMMON_MISSPELLINGS = {
    "grammer": "grammar", "gramer": "grammar", "gramar": "grammar",
    "corrction": "correction", "corection": "correction", "correciton": "correction",
    "vacalbury": "vocabulary", "vacabulary": "vocabulary", "vocablary": "vocabulary", "vocabullary": "vocabulary",
    "revalent": "relevant", "relavent": "relevant", "relevent": "relevant",
    "fetaures": "features", "feautres": "features", "feuture": "feature",
    "alot": "a lot", "allot": "a lot", "infront": "in front", "atleast": "at least",
    "aswell": "as well", "eachother": "each other", "infact": "in fact", "noone": "no one",
    "everytime": "every time", "definately": "definitely", "definatly": "definitely", "definitly": "definitely",
    "recieve": "receive", "recieved": "received", "recieving": "receiving",
    "seperate": "separate", "seperated": "separated", "seperately": "separately",
    "occured": "occurred", "occuring": "occurring", "untill": "until",
    "becuase": "because", "becasue": "because", "beacuse": "because",
    "beleive": "believe", "beleived": "believed", "beleiving": "believing", "beleif": "belief",
    "goverment": "government", "enviroment": "environment", "accomodate": "accommodate", "accomodation": "accommodation",
    "tommorow": "tomorrow", "tomorow": "tomorrow", "experiance": "experience", "experianced": "experienced", "experiances": "experiences",
    "knowlege": "knowledge", "knowlegeable": "knowledgeable", "managment": "management",
    "comunication": "communication", "comunicate": "communicate", "comunicating": "communicating",
    "langauge": "language", "pronounciation": "pronunciation", "intrested": "interested", "intresting": "interesting",
    "tecnology": "technology", "tecnologies": "technologies", "proffesional": "professional", "profesional": "professional", "proffesionals": "professionals",
    "carrer": "career", "improvment": "improvement", "improvments": "improvements",
    "developement": "development", "oppurtunity": "opportunity", "opportunty": "opportunity", "oppurtunities": "opportunities",
    "responsability": "responsibility", "sucessful": "successful", "succesful": "successful", "sucessfully": "successfully",
    "sucess": "success", "succes": "success", "adress": "address", "adressed": "addressed",
    "neccessary": "necessary", "necesary": "necessary", "occassion": "occasion", "occassionally": "occasionally",
    "freind": "friend", "freinds": "friends", "thier": "their", "realy": "really",
    "writting": "writing", "begining": "beginning", "existance": "existence", "independant": "independent",
    "arguement": "argument", "calender": "calendar", "collegue": "colleague", "collegues": "colleagues",
    "commited": "committed", "familar": "familiar", "immediatly": "immediately", "maintainance": "maintenance",
    "noticable": "noticeable", "persistant": "persistent", "priviledge": "privilege", "publically": "publicly",
    "refered": "referred", "diffrent": "different", "differant": "different", "consistant": "consistent",
    "guarentee": "guarantee", "garantee": "guarantee", "tendancy": "tendency", "occurence": "occurrence", "occurrance": "occurrence",
    "fourty": "forty", "ninty": "ninety", "nineth": "ninth", "twelth": "twelfth",
    "interveiw": "interview", "interviews": "interviews", "posible": "possible",
    "responce": "response", "responces": "responses", "chalenge": "challenge", "chalenges": "challenges",
    "problm": "problem", "problms": "problems", "softwere": "software", "hardwere": "hardware",
    "learing": "learning", "leared": "learned", "studing": "studying", "studided": "studied",
    "collegee": "college", "univercity": "university", "certifcate": "certificate", "certifaction": "certification",
    "requirment": "requirement", "requirments": "requirements", "algorithim": "algorithm", "algorithims": "algorithms",
    "perfomance": "performance", "optmization": "optimization", "optmized": "optimized",
    "databse": "database", "plateform": "platform", "framwork": "framework", "framworks": "frameworks",
    "backened": "backend", "frontened": "frontend", "analisys": "analysis", "analize": "analyze",
    "soluton": "solution", "solutons": "solutions", "implimentation": "implementation", "impliment": "implement", "implimented": "implemented",
    "stratergy": "strategy", "stratergies": "strategies", "succeded": "succeeded",
    "effectivly": "effectively", "effecient": "efficient", "effeciently": "efficiently",
    "suprise": "surprise", "truely": "truly", "wierd": "weird",
    "excellant": "excellent", "confidance": "confidence", "guidence": "guidance", "teh": "the",
    "dont": "don't", "cant": "can't", "didnt": "didn't", "doesnt": "doesn't", "isnt": "isn't", "wasnt": "wasn't",
}
_COMMON_MISSPELLINGS = {k: v for k, v in _COMMON_MISSPELLINGS.items() if v}
_MISSPELLING_PATTERN = re.compile(r"\b(" + "|".join(sorted(_COMMON_MISSPELLINGS, key=len, reverse=True)) + r")\b", re.IGNORECASE)

_MISSING_SPACE_PUNCT = re.compile(r"([a-zA-Z0-9])([,.:;?!])([a-zA-Z0-9])")
_SPACE_BEFORE_PUNCT = re.compile(r"([a-zA-Z0-9])\s+([,.:;?!])")

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_WORD_PATTERN = re.compile(r"[A-Za-z']+")

# Weight applied to each corrections's contribution to the score; "medium"
# confidence issues are shown to the user but only half-count against the
# score, since they carry real false-positive risk (see module docstring).
_CONFIDENCE_WEIGHT: dict[Confidence, float] = {"high": 1.0, "medium": 0.5}

# Points removed from the score per unit of "weighted errors per sentence".
# Documented so the formula is reproducible by hand, not a hidden constant:
# one high-confidence grammar error in a one-sentence answer (error rate 1.0)
# costs 50 points; the same error spread across 4 sentences (error rate 0.25)
# costs 12.5 points.
_POINTS_PER_ERROR_RATE = 50.0


def _sentences(text: str) -> list[str]:
    nlp = get_nlp()
    if nlp is not None and text.strip():
        doc = nlp(text)
        sents = [s.text.strip() for s in doc.sents if s.text.strip()]
        if sents:
            return sents
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


def _sentence_containing(sentences: list[str], span_text: str) -> str:
    for sent in sentences:
        if span_text.lower() in sent.lower():
            return sent
    return span_text


def _fix_double_negative(text: str) -> list[Correction]:
    corrections = []
    for m in _DOUBLE_NEGATIVE.finditer(text):
        corrections.append(
            Correction(
                original=m.group(0),
                corrected=re.sub(r"\bno\b", "any", m.group(0), flags=re.IGNORECASE),
                reason="Avoid double negatives — pair a negative verb with 'any', not another negative word.",
                rule="double_negative",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_i_has(text: str) -> list[Correction]:
    corrections = []
    for m in _I_HAS.finditer(text):
        corrections.append(
            Correction(
                original=m.group(0),
                corrected="I have",
                reason="Use 'have' (not 'has') with the first-person pronoun 'I'.",
                rule="subject_verb_agreement",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_neither_plural(text: str) -> list[Correction]:
    corrections = []
    for m in _NEITHER_PLURAL.finditer(text):
        fixed = re.sub(r"\b(were|are)\b", lambda mm: "was" if mm.group(0).lower() == "were" else "is", m.group(0))
        corrections.append(
            Correction(
                original=m.group(0),
                corrected=fixed,
                reason="'Neither', 'either' and 'each' are singular and take a singular verb.",
                rule="subject_verb_agreement",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_repeated_word(text: str) -> list[Correction]:
    corrections = []
    for m in _REPEATED_WORD.finditer(text):
        corrections.append(
            Correction(
                original=m.group(0),
                corrected=m.group(1),
                reason="A word was accidentally repeated, breaking the sentence's grammar.",
                rule="repeated_word",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_simple_typos(text: str) -> list[Correction]:
    """Spelling and style issues — deliberately kept OUT of the "grammar"
    category so they cannot affect grammar_score (audit finding #1)."""
    corrections = []
    for m in _ALOT.finditer(text):
        corrections.append(
            Correction(m.group(0), "a lot", "'Alot' is not a standard word — use 'a lot'.", "spelling", category="spelling", confidence="high")
        )
    for m in _YOUR_GOING.finditer(text):
        corrections.append(
            Correction(
                m.group(0),
                m.group(0).replace("your", "you're").replace("Your", "You're"),
                "Use 'you're' (you are) before a verb ending in -ing — this changes the sentence's grammar, not just its spelling.",
                "homophone",
                category="grammar",
                confidence="high",
            )
        )
    for m in _THEIR_GOING.finditer(text):
        corrections.append(
            Correction(
                m.group(0),
                m.group(0).replace("their", "they're").replace("Their", "They're"),
                "Use 'they're' (they are) before a verb ending in -ing — this changes the sentence's grammar, not just its spelling.",
                "homophone",
                category="grammar",
                confidence="high",
            )
        )
    for m in _KINDA_SORTA.finditer(text):
        corrections.append(
            Correction(
                m.group(0),
                {"kinda": "kind of", "sorta": "sort of", "gonna": "going to", "wanna": "want to", "dunno": "don't know"}[m.group(0).lower()],
                "Casual contraction — a style/formality choice, not a grammar error.",
                "formality",
                category="style",
                confidence="high",
            )
        )
    return corrections


def _match_case(original: str, replacement: str) -> str:
    return replacement.capitalize() if original[:1].isupper() else replacement


def _previous_word(text: str, index: int) -> str:
    m = re.search(r"([A-Za-z']+)\W*$", text[:index])
    return m.group(1).lower() if m else ""


def _fix_common_errors(text: str) -> list[Correction]:
    """Narrow, exact-pattern grammar rules added to widen coverage beyond the
    original seven (see module docstring). All are high confidence except the
    bare-verb-after-he/she rule, which excludes questions/modals but can still
    meet unusual constructions, so it is "medium"."""
    out: list[Correction] = []

    def add(original, corrected, reason, rule, confidence="high", category="grammar"):
        out.append(Correction(original=original, corrected=corrected, reason=reason, rule=rule, category=category, confidence=confidence))

    for m in _PRONOUN_DONT.finditer(text):
        add(m.group(0), f"{m.group(1)} doesn't", "Use 'doesn't' (not 'don't') with he, she and it.", "subject_verb_agreement")
    for m in _PLURAL_DOESNT.finditer(text):
        add(m.group(0), f"{m.group(1)} don't", f"Use 'don't' (not 'doesn't') with '{m.group(1)}'.", "subject_verb_agreement")
    for m in _PLURAL_WAS.finditer(text):
        add(m.group(0), f"{m.group(1)} were", f"Use 'were' (not 'was') with '{m.group(1)}'.", "subject_verb_agreement")
    for m in _PLURAL_IS.finditer(text):
        add(m.group(0), f"{m.group(1)} are", f"Use 'are' (not 'is') with '{m.group(1)}'.", "subject_verb_agreement")
    for m in _SINGULAR_HAVE.finditer(text):
        add(m.group(0), f"{m.group(1)} has", f"Use 'has' (not 'have') with '{m.group(1)}'.", "subject_verb_agreement")
    for m in _I_IS_ARE.finditer(text):
        add(m.group(0), "I am", "Use 'am' with the pronoun 'I'.", "subject_verb_agreement")
    for m in _MODAL_OF.finditer(text):
        add(m.group(0), f"{m.group(1)} have", f"'{m.group(1)} of' is a common mistake — write '{m.group(1)} have' (the sound is 'could've').", "modal_of")
    for m in _DOUBLE_COMPARATIVE.finditer(text):
        add(m.group(0), m.group(2), f"'{m.group(2)}' is already a comparative — remove 'more'.", "double_comparative")
    for m in _DID_PAST_FORM.finditer(text):
        base = _PAST_TO_BASE[m.group(2).lower()]
        add(m.group(0), f"{m.group(1)} {base}", f"After 'didn't' use the base verb ('{base}'), not the past form.", "verb_form")
    for m in _AM_AGREE.finditer(text):
        add(m.group(0), "I agree", "'Agree' is a verb, so don't use 'am' before it — say 'I agree'.", "verb_form")
    for m in _DISCUSS_ABOUT.finditer(text):
        add(m.group(0), m.group(1), f"'{m.group(1)}' already means 'talk about' — drop the extra 'about'.", "preposition")

    for m in _NAME_DREAM_ARE.finditer(text):
        fixed_verb = "is" if m.group(3).lower() == "are" else "was"
        add(m.group(0), f"{m.group(1)} {m.group(2)} {fixed_verb}", f"Singular subject '{m.group(2)}' requires singular verb '{fixed_verb}'.", "subject_verb_agreement")

    for m in _I_VERB_S.finditer(text):
        parts = m.group(0).split()
        verb_s = parts[-1]
        base_v = "try" if verb_s == "tries" else verb_s[:-1]
        parts[-1] = base_v
        add(m.group(0), " ".join(parts), f"First-person pronoun 'I' takes the base verb ('{base_v}') without '-s'.", "subject_verb_agreement")

    for m in _MANY_SINGULAR.finditer(text):
        quant, noun = m.group(1), m.group(2)
        plural_noun = noun[:-1] + "ies" if noun.endswith("y") else noun + "s"
        add(m.group(0), f"{quant} {plural_noun}", f"Quantitative word '{quant}' must be followed by a plural noun ('{plural_noun}').", "plural_agreement")

    for m in _TO_S.finditer(text):
        verb = m.group(1)
        add(m.group(0), f"to {verb[:-1]}", f"Infinitive 'to' must be followed by base verb form without '-s' ('to {verb[:-1]}').", "verb_form")

    for m in _WANT_GERUND.finditer(text):
        want_v, gerund = m.group(1), m.group(2)
        base = {"getting": "get", "joining": "join", "doing": "do", "learning": "learn"}.get(gerund, gerund.replace("ing", ""))
        add(m.group(0), f"{want_v} to {base}", f"The verb '{want_v}' is followed by an infinitive with 'to' ('{want_v} to {base}'), not a gerund.", "verb_form")

    for m in _MISSING_ARTICLE_ADJ_NOUN.finditer(text):
        parts = m.group(0).split()
        art = "an" if parts[1][0].lower() in "aeiou" else "a"
        add(m.group(0), f"{parts[0]} {art} {parts[1]} {parts[2]}", f"Singular countable nouns require article '{art}' ('{parts[0]} {art} {parts[1]} {parts[2]}').", "article_usage")

    for m in _AM_HAVE.finditer(text):
        add(m.group(0), "I also have", "Avoid combining 'am' with 'have' — say 'I have' or 'I also have'.", "verb_form")

    for m in _HAVE_MAKE_BASE.finditer(text):
        aux, verb = m.group(1), m.group(2).lower()
        pp = {"make": "made", "take": "taken", "write": "written", "give": "given", "build": "built", "do": "done"}.get(verb, verb + "ed" if not verb.endswith("e") else verb + "d")
        add(m.group(0), f"{aux} {pp}", f"With '{aux}', use the past participle form ('{pp}') instead of the base verb.", "verb_form")

    for m in _AM_STUDY_BASE.finditer(text):
        aux, verb = m.group(1), m.group(2).lower()
        ing = verb + "ing" if not verb.endswith("e") else verb[:-1] + "ing"
        add(m.group(0), f"{aux} {ing}", f"Use progressive form '{ing}' instead of '{aux} {verb}'.", "verb_form")

    for m in _STUDENT_IN_UNIV.finditer(text):
        add(m.group(0), f"student at {m.group(1)}", f"Use preposition 'at' when referring to educational institutions ('student at {m.group(1)}').", "preposition", category="style")

    for m in _IN_ORDINAL_YEAR.finditer(text):
        yr = m.group(0).split()[1]
        add(m.group(0), f"in the {yr} year", f"Use 'in the {yr} year' or 'in my {yr} year'.", "preposition", category="style")

    for m in _TECH_SKILL.finditer(text):
        pron = m.group(0).split()[0]
        add(m.group(0), f"{pron} technical skills", "Use plural 'technical skills' when referring to a general skillset.", "plural_agreement", category="style")

    for m in _COACH_WHICH_HELP.finditer(text):
        noun = m.group(0).split()[0]
        add(m.group(0), f"{noun} which helps", f"Singular antecedent '{noun}' requires singular verb 'helps'.", "subject_verb_agreement")

    for m in _SINGULAR_BARE_VERB.finditer(text):
        if _previous_word(text, m.start()) in _BARE_VERB_OK_BEFORE:
            continue
        verb = m.group(2).lower()
        fixed_verb = {"do": "does", "go": "goes", "try": "tries"}.get(verb, verb + "s")
        add(m.group(0), f"{m.group(1)} {fixed_verb}", f"With '{m.group(1)}' the present-tense verb needs an -s form ('{fixed_verb}').", "subject_verb_agreement", confidence="medium")

    for m in _ARTICLE_PHRASE.finditer(text):
        article, word = m.group(1), m.group(2)
        if not word.islower() or word[0] == "x":
            continue  # skip acronyms / proper nouns ("a UI", "an MBA") and letter-name words
        starts_vowel = word[0] in "aeiou"
        if starts_vowel:
            wants_an = not word.startswith(_A_BEFORE_VOWEL_PREFIXES)
        else:
            wants_an = word.startswith(_AN_BEFORE_CONSONANT_PREFIXES)
        # lowercase letter-name acronyms like "an sql" / "an html" have no vowel — leave them alone
        if not starts_vowel and not wants_an and not re.search(r"[aeiouy]", word):
            continue
        if article.lower() == "a" and wants_an:
            add(m.group(0), f"{_match_case(article, 'an')} {word}", f"Use 'an' before '{word}' because it starts with a vowel sound.", "article_usage")
        elif article.lower() == "an" and not wants_an:
            add(m.group(0), f"{_match_case(article, 'a')} {word}", f"Use 'a' before '{word}' because it starts with a consonant sound.", "article_usage")
    return out


def _fix_misspellings(text: str) -> list[Correction]:
    """Spelling-category only (never affects grammar_score)."""
    out: list[Correction] = []
    for m in _MISSPELLING_PATTERN.finditer(text):
        word = m.group(1)
        fixed = _match_case(word, _COMMON_MISSPELLINGS[word.lower()])
        out.append(Correction(word, fixed, f"'{word}' is misspelled — the correct spelling is '{fixed}'.", "spelling", category="spelling", confidence="high"))
    for m in _LOWER_I.finditer(text):
        out.append(Correction(m.group(0), "I" + m.group(1), "The pronoun 'I' is always written as a capital letter.", "capitalization", category="spelling", confidence="high"))
    return out


def _tense_consistency(text: str, sentences: list[str]) -> list[Correction]:
    """Uses spaCy POS tags to flag sentences that mix past and present tense
    main verbs. Always "medium" confidence: this can legitimately false-
    positive on correct constructions like reported speech ("She said she
    is happy"), so it is shown to the user as uncertain, not a hard error,
    and only half-weighted in the score (see module docstring)."""
    nlp = get_nlp()
    if nlp is None:
        return []

    corrections = []
    for sent_text in sentences:
        doc = nlp(sent_text)
        tags = {tok.tag_ for tok in doc if tok.pos_ == "VERB"}
        has_past = "VBD" in tags
        has_present = bool(tags & {"VBP", "VBZ"})
        if has_past and has_present:
            corrections.append(
                Correction(
                    original=sent_text,
                    corrected="(keep verb tense consistent within the sentence, unless intentionally reporting past speech)",
                    reason="This sentence mixes past and present tense verbs. This may be a genuine tense error, or correct reported speech — review it yourself.",
                    rule="tense_consistency",
                    category="grammar",
                    confidence="medium",
                    sentence=sent_text,
                )
            )
    return corrections


def _fix_punctuation(text: str) -> list[Correction]:
    out: list[Correction] = []
    for m in _MISSING_SPACE_PUNCT.finditer(text):
        if m.group(2) == "." and m.group(1).isdigit() and m.group(3).isdigit():
            continue
        surrounding = text[max(0, m.start() - 4):m.start() + 10]
        if re.search(r"\b(B\.Tech|M\.Tech|B\.Sc|M\.Sc|Ph\.D|B\.E|M\.E|B\.Com|M\.Com|B\.A|M\.A|BCA|MCA|e\.g\.|i\.e\.|U\.S\.|etc\.)", surrounding, re.IGNORECASE):
            continue
        out.append(
            Correction(
                original=m.group(0),
                corrected=f"{m.group(1)}{m.group(2)} {m.group(3)}",
                reason=f"Add a space after punctuation '{m.group(2)}'.",
                rule="punctuation",
                category="style",
                confidence="high",
                error_type="Punctuation",
            )
        )
    for m in _SPACE_BEFORE_PUNCT.finditer(text):
        out.append(
            Correction(
                original=m.group(0),
                corrected=f"{m.group(1)}{m.group(2)}",
                reason=f"Remove unnecessary space before punctuation '{m.group(2)}'.",
                rule="punctuation",
                category="style",
                confidence="high",
                error_type="Punctuation",
            )
        )
    return out


def generate_corrected_answer(text: str, corrections: list[Correction]) -> str:
    if not text.strip():
        return text
    result = text
    # Order corrections by length descending so longer phrases match before substrings
    sorted_corr = sorted(corrections, key=lambda c: len(c.original), reverse=True)
    for c in sorted_corr:
        if c.corrected.startswith("(") and c.corrected.endswith(")"):
            continue
        orig = c.original
        corr = c.corrected
        escaped = re.escape(orig)
        if re.match(r"^[A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)*$", orig):
            pat = re.compile(rf"\b{escaped}\b", re.IGNORECASE)
        else:
            pat = re.compile(escaped, re.IGNORECASE)

        def repl(m):
            txt = m.group(0)
            if txt.isupper() and len(txt) > 1:
                return corr.upper()
            if txt[:1].isupper() and not corr[:1].isupper():
                return corr[:1].upper() + corr[1:]
            return corr

        result = pat.sub(repl, result)

    result = re.sub(r"\s+([,.:;?!])", r"\1", result)
    result = re.sub(r"[ \t]{2,}", " ", result)
    result = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), result)
    return result.strip()


def analyze(text: str, assume_unpunctuated: bool = False) -> dict:
    """Runs every rule against `text` and returns a transparent grammar
    score plus the list of corrections found. See GrammarAnalysis for the
    full shape; returned as a dict for backward compatibility with existing
    callers that read analyze(text)["score"] / ["corrections"].

    `assume_unpunctuated=True` is for speech-to-text transcripts. STT output has
    no sentence punctuation, so the whole recording would count as ONE sentence
    and a single mistake would cost 50 points. In that mode the sentence count
    is raised to at least ceil(word_count / 15) (a typical spoken sentence
    length) and the formula string says so."""
    text = text or ""
    sentences = _sentences(text)
    word_count = len(_WORD_PATTERN.findall(text))
    sentence_count = max(len(sentences), 1 if word_count else 0)
    sentence_count_note = ""
    if assume_unpunctuated and word_count:
        estimated = -(-word_count // 15)  # ceil(word_count / 15)
        if estimated > sentence_count:
            sentence_count_note = f" (estimated as ceil({word_count} words / 15) because speech transcripts have no punctuation)"
            sentence_count = estimated

    corrections: list[Correction] = []
    for fn in (
        _fix_double_negative,
        _fix_i_has,
        _fix_neither_plural,
        _fix_repeated_word,
        _fix_simple_typos,
        _fix_common_errors,
        _fix_punctuation,
        _fix_misspellings,
    ):
        corrections.extend(fn(text))
    corrections.extend(_tense_consistency(text, sentences))

    # Attach full-sentence context and error_type to every correction
    for c in corrections:
        if not c.sentence:
            c.sentence = _sentence_containing(sentences, c.original)
        if not hasattr(c, "error_type") or not c.error_type or c.error_type == "Grammar":
            c.error_type = _RULE_ERROR_TYPE_MAP.get(c.rule, "Grammar")

    # Deduplicate corrections while preserving distinct occurrences across sentences
    unique_corrections: list[Correction] = []
    seen = set()
    for c in corrections:
        key = (c.original.lower(), c.corrected.lower(), c.sentence.lower())
        if key not in seen:
            seen.add(key)
            unique_corrections.append(c)

    corrections = unique_corrections

    corrected_answer = generate_corrected_answer(text, corrections) if word_count > 0 else ""

    if word_count == 0:
        return GrammarAnalysis(
            score=0.0,
            corrections=[],
            grammar_issue_count=0,
            spelling_issue_count=0,
            style_issue_count=0,
            sentence_count=0,
            word_count=0,
            weighted_error_count=0.0,
            formula="No input provided — no meaningful text to grade.",
            sufficient_data=False,
            weaknesses=[],
            corrected_answer="",
        ).__dict__

    grammar_corrections = [c for c in corrections if c.category == "grammar"]
    spelling_corrections = [c for c in corrections if c.category == "spelling"]
    style_corrections = [c for c in corrections if c.category == "style"]

    weighted_error_count = sum(_CONFIDENCE_WEIGHT[c.confidence] for c in grammar_corrections)
    error_rate = weighted_error_count / sentence_count
    score = round(max(0.0, min(100.0, 100.0 - error_rate * _POINTS_PER_ERROR_RATE)), 1)

    formula = (
        f"score = 100 - (weighted_error_count / sentence_count) * {_POINTS_PER_ERROR_RATE:.0f}, clamped to [0, 100]. "
        f"weighted_error_count = {weighted_error_count:.1f} (each high-confidence grammar issue = 1.0, "
        f"each medium-confidence issue = 0.5). sentence_count = {sentence_count}{sentence_count_note}. "
        f"Only issues categorized 'grammar' count — spelling and style issues are reported but do not affect this score."
    )

    return GrammarAnalysis(
        score=score,
        corrections=corrections,
        grammar_issue_count=len(grammar_corrections),
        spelling_issue_count=len(spelling_corrections),
        style_issue_count=len(style_corrections),
        sentence_count=sentence_count,
        word_count=word_count,
        weighted_error_count=round(weighted_error_count, 2),
        formula=formula,
        sufficient_data=True,
        weaknesses=sorted({c.rule for c in grammar_corrections}),
        corrected_answer=corrected_answer,
    ).__dict__
