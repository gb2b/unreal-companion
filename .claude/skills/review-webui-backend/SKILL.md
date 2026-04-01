---
name: review-webui-backend
description: Audit a Web UI backend endpoint for proper layered architecture, input validation, error handling, and consistency with frontend expectations. Use this when reviewing backend code, checking API quality, after modifying server files, or when the user mentions 'review API', 'check endpoint', or 'backend audit'.
---

# Review a Web UI Backend Endpoint

Complete audit of a FastAPI endpoint in the Unreal Companion Studio backend.

## Usage

Provide the route file or endpoint name to audit (e.g. `tasks` or `api/tasks.py`).

## Audit Checklist

### 1. Architecture — layered separation

- [ ] No database queries directly in the route (use service + repo)
- [ ] No business logic in the route (validation beyond input format belongs in service)
- [ ] No HTTP concepts in the service (`HTTPException`, `Request`, `Response`)
- [ ] Repository only does data access — no business logic, no validation
- [ ] Service raises `ValueError` / `KeyError` for expected errors; route catches and converts to `HTTPException`
- [ ] Router registered in `server/main.py` via `app.include_router(...)`

### 2. Input validation

- [ ] Request bodies use Pydantic models (not raw `dict` params)
- [ ] Fields have constraints where appropriate (`min_length`, `max_length`, `ge`, `le`, `pattern`)
- [ ] `@field_validator` used for cross-field or custom validation (see `projects.py` for examples)
- [ ] Path parameters that are IDs are `str` (UUIDs stored as strings in this codebase)
- [ ] Query parameters have types and defaults declared explicitly

### 3. Error handling

- [ ] `404` returned when a resource is not found (not 200 with `null`)
- [ ] `400` returned for invalid input / business rule violations
- [ ] `201` used for successful POST that creates a resource
- [ ] Error message is a plain string in `detail` field: `raise HTTPException(404, "Task not found")`
- [ ] No stack traces or internal paths leaked in error responses
- [ ] Unexpected exceptions caught at service level with a fallback `HTTPException(500, ...)`

### 4. Response consistency

- [ ] `response_model` declared on routes that return structured data
- [ ] Response Pydantic model has `model_config = {"from_attributes": True}` (ORM mode)
- [ ] Field names match what the frontend store/service expects (check `src/stores/` and `src/services/`)
- [ ] Dates are ISO 8601 strings (FastAPI serializes `datetime` automatically)
- [ ] Delete endpoints return `{"ok": True}` (consistent with existing routes)
- [ ] List endpoints return arrays directly or `{"items": [...]}` — be consistent with existing routes

### 5. Database

- [ ] `db: Session = Depends(get_db)` used for dependency injection — never create `Session()` manually
- [ ] No raw SQL strings (use SQLAlchemy ORM queries)
- [ ] `db.commit()` called after writes; `db.refresh()` called to get updated data back
- [ ] No N+1 queries (use `.joinedload()` or batch queries for related data)
- [ ] `db.query(Model).filter(...).delete()` used for bulk deletes (not a Python loop)

### 6. Security

- [ ] CORS already handled globally in `main.py` — no per-route CORS headers needed
- [ ] No sensitive data (tokens, passwords, file paths) returned in responses unnecessarily
- [ ] User-provided paths sanitized if used in filesystem operations (see `projects.py` for example)
- [ ] No dynamic code execution on user input
- [ ] File upload endpoints (if any) validate MIME type and file size

## Common issues in this codebase

- Forgetting to register the router in `main.py` → all routes return 404
- Using `Optional[T]` instead of `T | None` (both work in Python 3.10+ but codebase uses both)
- Missing `model_config = {"from_attributes": True}` on response models → Pydantic validation error
- Static routes (e.g. `/discover`) placed after dynamic routes (e.g. `/{id}`) → caught by wildcard
- `db.commit()` missing after update → changes not persisted

## Report format

Produce a report with:
- **Score**: X/6 categories OK
- **Issues**: list with severity (CRITICAL, WARNING, INFO)
- **Fixes**: prioritized list of changes

## Useful commands

```bash
# Start backend with auto-reload
cd web-ui && npm run dev:api

# Run tests
cd web-ui/server && uv run pytest tests/ -v

# Check a specific test file
cd web-ui/server && uv run pytest tests/test_projects.py -v

# Browse all endpoints
open http://localhost:3179/docs

# Check router is registered
grep -n "include_router" web-ui/server/main.py
```
