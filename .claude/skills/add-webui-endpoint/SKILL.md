---
name: add-webui-endpoint
description: Guide for adding a new FastAPI endpoint to the Web UI backend following the layered architecture (route → service → repository → model). Use this whenever creating new API routes, adding backend features, or when the user says 'add endpoint', 'new API', 'backend route', or 'add to server'.
---

# Add a Web UI Backend Endpoint

Complete guide for adding a new FastAPI endpoint to the Unreal Companion Studio backend.

## Architecture

```
Route (api/{name}.py)
  → Service (services/{name}_service.py)
    → Repository (repositories/{name}_repo.py)
      → Model (models/{name}.py)
```

- **Route**: HTTP validation, calls service, formats response
- **Service**: business logic, orchestration, no HTTP concerns
- **Repository**: data access only (SQLAlchemy queries)
- **Model**: SQLAlchemy table definition

## Steps

### 1. Model (if new DB table needed)

File: `web-ui/server/models/{name}.py`

```python
# web-ui/server/models/task.py
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from core.database import Base
import uuid

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    status = Column(String, default="pending")
    body = Column(Text, nullable=True)
    project_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
```

Then register the model in `web-ui/server/core/database.py` (import it so SQLAlchemy sees it):

```python
from models import task  # noqa: F401 — registers the table
```

### 2. Repository (if DB access needed)

File: `web-ui/server/repositories/{name}_repo.py`

```python
# web-ui/server/repositories/task_repo.py
from sqlalchemy.orm import Session
from models.task import Task

class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, project_id: str | None = None) -> list[Task]:
        q = self.db.query(Task)
        if project_id:
            q = q.filter(Task.project_id == project_id)
        return q.order_by(Task.created_at.desc()).all()

    def get_by_id(self, id: str) -> Task | None:
        return self.db.query(Task).filter(Task.id == id).first()

    def create(self, title: str, **kwargs) -> Task:
        task = Task(title=title, **kwargs)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, id: str, **kwargs) -> Task | None:
        task = self.get_by_id(id)
        if not task:
            return None
        for k, v in kwargs.items():
            if hasattr(task, k):
                setattr(task, k, v)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, id: str) -> bool:
        result = self.db.query(Task).filter(Task.id == id).delete()
        self.db.commit()
        return result > 0
```

### 3. Service (business logic)

File: `web-ui/server/services/{name}_service.py`

```python
# web-ui/server/services/task_service.py
from sqlalchemy.orm import Session
from repositories.task_repo import TaskRepository

class TaskService:
    def __init__(self, db: Session):
        self.repo = TaskRepository(db)

    def list_tasks(self, project_id: str | None = None):
        return self.repo.get_all(project_id=project_id)

    def get_task(self, task_id: str):
        task = self.repo.get_by_id(task_id)
        if not task:
            return None
        return task

    def create_task(self, title: str, project_id: str | None = None):
        if not title.strip():
            raise ValueError("Title cannot be empty")
        return self.repo.create(title=title.strip(), project_id=project_id)

    def delete_task(self, task_id: str) -> bool:
        return self.repo.delete(task_id)
```

### 4. Route

File: `web-ui/server/api/{name}.py`

```python
# web-ui/server/api/tasks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from core.database import get_db
from services.task_service import TaskService

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    project_id: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    status: str
    project_id: Optional[str] = None

    model_config = {"from_attributes": True}

@router.get("")
def list_tasks(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    service = TaskService(db)
    return service.list_tasks(project_id=project_id)

@router.post("", response_model=TaskResponse, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    service = TaskService(db)
    try:
        return service.create_task(title=data.title, project_id=data.project_id)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db)):
    service = TaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    service = TaskService(db)
    if not service.delete_task(task_id):
        raise HTTPException(404, "Task not found")
    return {"ok": True}
```

### 5. Register router in main.py (CRITICAL)

File: `web-ui/server/main.py`

```python
from api.tasks import router as tasks_router
app.include_router(tasks_router)
```

**This is the most common mistake: forgetting to register = 404 on all routes.**

## Final checklist

- [ ] Model defined in `models/{name}.py` with SQLAlchemy columns
- [ ] Model imported in `core/database.py` so the table is created
- [ ] Repository in `repositories/{name}_repo.py` — no business logic
- [ ] Service in `services/{name}_service.py` — no HTTP/SQLAlchemy leaking out
- [ ] Route in `api/{name}.py` with Pydantic models for input/output
- [ ] Router registered in `main.py` with `app.include_router(...)`
- [ ] Proper HTTP status codes (201 for create, 404 for not found, 400 for bad input)
- [ ] `response_model` set on routes that return structured data
- [ ] `model_config = {"from_attributes": True}` on response Pydantic models (ORM mode)

## Useful commands

```bash
# Start backend with auto-reload
cd web-ui && npm run dev:api

# Run tests
cd web-ui/server && uv run pytest tests/ -v

# Check the endpoint is registered
curl http://localhost:3179/api/tasks

# View API docs
open http://localhost:3179/docs
```
