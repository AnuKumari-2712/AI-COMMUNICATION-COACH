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
