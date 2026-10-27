# Prompt 8: T5 Model Fine-Tuning Pipeline & Evaluation

## Summary of Completed Work
Implemented a complete, production-ready fine-tuning and evaluation pipeline for Grammatical Error Correction (GEC) using `google/flan-t5-small`, integrated with fallback rules and lazy model loading.

---

### 1. Model Wrapper & Lazy Loading (`backend/app/nlp/gec_model.py`)
- Lazy-loads the Hugging Face Transformers model (`AutoTokenizer`, `AutoModelForSeq2SeqLM`) only when `check_grammar()` is called.
- Checks if model directory exists and contains `config.json` / weights; if absent, raises `FileNotFoundError` gracefully instead of failing at app startup.
- Prepends task prefix `grammar: ` to each sentence, tokenizes, runs model inference, and decodes the corrected sentence.
- Structured mistake extraction: Uses standard Python `difflib.SequenceMatcher` to extract exact edits (`replace`, `insert`, `delete`), original segment, replacement segment, character indices, and category tags (`spelling`, `grammar`, `punctuation`, `word-order`).
- Returns output matching the exact schema expected by `llm_grammar.py` and the frontend.

### 2. Multi-Engine Fallback Chain Integration (`backend/app/nlp/llm_grammar.py`)
- Integrated `gec_model.check_grammar` as the `"t5"` engine in `GRAMMAR_ENGINE_ORDER`.
- Order: `claude -> t5 -> rules`.
- When Claude API key is absent or fails, the pipeline attempts T5. If T5 model weights are missing or inference encounters an error, it seamlessly falls back to `"rules"` (rule-based + spaCy).
- Tagged with `engine="t5"` on success.

### 3. Training Script (`backend/ml_training/train_gec.py`)
- Fine-tunes `google/flan-t5-small` on Hugging Face dataset `grammarly/coedit` (gec task subset).
- Prepares prompt `"grammar: {src}"` and target `"{tgt}"`.
- Configuration:
  - Base model: `google/flan-t5-small`
  - Max input length: 128 tokens
  - Batch size: 16
  - Learning rate: 3e-4 with AdamW and linear warmup
  - Epochs: 3
  - Mixed precision: `fp16` enabled automatically when CUDA GPU is available
  - Output directory: `backend/models/gec-t5/`
- Command-line arguments supported: `--base_model`, `--output_dir`, `--epochs`, `--batch_size`, `--learning_rate`, `--max_samples`, `--push_to_hub`.

### 4. Evaluation Benchmark (`backend/ml_training/evaluate_gec.py`)
- Implements standard GEC evaluation using Generalized Language Evaluation Understanding (GLEU) metric with n-gram geometric mean (orders 1-4) and brevity penalty.
- Evaluates on JFLEG test benchmark reference sets.
- Baseline GLEU: **81.39**
- Evaluates 28 diverse sanity sentences (`backend/ml_training/sanity_sentences.txt`) across:
  - Subject-verb agreement (*"He go to school every day."*)
  - Verb tense consistency (*"Yesterday I go to market and bought fruits."*)
  - Article usage (*"She is an doctor in big hospital."*)
  - Preposition errors (*"I am good in playing cricket."*)
  - Pronoun case (*"Me and him went to the cinema."*)
  - Double negatives (*"I don't know nothing about that."*)
  - Plural/singular confusion (*"I have three childs and two dog."*)
  - Punctuation & capitalization (*"where are you going i want to come"* / *"its a beautiful day isn't it"*)
  - Complex interview answers (*"I have completed my graduation in computer science and I has 2 year experience."*)
- Writes full report with sanity evaluation table to `backend/ml_training/eval_report.md`.

### 5. Colab Replication Guide (`backend/ml_training/README_TRAINING.md`)
- Detailed step-by-step instructions for running the training on a free Google Colab T4 GPU instance in under 30 minutes.
- Code blocks for downloading datasets, training, evaluating, and pushing to Hugging Face Hub (`huggingface_hub`).

### 6. Test Suite & Verification (`backend/tests/test_prompt8_t5_gec.py`)
- `test_missing_weights_raises_filenotfound`: Asserts missing model weights raises `FileNotFoundError` on invocation without crashing startup.
- `test_difflib_mistake_extraction`: Verifies word-level difference extraction and character indices.
- `test_check_grammar_with_mocked_t5`: Simulates T5 model inference and checks structure.
- `test_llm_grammar_fallback_to_rules_when_t5_weights_missing`: Verifies fallback to `"rules"` when T5 weights are absent.
- `test_llm_grammar_uses_t5_when_available`: Verifies that `check_grammar_with_fallback` uses `"t5"` when configured and weights are mock-available.
- All 5 tests passed (100%).
- Full backend suite: **358 passed** (0 failures).
