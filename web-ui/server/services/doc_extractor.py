"""Document text extraction — PDF, DOCX, MD, images."""
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
PDF_EXTENSIONS = {".pdf"}
DOCX_EXTENSIONS = {".docx", ".doc"}
MD_EXTENSIONS = {".md", ".markdown", ".txt"}


def extract_text(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    if ext in MD_EXTENSIONS:
        return file_path.read_text(encoding="utf-8")
    if ext in PDF_EXTENSIONS:
        return _extract_pdf(file_path)
    if ext in DOCX_EXTENSIONS:
        return _extract_docx(file_path)
    if ext in IMAGE_EXTENSIONS:
        return ""
    logger.warning(f"Unsupported file type for text extraction: {ext}")
    return ""


def extract_base64_image(file_path: Path) -> str:
    return base64.b64encode(file_path.read_bytes()).decode("utf-8")


def get_cached_text(file_path: Path) -> str:
    cache_path = file_path.parent / f"{file_path.name}.content.txt"
    if cache_path.exists() and cache_path.stat().st_mtime >= file_path.stat().st_mtime:
        return cache_path.read_text(encoding="utf-8")
    text = extract_text(file_path)
    if text:
        cache_path.write_text(text, encoding="utf-8")
    return text


def get_media_type(file_path: Path) -> str:
    types = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
             ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml"}
    return types.get(file_path.suffix.lower(), "application/octet-stream")


def _extract_pdf(file_path: Path) -> str:
    try:
        import fitz
        doc = fitz.open(str(file_path))
        pages = [page.get_text() for page in doc if page.get_text().strip()]
        doc.close()
        return "\n\n---\n\n".join(pages)
    except Exception as e:
        logger.error(f"PDF extraction failed for {file_path}: {e}")
        return ""


def _extract_docx(file_path: Path) -> str:
    try:
        import docx
        doc = docx.Document(str(file_path))
        paragraphs = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            if para.style and para.style.name.startswith("Heading"):
                level = para.style.name.replace("Heading ", "").strip()
                try:
                    hashes = "#" * int(level)
                except ValueError:
                    hashes = "##"
                paragraphs.append(f"{hashes} {text}")
            else:
                paragraphs.append(text)
        return "\n\n".join(paragraphs)
    except Exception as e:
        logger.error(f"DOCX extraction failed for {file_path}: {e}")
        return ""
