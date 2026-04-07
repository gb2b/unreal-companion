"""Document tools — scan, read_summary, read_section, grep."""
import json
import logging
import re
from pathlib import Path

from services.doc_extractor import (
    get_cached_text,
    extract_base64_image,
    get_media_type,
    IMAGE_EXTENSIONS,
)

logger = logging.getLogger(__name__)


class DocTools:
    def __init__(self, project_path: str):
        self.docs_root = Path(project_path) / ".unreal-companion" / "docs"

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    async def scan(self, doc_id: str) -> dict:
        """Full read + LLM indexing. Returns the index dict."""
        file_path = self._resolve_file(doc_id)
        if file_path is None:
            return {"error": f"doc not found: {doc_id}"}

        is_image = file_path.suffix.lower() in IMAGE_EXTENSIONS

        if is_image:
            image_b64 = extract_base64_image(file_path)
            media_type = get_media_type(file_path)
            prompt = (
                "Analyze this image document and return ONLY valid JSON "
                "(no markdown, no code fences) with this shape:\n"
                '{"summary": "...", "sections": [{"title": "...", "key_points": [...]}], "keywords": [...]}'
            )
            result = await self._llm_call(prompt, image_b64=image_b64, media_type=media_type)
        else:
            text = get_cached_text(file_path)
            prompt = (
                "Analyze the following document and return ONLY valid JSON "
                "(no markdown, no code fences) with this shape:\n"
                '{"summary": "...", "sections": [{"title": "...", "key_points": [...]}], "keywords": [...]}\n\n'
                f"DOCUMENT:\n{text}"
            )
            result = await self._llm_call(prompt)

        raw = result.get("text", "")
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw.strip())

        try:
            index = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error(f"LLM returned invalid JSON for {doc_id}: {e}\nRaw: {raw[:200]}")
            return {"error": "llm_parse_error", "raw": raw}

        # Persist to meta
        meta_path = self._meta_path(doc_id)
        meta = self._load_meta(meta_path)
        meta["indexed"] = True
        meta["index"] = index
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

        return index

    def read_summary(self, doc_id: str) -> dict:
        """Return cached index from .meta.json, or {error: 'not_indexed'}."""
        meta_path = self._meta_path(doc_id)
        meta = self._load_meta(meta_path)
        if not meta.get("indexed"):
            return {"error": "not_indexed"}
        return meta.get("index", {"error": "not_indexed"})

    def read_section(self, doc_id: str, section: str) -> dict:
        """Extract a section from the document by fuzzy header match."""
        file_path = self._resolve_file(doc_id)
        if file_path is None:
            return {"error": f"doc not found: {doc_id}"}

        if file_path.suffix.lower() in IMAGE_EXTENSIONS:
            return {"error": "images have no text sections"}

        text = get_cached_text(file_path)
        sections = self._parse_sections(text)

        # Exact match first (case-insensitive)
        query = section.lower().strip()
        for title, content in sections.items():
            if title.lower().strip() == query:
                return {"section": title, "content": content}

        # Fuzzy: contains
        for title, content in sections.items():
            if query in title.lower() or title.lower() in query:
                return {"section": title, "content": content}

        return {"error": f"section not found: {section}"}

    def grep(self, query: str, doc_ids: list[str] | None = None) -> list[dict]:
        """Search text content across docs. Returns list of match dicts."""
        files = self._list_doc_files(doc_ids)
        results = []
        pattern = re.compile(re.escape(query), re.IGNORECASE)

        for file_path, did in files:
            text = get_cached_text(file_path)
            lines = text.splitlines()
            current_section = ""
            for lineno, line in enumerate(lines, start=1):
                # Track current section header
                header = re.match(r"^#{1,6}\s+(.*)", line)
                if header:
                    current_section = header.group(1).strip()
                if pattern.search(line):
                    results.append({
                        "doc_id": did,
                        "section": current_section,
                        "excerpt": line.strip(),
                        "line": lineno,
                    })

        return results

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _resolve_file(self, doc_id: str) -> Path | None:
        """Map doc_id to actual file path."""
        # Direct .md
        md_path = self.docs_root / f"{doc_id}.md"
        if md_path.exists():
            return md_path

        # Try exact path (already has extension)
        direct = self.docs_root / doc_id
        if direct.exists() and direct.is_file():
            return direct

        # Scan by stem in references/ and subdirs
        stem = Path(doc_id).stem
        for candidate in self.docs_root.rglob("*"):
            if candidate.is_file() and candidate.stem == stem and not candidate.name.endswith(".meta.json") and not candidate.name.endswith(".content.txt"):
                return candidate

        return None

    def _meta_path(self, doc_id: str) -> Path:
        """Return .meta.json path for a doc_id."""
        file_path = self._resolve_file(doc_id)
        if file_path is not None:
            return file_path.parent / f"{file_path.name}.meta.json"
        # Fallback: use doc_id as-is
        base = self.docs_root / doc_id
        return base.parent / f"{base.name}.meta.json"

    def _load_meta(self, path: Path) -> dict:
        """Load JSON from meta file, or return empty dict."""
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                return {}
        return {}

    def _parse_sections(self, text: str) -> dict[str, str]:
        """Split markdown by ## headers into {title: content} dict."""
        result: dict[str, str] = {}
        current_title: str | None = None
        current_lines: list[str] = []

        for line in text.splitlines():
            header = re.match(r"^##\s+(.*)", line)
            if header:
                if current_title is not None:
                    result[current_title] = "\n".join(current_lines).strip()
                current_title = header.group(1).strip()
                current_lines = []
            else:
                if current_title is not None:
                    current_lines.append(line)

        if current_title is not None:
            result[current_title] = "\n".join(current_lines).strip()

        return result

    def _list_doc_files(self, doc_ids: list[str] | None) -> list[tuple[Path, str]]:
        """List searchable files. Returns list of (path, doc_id) tuples."""
        skip_suffixes = {".json", ".txt"}
        skip_names = {".meta.json", ".content.txt"}

        def should_skip(p: Path) -> bool:
            if p.suffix.lower() in IMAGE_EXTENSIONS:
                return True
            if p.name.endswith(".meta.json") or p.name.endswith(".content.txt"):
                return True
            if p.suffix.lower() in skip_suffixes:
                return True
            return False

        if doc_ids is not None:
            result = []
            for did in doc_ids:
                fp = self._resolve_file(did)
                if fp and not should_skip(fp):
                    result.append((fp, did))
            return result

        result = []
        for fp in self.docs_root.rglob("*"):
            if fp.is_file() and not should_skip(fp):
                # Compute doc_id as relative path without extension
                rel = fp.relative_to(self.docs_root)
                did = str(rel.with_suffix(""))
                result.append((fp, did))
        return result

    async def _llm_call(self, prompt: str, image_b64: str = "", media_type: str = "") -> dict:
        """Call llm_service.chat(). Supports optional image."""
        from services.llm import llm_service

        if image_b64:
            content = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_b64,
                    },
                },
                {"type": "text", "text": prompt},
            ]
            messages = [{"role": "user", "content": content}]
        else:
            messages = [{"role": "user", "content": prompt}]

        return await llm_service.chat(messages=messages, max_tokens=2048)
