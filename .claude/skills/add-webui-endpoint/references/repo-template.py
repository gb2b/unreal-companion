# Template: web-ui/server/repositories/{name}_repo.py
# Replace {Name}, {name} with actual values

from sqlalchemy.orm import Session
from models.{name} import {Name}


class {Name}Repository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, project_id: str | None = None) -> list[{Name}]:
        q = self.db.query({Name})
        if project_id:
            q = q.filter({Name}.project_id == project_id)
        return q.order_by({Name}.created_at.desc()).all()

    def get_by_id(self, id: str) -> {Name} | None:
        return self.db.query({Name}).filter({Name}.id == id).first()

    def create(self, title: str, **kwargs) -> {Name}:
        item = {Name}(title=title, **kwargs)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update(self, id: str, **kwargs) -> {Name} | None:
        item = self.get_by_id(id)
        if not item:
            return None
        for k, v in kwargs.items():
            if hasattr(item, k):
                setattr(item, k, v)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, id: str) -> bool:
        result = self.db.query({Name}).filter({Name}.id == id).delete()
        self.db.commit()
        return result > 0
