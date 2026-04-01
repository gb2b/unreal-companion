# Template: web-ui/server/services/{name}_service.py
# Replace {Name}, {name} with actual values

from sqlalchemy.orm import Session
from repositories.{name}_repo import {Name}Repository


class {Name}Service:
    def __init__(self, db: Session):
        self.repo = {Name}Repository(db)

    def list_{name}s(self, project_id: str | None = None):
        return self.repo.get_all(project_id=project_id)

    def get_{name}(self, {name}_id: str):
        return self.repo.get_by_id({name}_id)

    def create_{name}(self, title: str, project_id: str | None = None):
        if not title.strip():
            raise ValueError("Title cannot be empty")
        return self.repo.create(title=title.strip(), project_id=project_id)

    def update_{name}(self, {name}_id: str, **kwargs):
        return self.repo.update({name}_id, **kwargs)

    def delete_{name}(self, {name}_id: str) -> bool:
        return self.repo.delete({name}_id)
