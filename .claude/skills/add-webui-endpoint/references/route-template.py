# Template: web-ui/server/api/{name}.py
# Replace {Name}, {name} with actual values

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from core.database import get_db
from services.{name}_service import {Name}Service

router = APIRouter(prefix="/api/{name}s", tags=["{name}s"])


# ── Input models ─────────────────────────────────────────────────────────────

class {Name}Create(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    project_id: Optional[str] = None


class {Name}Update(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    status: Optional[str] = None


# ── Response models ───────────────────────────────────────────────────────────

class {Name}Response(BaseModel):
    id: str
    title: str
    status: str
    project_id: Optional[str] = None

    model_config = {"from_attributes": True}  # Pydantic v2 ORM mode


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def list_{name}s(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    service = {Name}Service(db)
    return service.list_{name}s(project_id=project_id)


@router.post("", response_model={Name}Response, status_code=201)
def create_{name}(data: {Name}Create, db: Session = Depends(get_db)):
    service = {Name}Service(db)
    try:
        return service.create_{name}(title=data.title, project_id=data.project_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{{{name}_id}}", response_model={Name}Response)
def get_{name}({name}_id: str, db: Session = Depends(get_db)):
    service = {Name}Service(db)
    item = service.get_{name}({name}_id)
    if not item:
        raise HTTPException(404, "{Name} not found")
    return item


@router.put("/{{{name}_id}}", response_model={Name}Response)
def update_{name}({name}_id: str, data: {Name}Update, db: Session = Depends(get_db)):
    service = {Name}Service(db)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    item = service.update_{name}({name}_id, **updates)
    if not item:
        raise HTTPException(404, "{Name} not found")
    return item


@router.delete("/{{{name}_id}}")
def delete_{name}({name}_id: str, db: Session = Depends(get_db)):
    service = {Name}Service(db)
    if not service.delete_{name}({name}_id):
        raise HTTPException(404, "{Name} not found")
    return {"ok": True}
