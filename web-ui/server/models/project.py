from sqlalchemy import Column, String, Integer, JSON, DateTime
from sqlalchemy.sql import func
from core.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    unreal_host = Column(String, default="127.0.0.1")
    unreal_port = Column(Integer, default=55557)
    default_agent = Column(String, default="game-dev")
    settings = Column(JSON, default={})
    created_at = Column(DateTime, server_default=func.now())
    last_opened = Column(DateTime)
    # Companion integration
    uproject_path = Column(String, nullable=True)  # Path to .uproject file
    companion_path = Column(String, nullable=True)  # Path to .unreal-companion folder
