import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Core settings
    SECRET_KEY: str
    DATABASE_URL: str
    
    # Sentry DSN for error tracking
    SENTRY_DSN: Optional[str] = None


    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = ".env.prod"
        env_file_encoding = 'utf-8'
        extra = 'ignore' 

# Create a single, reusable instance of the settings
settings = Settings()
