"""Tests for document text extraction service."""
import base64
import time
from pathlib import Path
import pytest
from services.doc_extractor import extract_text, extract_base64_image, get_cached_text

@pytest.fixture
def sample_md(tmp_path):
    f = tmp_path / "doc.md"
    f.write_text("# Title\n\nParagraph one.\n\n## Section\n\nParagraph two.\n")
    return f

@pytest.fixture
def sample_image(tmp_path):
    png_bytes = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    f = tmp_path / "img.png"
    f.write_bytes(png_bytes)
    return f

def test_extract_text_markdown(sample_md):
    text = extract_text(sample_md)
    assert "Title" in text
    assert "Paragraph one" in text
    assert "Section" in text

def test_extract_text_returns_empty_for_unknown(tmp_path):
    f = tmp_path / "data.xyz"
    f.write_text("binary stuff")
    text = extract_text(f)
    assert text == ""

def test_extract_base64_image(sample_image):
    b64 = extract_base64_image(sample_image)
    assert len(b64) > 10
    assert isinstance(b64, str)

def test_get_cached_text_creates_cache(sample_md):
    cache_path = sample_md.parent / "doc.md.content.txt"
    assert not cache_path.exists()
    text = get_cached_text(sample_md)
    assert "Title" in text
    assert cache_path.exists()
    text2 = get_cached_text(sample_md)
    assert text2 == text

def test_get_cached_text_invalidates_on_change(sample_md):
    get_cached_text(sample_md)
    time.sleep(0.1)
    sample_md.write_text("# Changed\n\nNew content.\n")
    text = get_cached_text(sample_md)
    assert "Changed" in text
