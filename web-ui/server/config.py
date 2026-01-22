from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # Application
    app_name: str = "Unreal Companion"
    debug: bool = False
    
    # Database
    database_url: str = "sqlite:///./data/unreal-companion.db"
    
    # Server
    host: str = "127.0.0.1"
    port: int = 3179  # Unique port for Unreal Companion
    cors_origins: list[str] = ["http://localhost:5173", "http://unreal-companion.local:3179"]
    
    # MCP Connection
    mcp_host: str = "127.0.0.1"
    mcp_port: int = 55557
    
    # External APIs (user provides)
    anthropic_api_key: str = ""
    openai_api_key: str = ""      # For Whisper
    meshy_api_key: str = ""       # For 3D generation
    
    # Security
    secret_key: str = "change-me-in-production"
    
    # Paths
    @property
    def data_dir(self) -> Path:
        path = Path(__file__).parent / "data"
        path.mkdir(exist_ok=True)
        return path
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
