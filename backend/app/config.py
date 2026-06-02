from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./videonotes.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    HAI_WHISPER_URL: str = "http://119.45.200.37:8000"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1/chat/completions"

    class Config:
        env_file = ".env"


settings = Settings()
