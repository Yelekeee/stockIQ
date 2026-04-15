from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://stockiq:stockiq123@localhost:5432/stockiq_db"
    SECRET_KEY: str = "stockiq-super-secret-jwt-key-2024-diploma-thesis"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"


settings = Settings()
