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
        self.docs_root = Path(project_path) / ".unreal-companion" / "documents"
        self.refs_root = Path(project_path) / ".unreal-companion" / "references"

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
        """Map doc_id to actual file path. Handles case/space variations from LLM."""
        # Normalize: "First Brief" → "first-brief", "First_Brief" → "first-brief"
        normalized = doc_id.lower().replace(" ", "-").replace("_", "-")

        # Try documents/{doc_id}/document.md (new structure)
        for did in [doc_id, normalized]:
            doc_md = self.docs_root / did / "document.md"
            if doc_md.exists():
                return doc_md

        # Try references/{stem}/ — find the original file inside
        for did in [doc_id, normalized]:
            # Strip "references/" prefix if present
            ref_stem = did
            if ref_stem.startswith("references/"):
                ref_stem = ref_stem[len("references/"):]
            ref_dir = self.refs_root / ref_stem
            if ref_dir.exists() and ref_dir.is_dir():
                for f in ref_dir.iterdir():
                    if f.is_file() and f.name != "meta.json" and not f.name.endswith(".content.txt"):
                        return f

        # Scan by stem in documents/ and references/ (case-insensitive)
        stem = Path(normalized).stem
        if normalized.startswith("references/"):
            stem = normalized[len("references/"):]

        SKIP_NAMES = {"meta.json", "document.md"}
        SKIP_SUFFIXES = (".content.txt",)

        # Scan documents/*/document.md
        if self.docs_root.exists():
            for candidate in self.docs_root.glob("*/document.md"):
                dir_stem = candidate.parent.name.lower().replace(" ", "-").replace("_", "-")
                if dir_stem == stem:
                    return candidate

        # Scan references/*/
        if self.refs_root.exists():
            for ref_dir in self.refs_root.iterdir():
                if not ref_dir.is_dir():
                    continue
                dir_stem = ref_dir.name.lower().replace(" ", "-").replace("_", "-")
                if dir_stem == stem:
                    for f in ref_dir.iterdir():
                        if f.is_file() and f.name not in SKIP_NAMES and not any(f.name.endswith(s) for s in SKIP_SUFFIXES):
                            return f

        logger.warning(f"_resolve_file: could not find '{doc_id}' in {self.docs_root} or {self.refs_root}")
        return None

    def _meta_path(self, doc_id: str) -> Path:
        """Return meta.json path for a doc_id.

        - documents/{doc_id}/meta.json  for workflow docs
        - references/{stem}/meta.json   for reference files
        """
        normalized = doc_id.lower().replace(" ", "-").replace("_", "-")
        is_ref = normalized.startswith("references/")

        if is_ref:
            stem = normalized[len("references/"):]
            return self.refs_root / stem / "meta.json"

        # Workflow doc
        return self.docs_root / doc_id / "meta.json"

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
        skip_names = {"meta.json", "document.md"}

        def should_skip(p: Path) -> bool:
            if p.suffix.lower() in IMAGE_EXTENSIONS:
                return True
            if p.name.endswith(".content.txt"):
                return True
            if p.suffix.lower() == ".json":
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

        # Scan documents/*/document.md
        if self.docs_root.exists():
            for fp in self.docs_root.glob("*/document.md"):
                if not should_skip(fp):
                    doc_id = fp.parent.name
                    result.append((fp, doc_id))

        # Scan references/*/  (original files, not meta.json or content.txt)
        if self.refs_root.exists():
            for ref_dir in self.refs_root.iterdir():
                if not ref_dir.is_dir():
                    continue
                for fp in ref_dir.iterdir():
                    if fp.is_file() and fp.name not in skip_names and not should_skip(fp):
                        doc_id = f"references/{ref_dir.name}"
                        result.append((fp, doc_id))

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
