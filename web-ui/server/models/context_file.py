from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from core.database import Base

class ContextFile(Base):
    __tablename__ = "context_files"
    
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    path = Column(String, nullable=False)
    type = Column(String, nullable=False)  # markdown, text, image, pdf
    size_bytes = Column(Integer)
    include_in_prompt = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
