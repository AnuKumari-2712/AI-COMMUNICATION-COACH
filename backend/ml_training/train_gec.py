"""
Fine-tuning Pipeline for T5 Grammar Error Correction (GEC).
Implements Prompt 8:
- Model: google/flan-t5-small (env MODEL_NAME)
- Dataset: Hugging Face 'grammarly/coedit' (gec rows only)
- Input format: 'grammar: <incorrect>' -> Target: '<corrected>'
- Preserves case and punctuation
- Hyperparameters: 3 epochs, lr 3e-4, batch 16, max_length 128, fp16 if CUDA, seed 42
- Output: backend/models/gec-t5/
- NOTE: JFLEG is strictly reserved for evaluation, never for training.
"""
import argparse
import logging
import os
import sys

logger = logging.getLogger(__name__)


def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune Flan-T5 on Grammarly CoEdit GEC dataset")
    parser.add_argument(
        "--model_name",
        type=str,
        default=os.getenv("MODEL_NAME", "google/flan-t5-small"),
        help="Pretrained Hugging Face model identifier (default: google/flan-t5-small)",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "gec-t5"),
        help="Directory to save the fine-tuned model and tokenizer (default: backend/models/gec-t5)",
    )
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs (default: 3)")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size per device (default: 16)")
    parser.add_argument("--learning_rate", type=float, default=3e-4, help="Learning rate (default: 3e-4)")
    parser.add_argument("--max_length", type=int, default=128, help="Max sequence length (default: 128)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility (default: 42)")
    parser.add_argument(
        "--max_train_samples",
        type=int,
        default=None,
        help="Optional limit on number of training samples for quick testing or small runs",
    )
    return parser.parse_args()


def load_coedit_gec_data(max_samples: int | None = None):
    """Loads and filters the Hugging Face grammarly/coedit dataset for GEC rows only."""
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise RuntimeError("The 'datasets' package is required. Run `pip install datasets`.") from exc

    logger.info("Loading 'grammarly/coedit' dataset from Hugging Face...")
    ds = load_dataset("grammarly/coedit", split="train")

    # Filter for GEC tasks (task == "gec" or src starts with "Fix the grammar:")
    def is_gec(example):
        task = example.get("task", "")
        src = example.get("src", "")
        return task == "gec" or "grammar" in task.lower() or src.lower().startswith("fix the grammar")

    gec_ds = ds.filter(is_gec)
    logger.info("Filtered %d GEC samples from CoEdit dataset.", len(gec_ds))

    if max_samples and max_samples < len(gec_ds):
        gec_ds = gec_ds.shuffle(seed=42).select(range(max_samples))
        logger.info("Sampled %d samples for training.", max_samples)

    return gec_ds


def format_gec_pair(src: str, tgt: str) -> tuple[str, str]:
    """Formats source with 'grammar: <text>' prefix and preserves casing/punctuation."""
    # Strip any existing prefix like "Fix the grammar: "
    cleaned_src = src
    for prefix in ("Fix the grammar:", "fix the grammar:", "Fix grammar:", "grammar:"):
        if cleaned_src.startswith(prefix):
            cleaned_src = cleaned_src[len(prefix):].strip()
            break

    input_text = f"grammar: {cleaned_src.strip()}"
    target_text = tgt.strip()
    return input_text, target_text


def train(args):
    try:
        import torch
        from transformers import (
            AutoModelForSeq2SeqLM,
            AutoTokenizer,
            DataCollatorForSeq2Seq,
            Seq2SeqTrainer,
            Seq2SeqTrainingArguments,
            set_seed,
        )
    except ImportError as exc:
        raise RuntimeError(
            "Transformers and PyTorch are required. Run `pip install transformers torch accelerate`."
        ) from exc

    set_seed(args.seed)
    os.makedirs(args.output_dir, exist_ok=True)

    logger.info("Initializing tokenizer and model for '%s'...", args.model_name)
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model_name)

    raw_dataset = load_coedit_gec_data(max_samples=args.max_train_samples)

    def preprocess_function(examples):
        inputs = []
        targets = []
        for src, tgt in zip(examples["src"], examples["tgt"]):
            inp, out = format_gec_pair(src, tgt)
            inputs.append(inp)
            targets.append(out)

        model_inputs = tokenizer(inputs, max_length=args.max_length, truncation=True)
        labels = tokenizer(text_target=targets, max_length=args.max_length, truncation=True)
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    logger.info("Tokenizing GEC training dataset...")
    tokenized_dataset = raw_dataset.map(
        preprocess_function,
        batched=True,
        remove_columns=raw_dataset.column_names,
    )

    use_cuda = torch.cuda.is_available()
    training_args = Seq2SeqTrainingArguments(
        output_dir=os.path.join(args.output_dir, "checkpoints"),
        num_train_epochs=args.epochs,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        weight_decay=0.01,
        save_total_limit=1,
        save_strategy="epoch",
        logging_steps=50,
        fp16=use_cuda,
        seed=args.seed,
        predict_with_generate=True,
        report_to="none",
    )

    data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    logger.info("Starting fine-tuning for %d epochs...", args.epochs)
    trainer.train()

    logger.info("Saving fine-tuned model and tokenizer to '%s'...", args.output_dir)
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    logger.info("Training complete! Model saved to '%s'.", args.output_dir)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    args = parse_args()
    train(args)
