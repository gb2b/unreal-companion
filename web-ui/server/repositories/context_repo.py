from pathlib import Path
from sqlalchemy.orm import Session
from models.context_file import ContextFile
from config import settings
import uuid

class ContextRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def _get_project_context_path(self, project_slug: str) -> Path:
        path = settings.data_dir / "projects" / project_slug / "context"
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    def get_by_project(self, project_id: str) -> list[ContextFile]:
        return self.db.query(ContextFile)\
            .filter(ContextFile.project_id == project_id)\
            .order_by(ContextFile.created_at.desc())\
            .all()
    
    def get_active(self, project_id: str) -> list[ContextFile]:
        """Get files marked for prompt inclusion."""
        return self.db.query(ContextFile)\
            .filter(ContextFile.project_id == project_id)\
            .filter(ContextFile.include_in_prompt == True)\
            .all()
    
    def get_by_id(self, id: str) -> ContextFile | None:
        return self.db.query(ContextFile).filter(ContextFile.id == id).first()
    
    def save_file(self, project_id: str, project_slug: str, 
                  file_name: str, content: bytes, file_type: str) -> ContextFile:
        context_path = self._get_project_context_path(project_slug)
        file_path = context_path / file_name
        file_path.write_bytes(content)
        
        cf = ContextFile(
            id=str(uuid.uuid4()),
            project_id=project_id,
            name=file_name,
            path=str(file_path.relative_to(settings.data_dir)),
            type=file_type,
            size_bytes=len(content)
        )
        self.db.add(cf)
        self.db.commit()
        self.db.refresh(cf)
        return cf
    
    def delete(self, file_id: str) -> bool:
        cf = self.get_by_id(file_id)
        if cf:
            file_path = settings.data_dir / cf.path
            file_path.unlink(missing_ok=True)
            self.db.delete(cf)
            self.db.commit()
            return True
        return False
    
    def toggle_include(self, file_id: str, include: bool) -> bool:
        cf = self.get_by_id(file_id)
        if cf:
            cf.include_in_prompt = include
            self.db.commit()
            return True
        return False
