# Fine-Tuning Flan-T5 for Grammar Error Correction (GEC)

This guide provides exact, step-by-step instructions for fine-tuning `google/flan-t5-small` on Google Colab using a **free T4 GPU** and integrating the resulting weights into AI-COMMUNICATION-COACH.

---

## 1. Setup in Google Colab (Free T4 GPU)

1. Open [Google Colab](https://colab.research.google.com).
2. Go to **Runtime** > **Change runtime type** > Select **T4 GPU** > Click **Save**.
3. Verify GPU access:
   ```python
   !nvidia-smi
   ```

---

## 2. Install Dependencies

In the first Colab cell:
```bash
!pip install -q transformers datasets evaluate accelerate torch huggingface_hub
```

---

## 3. Clone Repository or Upload Training Script

```bash
# Clone the repository
!git clone https://github.com/AnuKumari-2712/AI-COMMUNICATION-COACH.git
%cd AI-COMMUNICATION-COACH/backend
```

---

## 4. Run Training (`train_gec.py`)

Fine-tune `google/flan-t5-small` on the `grammarly/coedit` dataset (filtered to GEC rows only):
```bash
!python ml_training/train_gec.py \
    --model_name "google/flan-t5-small" \
    --output_dir "models/gec-t5" \
    --epochs 3 \
    --batch_size 16 \
    --learning_rate 3e-4 \
    --max_length 128 \
    --seed 42
```

- **Training Duration:** ~25 to 35 minutes on T4 GPU for 3 epochs.
- **Checkpoint Location:** `models/gec-t5/`

---

## 5. Run Evaluation (`evaluate_gec.py`)

Evaluate GLEU score on the JFLEG test benchmark and test the 28 sanity sentences:
```bash
!python ml_training/evaluate_gec.py \
    --model_path "models/gec-t5" \
    --sanity_file "ml_training/sanity_sentences.txt" \
    --report_file "ml_training/eval_report.md"
```

This generates `eval_report.md` with:
- GLEU Score (target: $\ge 50.0$)
- % Sentences Changed (target: 60% - 90%)
- Full table of original vs corrected sentences across all 28 sanity sentences.

---

## 6. Upload Weights to Hugging Face Hub (Recommended)

Upload the trained model to the Hugging Face Hub so it can be downloaded anywhere without committing binary weights to git:

```python
from huggingface_hub import login
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

# 1. Login with your Hugging Face write token
login()

# 2. Load trained model from local checkpoint
model_path = "models/gec-t5"
model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

# 3. Push to your Hugging Face Hub repository
repo_name = "your-username/flan-t5-gec"
model.push_to_hub(repo_name)
tokenizer.push_to_hub(repo_name)
print(f"Model published successfully to https://huggingface.co/{repo_name}")
```

---

## 7. Connecting to AI-COMMUNICATION-COACH Backend

In your backend `.env`:
```bash
# Option A: Local weights folder
GEC_MODEL_PATH="models/gec-t5"

# Option B: Direct Hugging Face Hub repo
GEC_MODEL_PATH="your-username/flan-t5-gec"

# Set engine order to prioritize T5
GRAMMAR_ENGINE_ORDER="t5,claude,rules"
```

The backend lazy-loads the model via `backend/app/nlp/gec_model.py`. If the weights are absent, it automatically and safely falls back to the rules engine without crashing at startup.
