from sqlalchemy.orm import Session
from models.project import Project
from datetime import datetime
import uuid

class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_all(self) -> list[Project]:
        return self.db.query(Project).order_by(Project.last_opened.desc().nullsfirst()).all()
    
    def get_by_id(self, id: str) -> Project | None:
        return self.db.query(Project).filter(Project.id == id).first()
    
    def get_by_slug(self, slug: str) -> Project | None:
        return self.db.query(Project).filter(Project.slug == slug).first()
    
    def create(self, name: str, slug: str, **kwargs) -> Project:
        project = Project(
            id=str(uuid.uuid4()), 
            name=name, 
            slug=slug,
            **kwargs
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project
    
    def update(self, id: str, **kwargs) -> Project | None:
        project = self.get_by_id(id)
        if not project:
            return None
        for k, v in kwargs.items():
            if hasattr(project, k):
                setattr(project, k, v)
        self.db.commit()
        self.db.refresh(project)
        return project
    
    def touch(self, id: str):
        """Update last_opened timestamp."""
        project = self.get_by_id(id)
        if project:
            project.last_opened = datetime.utcnow()
            self.db.commit()
    
    def delete(self, id: str) -> bool:
        result = self.db.query(Project).filter(Project.id == id).delete()
        self.db.commit()
        return result > 0
